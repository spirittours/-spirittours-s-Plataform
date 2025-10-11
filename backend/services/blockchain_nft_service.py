"""
Blockchain NFT Service for Digital Winner Tickets
Using Polygon (MATIC) for low-cost transactions
"""
from web3 import Web3
from eth_account import Account
from typing import Dict, Any, List, Optional
import json
import ipfshttpclient
from datetime import datetime
import hashlib
import qrcode
import io
import base64
from dataclasses import dataclass
from enum import Enum
import logging
from sqlalchemy.orm import Session
import asyncio

logger = logging.getLogger(__name__)

# Smart Contract ABI for NFT Tickets
NFT_CONTRACT_ABI = json.loads('''[
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "tokenURI", "type": "string"},
            {"name": "raffleId", "type": "uint256"},
            {"name": "prizeValue", "type": "uint256"}
        ],
        "name": "mintWinnerTicket",
        "outputs": [{"name": "tokenId", "type": "uint256"}],
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "getTicketMetadata",
        "outputs": [
            {"name": "winner", "type": "address"},
            {"name": "raffleId", "type": "uint256"},
            {"name": "prizeValue", "type": "uint256"},
            {"name": "mintedAt", "type": "uint256"},
            {"name": "claimed", "type": "bool"}
        ],
        "type": "function"
    },
    {
        "inputs": [{"name": "tokenId", "type": "uint256"}],
        "name": "claimPrize",
        "outputs": [],
        "type": "function"
    },
    {
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "tokenId", "type": "uint256"}
        ],
        "name": "transferFrom",
        "outputs": [],
        "type": "function"
    }
]''')

class NFTStatus(Enum):
    PENDING = "pending"
    MINTING = "minting"
    MINTED = "minted"
    TRANSFERRED = "transferred"
    CLAIMED = "claimed"
    BURNED = "burned"

@dataclass
class NFTTicket:
    token_id: Optional[int]
    winner_address: str
    raffle_id: int
    prize_name: str
    prize_value: float
    prize_description: str
    winner_name: str
    mint_date: datetime
    ipfs_hash: Optional[str]
    transaction_hash: Optional[str]
    status: NFTStatus
    metadata: Dict[str, Any]
    qr_code: Optional[str]

class BlockchainNFTService:
    """Service for creating and managing NFT winner tickets on blockchain"""
    
    def __init__(self, config: Dict[str, Any], db: Session):
        self.db = db
        self.config = config
        
        # Polygon (MATIC) Network Configuration
        self.w3 = Web3(Web3.HTTPProvider(config.get('polygon_rpc_url', 
            'https://polygon-rpc.com')))
        
        # Contract configuration
        self.contract_address = config.get('nft_contract_address')
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=NFT_CONTRACT_ABI
        )
        
        # Admin wallet
        self.admin_account = Account.from_key(config.get('admin_private_key'))
        
        # IPFS configuration for metadata storage
        self.ipfs = ipfshttpclient.connect(
            config.get('ipfs_url', '/ip4/127.0.0.1/tcp/5001')
        )
        
        # NFT metadata template
        self.metadata_template = self._load_metadata_template()
        
        logger.info("Blockchain NFT Service initialized on Polygon network")

    def _load_metadata_template(self) -> Dict:
        """Load NFT metadata template following OpenSea standard"""
        return {
            "name": "",
            "description": "",
            "image": "",
            "external_url": "https://spirittours.com/nft/",
            "attributes": [],
            "properties": {
                "raffle": {},
                "prize": {},
                "winner": {},
                "verification": {}
            }
        }

    async def create_winner_nft(self, winner_data: Dict[str, Any]) -> NFTTicket:
        """Create NFT ticket for raffle winner"""
        try:
            # Generate NFT metadata
            metadata = await self._generate_nft_metadata(winner_data)
            
            # Upload metadata to IPFS
            ipfs_hash = await self._upload_to_ipfs(metadata)
            
            # Create NFT ticket object
            nft_ticket = NFTTicket(
                token_id=None,  # Will be set after minting
                winner_address=winner_data.get('wallet_address', ''),
                raffle_id=winner_data['raffle_id'],
                prize_name=winner_data['prize_name'],
                prize_value=winner_data['prize_value'],
                prize_description=winner_data['prize_description'],
                winner_name=winner_data['winner_name'],
                mint_date=datetime.utcnow(),
                ipfs_hash=ipfs_hash,
                transaction_hash=None,
                status=NFTStatus.PENDING,
                metadata=metadata,
                qr_code=None
            )
            
            # Generate QR code for verification
            nft_ticket.qr_code = await self._generate_verification_qr(nft_ticket)
            
            # Mint NFT on blockchain if wallet address provided
            if winner_data.get('wallet_address'):
                nft_ticket = await self._mint_nft(nft_ticket)
            
            # Store in database
            await self._store_nft_record(nft_ticket)
            
            logger.info(f"Created NFT ticket for raffle {winner_data['raffle_id']}")
            
            return nft_ticket
            
        except Exception as e:
            logger.error(f"Error creating NFT: {str(e)}")
            raise

    async def _generate_nft_metadata(self, winner_data: Dict) -> Dict:
        """Generate comprehensive NFT metadata"""
        # Create visual NFT image
        image_url = await self._create_nft_image(winner_data)
        
        metadata = self.metadata_template.copy()
        metadata.update({
            "name": f"Spirit Tours Winner Ticket #{winner_data['raffle_id']}",
            "description": f"Official winner ticket for {winner_data['prize_name']}. "
                          f"This NFT certifies that {winner_data['winner_name']} "
                          f"won the raffle on {datetime.utcnow().strftime('%Y-%m-%d')}.",
            "image": image_url,
            "external_url": f"https://spirittours.com/nft/{winner_data['raffle_id']}",
            "attributes": [
                {"trait_type": "Prize Type", "value": winner_data.get('prize_type', 'Travel')},
                {"trait_type": "Prize Value", "value": winner_data['prize_value'], "display_type": "number"},
                {"trait_type": "Destination", "value": winner_data.get('destination', 'N/A')},
                {"trait_type": "Winner Tier", "value": winner_data.get('winner_tier', 'Gold')},
                {"trait_type": "Total Participants", "value": winner_data.get('total_participants', 0)},
                {"trait_type": "Win Date", "value": datetime.utcnow().isoformat(), "display_type": "date"},
                {"trait_type": "Rarity", "value": self._calculate_rarity(winner_data)},
                {"trait_type": "Season", "value": winner_data.get('season', '2024')}
            ],
            "properties": {
                "raffle": {
                    "id": winner_data['raffle_id'],
                    "name": winner_data['raffle_name'],
                    "start_date": winner_data.get('raffle_start_date'),
                    "end_date": winner_data.get('raffle_end_date'),
                    "total_entries": winner_data.get('total_entries', 0)
                },
                "prize": {
                    "name": winner_data['prize_name'],
                    "description": winner_data['prize_description'],
                    "value_usd": winner_data['prize_value'],
                    "category": winner_data.get('prize_category', 'Travel'),
                    "validity": winner_data.get('prize_validity', '1 year'),
                    "terms": winner_data.get('prize_terms', [])
                },
                "winner": {
                    "name": winner_data['winner_name'],
                    "id": winner_data['winner_id'],
                    "entry_number": winner_data.get('winning_entry_number'),
                    "points_used": winner_data.get('points_used', 0)
                },
                "verification": {
                    "hash": hashlib.sha256(
                        f"{winner_data['raffle_id']}:{winner_data['winner_id']}:{datetime.utcnow()}".encode()
                    ).hexdigest(),
                    "timestamp": datetime.utcnow().isoformat(),
                    "signed_by": "Spirit Tours Verification System"
                }
            }
        })
        
        return metadata

    async def _create_nft_image(self, winner_data: Dict) -> str:
        """Create visual NFT ticket image"""
        from PIL import Image, ImageDraw, ImageFont
        import requests
        
        # Create base ticket design
        img = Image.new('RGB', (1200, 800), color='white')
        draw = ImageDraw.Draw(img)
        
        # Add gradient background
        for i in range(800):
            color = (
                int(147 + (107 * i / 800)),  # Purple to blue gradient
                int(51 + (153 * i / 800)),
                int(234 - (34 * i / 800))
            )
            draw.rectangle([(0, i), (1200, i+1)], fill=color)
        
        # Add decorative frame
        draw.rectangle([(50, 50), (1150, 750)], outline='gold', width=5)
        draw.rectangle([(70, 70), (1130, 730)], outline='gold', width=2)
        
        # Load fonts
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
            subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
            text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
            small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            text_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
        
        # Add content
        draw.text((600, 120), "WINNER TICKET", font=title_font, fill='gold', anchor='mm')
        draw.text((600, 200), "Spirit Tours Rewards", font=subtitle_font, fill='white', anchor='mm')
        
        # Add trophy emoji or icon
        draw.text((600, 300), "🏆", font=ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 80) if True else title_font, anchor='mm')
        
        # Winner details
        draw.text((600, 400), winner_data['winner_name'], font=subtitle_font, fill='white', anchor='mm')
        draw.text((600, 460), f"Prize: {winner_data['prize_name']}", font=text_font, fill='gold', anchor='mm')
        draw.text((600, 510), f"Value: ${winner_data['prize_value']:,.2f} USD", font=text_font, fill='white', anchor='mm')
        
        # Add unique NFT number
        draw.text((600, 600), f"NFT #{winner_data['raffle_id']:06d}", font=text_font, fill='white', anchor='mm')
        
        # Add verification hash (shortened)
        verification_hash = hashlib.sha256(
            f"{winner_data['raffle_id']}:{winner_data['winner_id']}".encode()
        ).hexdigest()[:16]
        draw.text((600, 650), f"Verification: {verification_hash}", font=small_font, fill='lightgray', anchor='mm')
        
        # Add date
        draw.text((600, 700), datetime.utcnow().strftime("%B %d, %Y"), font=small_font, fill='white', anchor='mm')
        
        # Convert to base64 for storage
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        # Upload to IPFS or cloud storage
        ipfs_hash = await self._upload_image_to_ipfs(buffer.getvalue())
        
        return f"ipfs://{ipfs_hash}"

    async def _upload_to_ipfs(self, data: Dict) -> str:
        """Upload metadata to IPFS"""
        try:
            # Convert to JSON
            json_data = json.dumps(data, indent=2)
            
            # Upload to IPFS
            result = self.ipfs.add_json(data)
            ipfs_hash = result['Hash']
            
            logger.info(f"Uploaded to IPFS: {ipfs_hash}")
            
            # Pin the content to ensure persistence
            self.ipfs.pin.add(ipfs_hash)
            
            return ipfs_hash
            
        except Exception as e:
            logger.error(f"IPFS upload error: {str(e)}")
            # Fallback to centralized storage
            return await self._upload_to_cloud(data)

    async def _mint_nft(self, nft_ticket: NFTTicket) -> NFTTicket:
        """Mint NFT on Polygon blockchain"""
        try:
            # Prepare transaction
            nonce = self.w3.eth.get_transaction_count(self.admin_account.address)
            
            # Build transaction
            transaction = self.contract.functions.mintWinnerTicket(
                nft_ticket.winner_address,
                f"ipfs://{nft_ticket.ipfs_hash}",
                nft_ticket.raffle_id,
                int(nft_ticket.prize_value * 100)  # Convert to cents
            ).build_transaction({
                'from': self.admin_account.address,
                'nonce': nonce,
                'gas': 500000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 137  # Polygon Mainnet
            })
            
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                private_key=self.admin_account.key
            )
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            nft_ticket.transaction_hash = tx_hash.hex()
            nft_ticket.status = NFTStatus.MINTING
            
            logger.info(f"NFT minting transaction sent: {tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                # Extract token ID from events
                token_id = self._extract_token_id_from_receipt(receipt)
                nft_ticket.token_id = token_id
                nft_ticket.status = NFTStatus.MINTED
                
                logger.info(f"NFT minted successfully. Token ID: {token_id}")
            else:
                nft_ticket.status = NFTStatus.PENDING
                logger.error("NFT minting failed")
            
            return nft_ticket
            
        except Exception as e:
            logger.error(f"Minting error: {str(e)}")
            nft_ticket.status = NFTStatus.PENDING
            return nft_ticket

    async def _generate_verification_qr(self, nft_ticket: NFTTicket) -> str:
        """Generate QR code for NFT verification"""
        # Create verification URL
        verification_data = {
            'type': 'nft_ticket',
            'raffle_id': nft_ticket.raffle_id,
            'winner': nft_ticket.winner_name,
            'prize': nft_ticket.prize_name,
            'value': nft_ticket.prize_value,
            'date': nft_ticket.mint_date.isoformat(),
            'ipfs': nft_ticket.ipfs_hash,
            'verification': hashlib.sha256(
                f"{nft_ticket.raffle_id}:{nft_ticket.winner_name}:{nft_ticket.mint_date}".encode()
            ).hexdigest()
        }
        
        verification_url = f"https://spirittours.com/verify-nft?data={base64.b64encode(json.dumps(verification_data).encode()).decode()}"
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(verification_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{qr_base64}"

    async def transfer_nft(self, token_id: int, from_address: str, 
                          to_address: str) -> Dict:
        """Transfer NFT to another wallet"""
        try:
            # Build transfer transaction
            transaction = self.contract.functions.transferFrom(
                from_address,
                to_address,
                token_id
            ).build_transaction({
                'from': from_address,
                'nonce': self.w3.eth.get_transaction_count(from_address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 137
            })
            
            # Note: This would need user's signature in real implementation
            # For now, returning transaction data for user to sign
            
            return {
                'success': True,
                'transaction': transaction,
                'message': 'Transaction prepared for signing'
            }
            
        except Exception as e:
            logger.error(f"Transfer error: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def verify_nft_ownership(self, token_id: int, address: str) -> bool:
        """Verify NFT ownership on blockchain"""
        try:
            owner = self.contract.functions.ownerOf(token_id).call()
            return owner.lower() == address.lower()
        except:
            return False

    async def get_nft_metadata(self, token_id: int) -> Dict:
        """Get NFT metadata from blockchain"""
        try:
            # Get on-chain data
            metadata = self.contract.functions.getTicketMetadata(token_id).call()
            
            # Get IPFS metadata
            token_uri = self.contract.functions.tokenURI(token_id).call()
            ipfs_hash = token_uri.replace('ipfs://', '')
            ipfs_data = self.ipfs.cat(ipfs_hash)
            
            return {
                'on_chain': {
                    'winner': metadata[0],
                    'raffle_id': metadata[1],
                    'prize_value': metadata[2] / 100,  # Convert from cents
                    'minted_at': datetime.fromtimestamp(metadata[3]),
                    'claimed': metadata[4]
                },
                'ipfs': json.loads(ipfs_data)
            }
        except Exception as e:
            logger.error(f"Error getting NFT metadata: {str(e)}")
            return {}

    async def claim_prize_with_nft(self, token_id: int, claimer_address: str) -> Dict:
        """Claim prize using NFT"""
        try:
            # Verify ownership
            if not await self.verify_nft_ownership(token_id, claimer_address):
                return {'success': False, 'error': 'Not the NFT owner'}
            
            # Check if already claimed
            metadata = await self.get_nft_metadata(token_id)
            if metadata['on_chain']['claimed']:
                return {'success': False, 'error': 'Prize already claimed'}
            
            # Mark as claimed on blockchain
            transaction = self.contract.functions.claimPrize(token_id).build_transaction({
                'from': claimer_address,
                'nonce': self.w3.eth.get_transaction_count(claimer_address),
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 137
            })
            
            # Update database
            await self._update_nft_status(token_id, NFTStatus.CLAIMED)
            
            return {
                'success': True,
                'transaction': transaction,
                'message': 'Prize claim initiated'
            }
            
        except Exception as e:
            logger.error(f"Claim error: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def create_nft_marketplace_listing(self, token_id: int, 
                                            price: float) -> Dict:
        """List NFT for sale on marketplace"""
        # This would integrate with OpenSea or custom marketplace
        listing_data = {
            'token_id': token_id,
            'price': price,
            'currency': 'MATIC',
            'marketplace': 'OpenSea',
            'listing_url': f"https://opensea.io/assets/matic/{self.contract_address}/{token_id}"
        }
        
        # Store listing in database
        await self._store_marketplace_listing(listing_data)
        
        return {
            'success': True,
            'listing': listing_data,
            'message': 'NFT listed on marketplace'
        }

    def _calculate_rarity(self, winner_data: Dict) -> str:
        """Calculate NFT rarity based on prize value and participation"""
        prize_value = winner_data['prize_value']
        participants = winner_data.get('total_participants', 0)
        
        if prize_value >= 5000 or participants >= 50000:
            return "Legendary"
        elif prize_value >= 2500 or participants >= 20000:
            return "Epic"
        elif prize_value >= 1000 or participants >= 10000:
            return "Rare"
        elif prize_value >= 500 or participants >= 5000:
            return "Uncommon"
        else:
            return "Common"

    async def generate_nft_certificate(self, nft_ticket: NFTTicket) -> str:
        """Generate printable NFT certificate"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib.colors import HexColor
        
        # Create PDF
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content
        c.setFont("Helvetica-Bold", 24)
        c.drawString(200, 700, "NFT Winner Certificate")
        
        c.setFont("Helvetica", 14)
        c.drawString(100, 650, f"Winner: {nft_ticket.winner_name}")
        c.drawString(100, 620, f"Prize: {nft_ticket.prize_name}")
        c.drawString(100, 590, f"Value: ${nft_ticket.prize_value:,.2f}")
        c.drawString(100, 560, f"NFT Token ID: {nft_ticket.token_id}")
        c.drawString(100, 530, f"Date: {nft_ticket.mint_date.strftime('%Y-%m-%d')}")
        
        # Add QR code
        if nft_ticket.qr_code:
            # Convert base64 QR to image and add to PDF
            pass  # Implementation depends on specific requirements
        
        # Add blockchain verification
        c.setFont("Helvetica", 10)
        c.drawString(100, 480, f"Blockchain TX: {nft_ticket.transaction_hash[:20]}...")
        c.drawString(100, 460, f"IPFS: {nft_ticket.ipfs_hash[:20]}...")
        
        c.save()
        
        # Convert to base64
        pdf_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return pdf_base64

    # Database helper methods
    async def _store_nft_record(self, nft_ticket: NFTTicket):
        """Store NFT record in database"""
        # Implementation depends on your database schema
        pass
    
    async def _update_nft_status(self, token_id: int, status: NFTStatus):
        """Update NFT status in database"""
        # Implementation depends on your database schema
        pass
    
    async def _store_marketplace_listing(self, listing_data: Dict):
        """Store marketplace listing in database"""
        # Implementation depends on your database schema
        pass
    
    def _extract_token_id_from_receipt(self, receipt) -> int:
        """Extract token ID from transaction receipt"""
        # Parse events to find Transfer event and extract tokenId
        # Implementation depends on specific contract events
        return 1  # Placeholder