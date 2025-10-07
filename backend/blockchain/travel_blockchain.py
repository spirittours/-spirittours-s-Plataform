"""
Sistema Blockchain para Spirit Tours
Smart contracts, NFTs de viaje, y transparencia en reservas
"""

import hashlib
import json
import time
import uuid
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from decimal import Decimal

# Web3 imports (for Ethereum integration)
try:
    from web3 import Web3
    from eth_account import Account
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    print("Web3 not available. Install with: pip install web3")

# Blockchain Types
class TransactionType(str, Enum):
    BOOKING = "booking"
    PAYMENT = "payment"
    REFUND = "refund"
    NFT_MINT = "nft_mint"
    NFT_TRANSFER = "nft_transfer"
    REWARD = "reward"
    REVIEW = "review"
    VERIFICATION = "verification"

class NFTType(str, Enum):
    TRAVEL_BADGE = "travel_badge"
    DESTINATION_STAMP = "destination_stamp"
    EXPERIENCE_CERTIFICATE = "experience_certificate"
    LOYALTY_TOKEN = "loyalty_token"
    EXCLUSIVE_ACCESS = "exclusive_access"
    PHOTO_MEMORY = "photo_memory"
    ACHIEVEMENT = "achievement"

class ContractStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

# Blockchain Data Structures
@dataclass
class Block:
    """Individual block in the blockchain"""
    index: int
    timestamp: float
    transactions: List[Dict[str, Any]]
    previous_hash: str
    nonce: int = 0
    hash: str = ""
    
    def calculate_hash(self) -> str:
        """Calculate block hash"""
        block_data = {
            "index": self.index,
            "timestamp": self.timestamp,
            "transactions": self.transactions,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }
        block_string = json.dumps(block_data, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def mine_block(self, difficulty: int = 4) -> None:
        """Mine block with proof of work"""
        target = "0" * difficulty
        while self.hash[:difficulty] != target:
            self.nonce += 1
            self.hash = self.calculate_hash()

@dataclass
class Transaction:
    """Blockchain transaction"""
    transaction_id: str
    transaction_type: TransactionType
    sender: str
    receiver: str
    amount: Decimal
    currency: str
    data: Dict[str, Any]
    timestamp: float
    signature: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert transaction to dictionary"""
        return {
            "transaction_id": self.transaction_id,
            "type": self.transaction_type.value,
            "sender": self.sender,
            "receiver": self.receiver,
            "amount": str(self.amount),
            "currency": self.currency,
            "data": self.data,
            "timestamp": self.timestamp,
            "signature": self.signature
        }
    
    def sign(self, private_key: str) -> None:
        """Sign transaction with private key"""
        transaction_data = json.dumps(self.to_dict(), sort_keys=True)
        signature_hash = hashlib.sha256(transaction_data.encode()).hexdigest()
        # In production, use proper cryptographic signing
        self.signature = hashlib.sha256(f"{private_key}{signature_hash}".encode()).hexdigest()

@dataclass
class SmartContract:
    """Smart contract for automated travel agreements"""
    contract_id: str
    contract_type: str
    parties: List[str]
    terms: Dict[str, Any]
    conditions: List[Dict[str, Any]]
    status: ContractStatus
    created_at: float
    expires_at: Optional[float]
    execution_history: List[Dict[str, Any]]
    
    def evaluate_conditions(self, context: Dict[str, Any]) -> bool:
        """Evaluate if contract conditions are met"""
        for condition in self.conditions:
            if not self._evaluate_single_condition(condition, context):
                return False
        return True
    
    def _evaluate_single_condition(self, condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Evaluate a single condition"""
        condition_type = condition.get("type")
        
        if condition_type == "date_reached":
            return time.time() >= condition.get("timestamp", float('inf'))
        elif condition_type == "payment_received":
            return context.get("payment_status") == "completed"
        elif condition_type == "service_delivered":
            return context.get("service_status") == "delivered"
        elif condition_type == "review_submitted":
            return context.get("review_id") is not None
        else:
            return True
    
    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute smart contract"""
        if self.status != ContractStatus.ACTIVE:
            return {"error": "Contract is not active"}
        
        if not self.evaluate_conditions(context):
            return {"error": "Contract conditions not met"}
        
        # Execute contract terms
        execution_result = {
            "contract_id": self.contract_id,
            "executed_at": time.time(),
            "actions": []
        }
        
        for term_key, term_value in self.terms.items():
            if term_key == "transfer_funds":
                execution_result["actions"].append({
                    "type": "transfer",
                    "from": term_value["from"],
                    "to": term_value["to"],
                    "amount": term_value["amount"]
                })
            elif term_key == "mint_nft":
                execution_result["actions"].append({
                    "type": "mint_nft",
                    "recipient": term_value["recipient"],
                    "nft_type": term_value["type"]
                })
        
        self.execution_history.append(execution_result)
        self.status = ContractStatus.COMPLETED
        
        return execution_result

@dataclass
class TravelNFT:
    """NFT for travel experiences and collectibles"""
    token_id: str
    nft_type: NFTType
    owner: str
    metadata: Dict[str, Any]
    created_at: float
    transfer_history: List[Dict[str, Any]]
    smart_contract_address: Optional[str] = None
    
    def transfer(self, new_owner: str) -> None:
        """Transfer NFT ownership"""
        transfer_record = {
            "from": self.owner,
            "to": new_owner,
            "timestamp": time.time()
        }
        self.transfer_history.append(transfer_record)
        self.owner = new_owner
    
    def get_rarity_score(self) -> float:
        """Calculate NFT rarity score"""
        base_rarity = {
            NFTType.TRAVEL_BADGE: 0.5,
            NFTType.DESTINATION_STAMP: 0.3,
            NFTType.EXPERIENCE_CERTIFICATE: 0.4,
            NFTType.LOYALTY_TOKEN: 0.6,
            NFTType.EXCLUSIVE_ACCESS: 0.9,
            NFTType.PHOTO_MEMORY: 0.2,
            NFTType.ACHIEVEMENT: 0.7
        }
        
        rarity = base_rarity.get(self.nft_type, 0.5)
        
        # Adjust based on metadata
        if self.metadata.get("limited_edition"):
            rarity += 0.2
        if self.metadata.get("first_visitor"):
            rarity += 0.3
        if len(self.transfer_history) == 0:
            rarity += 0.1  # Never transferred
        
        return min(1.0, rarity)


class TravelBlockchain:
    """
    Main blockchain system for Spirit Tours
    """
    
    def __init__(self, difficulty: int = 4):
        self.chain: List[Block] = []
        self.difficulty = difficulty
        self.pending_transactions: List[Transaction] = []
        self.mining_reward = Decimal("10")
        self.contracts: Dict[str, SmartContract] = {}
        self.nfts: Dict[str, TravelNFT] = {}
        self.wallets: Dict[str, Dict[str, Any]] = {}
        
        # Create genesis block
        self.create_genesis_block()
        
        # Initialize Web3 connection if available
        if WEB3_AVAILABLE:
            self.w3 = self._init_web3()
        else:
            self.w3 = None
    
    def create_genesis_block(self) -> None:
        """Create the first block in the chain"""
        genesis_block = Block(
            index=0,
            timestamp=time.time(),
            transactions=[],
            previous_hash="0"
        )
        genesis_block.hash = genesis_block.calculate_hash()
        self.chain.append(genesis_block)
    
    def _init_web3(self) -> Optional[Web3]:
        """Initialize Web3 connection to Ethereum network"""
        try:
            # Connect to local Ethereum node or Infura
            w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_INFURA_KEY'))
            if w3.is_connected():
                return w3
        except Exception as e:
            print(f"Failed to connect to Ethereum: {e}")
        return None
    
    def get_latest_block(self) -> Block:
        """Get the most recent block"""
        return self.chain[-1]
    
    def create_transaction(
        self,
        sender: str,
        receiver: str,
        amount: Decimal,
        transaction_type: TransactionType,
        data: Dict[str, Any] = None
    ) -> Transaction:
        """Create a new transaction"""
        transaction = Transaction(
            transaction_id=f"tx_{uuid.uuid4().hex}",
            transaction_type=transaction_type,
            sender=sender,
            receiver=receiver,
            amount=amount,
            currency="SPIRIT",  # Native token
            data=data or {},
            timestamp=time.time()
        )
        
        # Sign transaction (in production, use actual private key)
        transaction.sign(f"private_key_{sender}")
        
        self.pending_transactions.append(transaction)
        
        return transaction
    
    def mine_pending_transactions(self, mining_reward_address: str) -> Block:
        """Mine pending transactions into a new block"""
        
        # Create reward transaction for miner
        reward_transaction = Transaction(
            transaction_id=f"reward_{uuid.uuid4().hex}",
            transaction_type=TransactionType.REWARD,
            sender="system",
            receiver=mining_reward_address,
            amount=self.mining_reward,
            currency="SPIRIT",
            data={"type": "mining_reward"},
            timestamp=time.time()
        )
        
        # Add all pending transactions including reward
        transactions = [t.to_dict() for t in self.pending_transactions]
        transactions.append(reward_transaction.to_dict())
        
        # Create new block
        new_block = Block(
            index=len(self.chain),
            timestamp=time.time(),
            transactions=transactions,
            previous_hash=self.get_latest_block().hash
        )
        
        # Mine the block
        new_block.mine_block(self.difficulty)
        
        # Add to chain
        self.chain.append(new_block)
        
        # Update wallets
        for transaction in self.pending_transactions:
            self._update_wallets(transaction)
        self._update_wallet_balance(mining_reward_address, self.mining_reward)
        
        # Clear pending transactions
        self.pending_transactions = []
        
        return new_block
    
    def _update_wallets(self, transaction: Transaction) -> None:
        """Update wallet balances after transaction"""
        if transaction.sender != "system":
            self._update_wallet_balance(transaction.sender, -transaction.amount)
        self._update_wallet_balance(transaction.receiver, transaction.amount)
    
    def _update_wallet_balance(self, address: str, amount: Decimal) -> None:
        """Update individual wallet balance"""
        if address not in self.wallets:
            self.wallets[address] = {
                "balance": Decimal("0"),
                "transactions": [],
                "nfts": []
            }
        self.wallets[address]["balance"] += amount
    
    def get_balance(self, address: str) -> Decimal:
        """Get wallet balance"""
        if address not in self.wallets:
            return Decimal("0")
        return self.wallets[address]["balance"]
    
    def validate_chain(self) -> bool:
        """Validate the entire blockchain"""
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i-1]
            
            # Check if current block's hash is correct
            if current_block.hash != current_block.calculate_hash():
                return False
            
            # Check if previous hash matches
            if current_block.previous_hash != previous_block.hash:
                return False
            
            # Check if block is properly mined
            if current_block.hash[:self.difficulty] != "0" * self.difficulty:
                return False
        
        return True
    
    async def create_booking_contract(
        self,
        customer: str,
        provider: str,
        booking_details: Dict[str, Any],
        payment_amount: Decimal
    ) -> SmartContract:
        """Create smart contract for booking"""
        
        contract = SmartContract(
            contract_id=f"contract_{uuid.uuid4().hex}",
            contract_type="booking",
            parties=[customer, provider],
            terms={
                "service": booking_details,
                "payment": {
                    "amount": str(payment_amount),
                    "currency": "SPIRIT",
                    "distribution": {
                        "provider": 0.9,  # 90% to provider
                        "platform": 0.1   # 10% platform fee
                    }
                },
                "cancellation_policy": {
                    "full_refund": 48,  # Hours before
                    "partial_refund": 24,  # 50% refund
                    "no_refund": 0
                }
            },
            conditions=[
                {"type": "payment_received", "required": True},
                {"type": "date_reached", "timestamp": booking_details.get("start_date")}
            ],
            status=ContractStatus.PENDING,
            created_at=time.time(),
            expires_at=booking_details.get("end_date"),
            execution_history=[]
        )
        
        self.contracts[contract.contract_id] = contract
        
        # Create blockchain transaction for contract creation
        self.create_transaction(
            sender=customer,
            receiver="contract_pool",
            amount=payment_amount,
            transaction_type=TransactionType.BOOKING,
            data={"contract_id": contract.contract_id}
        )
        
        return contract
    
    def execute_contract(self, contract_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a smart contract"""
        if contract_id not in self.contracts:
            return {"error": "Contract not found"}
        
        contract = self.contracts[contract_id]
        result = contract.execute(context)
        
        # Process contract actions
        for action in result.get("actions", []):
            if action["type"] == "transfer":
                self.create_transaction(
                    sender=action["from"],
                    receiver=action["to"],
                    amount=Decimal(action["amount"]),
                    transaction_type=TransactionType.PAYMENT,
                    data={"contract_id": contract_id}
                )
            elif action["type"] == "mint_nft":
                self.mint_nft(
                    recipient=action["recipient"],
                    nft_type=NFTType(action["nft_type"]),
                    metadata={"contract_id": contract_id}
                )
        
        return result
    
    def mint_nft(
        self,
        recipient: str,
        nft_type: NFTType,
        metadata: Dict[str, Any]
    ) -> TravelNFT:
        """Mint a new travel NFT"""
        
        token_id = f"nft_{uuid.uuid4().hex}"
        
        nft = TravelNFT(
            token_id=token_id,
            nft_type=nft_type,
            owner=recipient,
            metadata=metadata,
            created_at=time.time(),
            transfer_history=[]
        )
        
        # Deploy to Ethereum if Web3 available
        if self.w3:
            nft.smart_contract_address = self._deploy_nft_contract(nft)
        
        self.nfts[token_id] = nft
        
        # Update wallet
        if recipient not in self.wallets:
            self.wallets[recipient] = {"balance": Decimal("0"), "transactions": [], "nfts": []}
        self.wallets[recipient]["nfts"].append(token_id)
        
        # Create minting transaction
        self.create_transaction(
            sender="system",
            receiver=recipient,
            amount=Decimal("0"),
            transaction_type=TransactionType.NFT_MINT,
            data={
                "token_id": token_id,
                "nft_type": nft_type.value,
                "metadata": metadata
            }
        )
        
        return nft
    
    def _deploy_nft_contract(self, nft: TravelNFT) -> str:
        """Deploy NFT to Ethereum blockchain"""
        # This would deploy actual ERC-721 contract
        # For demo, return mock address
        return f"0x{uuid.uuid4().hex[:40]}"
    
    def transfer_nft(self, token_id: str, from_address: str, to_address: str) -> bool:
        """Transfer NFT ownership"""
        if token_id not in self.nfts:
            return False
        
        nft = self.nfts[token_id]
        
        if nft.owner != from_address:
            return False
        
        # Update NFT
        nft.transfer(to_address)
        
        # Update wallets
        if from_address in self.wallets:
            self.wallets[from_address]["nfts"].remove(token_id)
        
        if to_address not in self.wallets:
            self.wallets[to_address] = {"balance": Decimal("0"), "transactions": [], "nfts": []}
        self.wallets[to_address]["nfts"].append(token_id)
        
        # Create transfer transaction
        self.create_transaction(
            sender=from_address,
            receiver=to_address,
            amount=Decimal("0"),
            transaction_type=TransactionType.NFT_TRANSFER,
            data={"token_id": token_id}
        )
        
        return True
    
    def create_travel_badge(
        self,
        user: str,
        destination: str,
        achievement: str,
        metadata: Dict[str, Any] = None
    ) -> TravelNFT:
        """Create special travel badge NFT"""
        
        badge_metadata = {
            "destination": destination,
            "achievement": achievement,
            "date": datetime.now().isoformat(),
            "verified": True,
            **(metadata or {})
        }
        
        # Special badges for milestones
        if achievement == "first_visit":
            badge_metadata["limited_edition"] = True
            badge_metadata["edition_number"] = 1
        elif achievement == "100_countries":
            badge_metadata["legendary"] = True
        
        return self.mint_nft(
            recipient=user,
            nft_type=NFTType.TRAVEL_BADGE,
            metadata=badge_metadata
        )
    
    def create_photo_memory_nft(
        self,
        user: str,
        photo_url: str,
        location: str,
        timestamp: float
    ) -> TravelNFT:
        """Create NFT from travel photo"""
        
        metadata = {
            "photo_url": photo_url,
            "location": location,
            "captured_at": timestamp,
            "hash": hashlib.sha256(photo_url.encode()).hexdigest()
        }
        
        return self.mint_nft(
            recipient=user,
            nft_type=NFTType.PHOTO_MEMORY,
            metadata=metadata
        )
    
    def get_user_nfts(self, user: str) -> List[TravelNFT]:
        """Get all NFTs owned by user"""
        if user not in self.wallets:
            return []
        
        nft_ids = self.wallets[user].get("nfts", [])
        return [self.nfts[nft_id] for nft_id in nft_ids if nft_id in self.nfts]
    
    def get_nft_marketplace_value(self, token_id: str) -> Decimal:
        """Estimate NFT marketplace value"""
        if token_id not in self.nfts:
            return Decimal("0")
        
        nft = self.nfts[token_id]
        base_values = {
            NFTType.TRAVEL_BADGE: Decimal("50"),
            NFTType.DESTINATION_STAMP: Decimal("10"),
            NFTType.EXPERIENCE_CERTIFICATE: Decimal("25"),
            NFTType.LOYALTY_TOKEN: Decimal("100"),
            NFTType.EXCLUSIVE_ACCESS: Decimal("500"),
            NFTType.PHOTO_MEMORY: Decimal("5"),
            NFTType.ACHIEVEMENT: Decimal("75")
        }
        
        base_value = base_values.get(nft.nft_type, Decimal("10"))
        rarity_multiplier = Decimal(str(1 + nft.get_rarity_score()))
        age_bonus = Decimal(str(1 + (time.time() - nft.created_at) / (365 * 24 * 3600)))  # Age in years
        
        return base_value * rarity_multiplier * age_bonus
    
    def create_loyalty_program(self, user: str, points: int) -> Dict[str, Any]:
        """Create blockchain-based loyalty program"""
        
        # Convert points to loyalty tokens
        tokens_earned = Decimal(points) / Decimal("100")  # 100 points = 1 token
        
        # Create loyalty NFT
        loyalty_nft = self.mint_nft(
            recipient=user,
            nft_type=NFTType.LOYALTY_TOKEN,
            metadata={
                "points": points,
                "tokens": str(tokens_earned),
                "tier": self._calculate_loyalty_tier(points),
                "benefits": self._get_tier_benefits(points)
            }
        )
        
        # Add tokens to wallet
        self._update_wallet_balance(user, tokens_earned)
        
        return {
            "user": user,
            "points": points,
            "tokens_earned": str(tokens_earned),
            "nft_id": loyalty_nft.token_id,
            "tier": loyalty_nft.metadata["tier"],
            "benefits": loyalty_nft.metadata["benefits"]
        }
    
    def _calculate_loyalty_tier(self, points: int) -> str:
        """Calculate loyalty tier based on points"""
        if points >= 10000:
            return "Diamond"
        elif points >= 5000:
            return "Platinum"
        elif points >= 2000:
            return "Gold"
        elif points >= 500:
            return "Silver"
        else:
            return "Bronze"
    
    def _get_tier_benefits(self, points: int) -> List[str]:
        """Get benefits for loyalty tier"""
        tier = self._calculate_loyalty_tier(points)
        
        benefits_map = {
            "Diamond": [
                "20% discount on all bookings",
                "Free airport transfers",
                "VIP customer support",
                "Exclusive destination access",
                "Complimentary upgrades"
            ],
            "Platinum": [
                "15% discount on all bookings",
                "Priority customer support",
                "Early access to deals",
                "Free cancellation"
            ],
            "Gold": [
                "10% discount on all bookings",
                "Flexible cancellation",
                "Loyalty point multiplier 2x"
            ],
            "Silver": [
                "5% discount on all bookings",
                "Loyalty point multiplier 1.5x"
            ],
            "Bronze": [
                "Welcome bonus",
                "Basic loyalty points"
            ]
        }
        
        return benefits_map.get(tier, [])
    
    def verify_travel_experience(
        self,
        user: str,
        experience_id: str,
        proof_data: Dict[str, Any]
    ) -> bool:
        """Verify and record travel experience on blockchain"""
        
        # Create verification transaction
        verification_tx = self.create_transaction(
            sender="verification_system",
            receiver=user,
            amount=Decimal("0"),
            transaction_type=TransactionType.VERIFICATION,
            data={
                "experience_id": experience_id,
                "proof": proof_data,
                "verified_at": time.time()
            }
        )
        
        # Mine immediately for verification
        self.mine_pending_transactions("verification_system")
        
        # Create experience certificate NFT
        self.mint_nft(
            recipient=user,
            nft_type=NFTType.EXPERIENCE_CERTIFICATE,
            metadata={
                "experience_id": experience_id,
                "verification_tx": verification_tx.transaction_id,
                "proof_hash": hashlib.sha256(
                    json.dumps(proof_data, sort_keys=True).encode()
                ).hexdigest()
            }
        )
        
        return True
    
    def get_transaction_history(
        self,
        address: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get transaction history for an address"""
        
        transactions = []
        
        for block in reversed(self.chain):
            for tx in block.transactions:
                if tx.get("sender") == address or tx.get("receiver") == address:
                    transactions.append({
                        "block_index": block.index,
                        "timestamp": block.timestamp,
                        **tx
                    })
                
                if len(transactions) >= limit:
                    return transactions
        
        return transactions
    
    def export_chain_data(self) -> Dict[str, Any]:
        """Export blockchain data for analysis"""
        
        return {
            "chain_length": len(self.chain),
            "total_transactions": sum(len(block.transactions) for block in self.chain),
            "total_nfts": len(self.nfts),
            "active_contracts": len([c for c in self.contracts.values() 
                                    if c.status == ContractStatus.ACTIVE]),
            "total_wallets": len(self.wallets),
            "total_supply": sum(w["balance"] for w in self.wallets.values()),
            "chain_valid": self.validate_chain()
        }


# Blockchain Analytics
class BlockchainAnalytics:
    """Analytics for travel blockchain data"""
    
    def __init__(self, blockchain: TravelBlockchain):
        self.blockchain = blockchain
    
    def get_popular_destinations(self) -> List[Tuple[str, int]]:
        """Get most popular destinations from NFT data"""
        
        destination_count = {}
        
        for nft in self.blockchain.nfts.values():
            if nft.nft_type in [NFTType.DESTINATION_STAMP, NFTType.TRAVEL_BADGE]:
                destination = nft.metadata.get("destination")
                if destination:
                    destination_count[destination] = destination_count.get(destination, 0) + 1
        
        return sorted(destination_count.items(), key=lambda x: x[1], reverse=True)
    
    def get_top_collectors(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get users with most NFTs"""
        
        nft_counts = []
        
        for address, wallet in self.blockchain.wallets.items():
            nft_count = len(wallet.get("nfts", []))
            if nft_count > 0:
                nft_counts.append((address, nft_count))
        
        return sorted(nft_counts, key=lambda x: x[1], reverse=True)[:limit]
    
    def calculate_network_stats(self) -> Dict[str, Any]:
        """Calculate network statistics"""
        
        total_value_locked = Decimal("0")
        for contract in self.blockchain.contracts.values():
            if contract.status == ContractStatus.ACTIVE:
                payment = contract.terms.get("payment", {})
                amount = payment.get("amount", "0")
                total_value_locked += Decimal(amount)
        
        return {
            "total_value_locked": str(total_value_locked),
            "active_users": len(self.blockchain.wallets),
            "total_nft_value": str(sum(
                self.blockchain.get_nft_marketplace_value(nft_id)
                for nft_id in self.blockchain.nfts.keys()
            )),
            "transactions_per_block": sum(len(block.transactions) for block in self.blockchain.chain) / len(self.blockchain.chain)
        }