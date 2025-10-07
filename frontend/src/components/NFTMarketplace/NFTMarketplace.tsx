import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
  Tooltip,
  Alert,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Pagination,
  Rating,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Paper,
  Container,
  AppBar,
  Toolbar,
  Drawer,
  Fab,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  ShoppingCart,
  AccountBalanceWallet,
  LocalOffer,
  TrendingUp,
  NewReleases,
  Verified,
  Diamond,
  EmojiEvents,
  CardGiftcard,
  PhotoCamera,
  Flight,
  Hotel,
  Restaurant,
  Landscape,
  Map,
  Collections,
  Favorite,
  FavoriteBorder,
  Share,
  MoreVert,
  Send,
  Gavel,
  History,
  Assessment,
  StoreMallDirectory,
  Category,
  Loyalty,
  Stars,
  WorkspacePremium,
  Public,
  Place,
  CalendarMonth,
  Timer,
  Visibility,
  ThumbUp,
  ArrowUpward,
  ArrowDownward,
  SwapVert,
  ViewModule,
  ViewList,
  Close,
  Check,
  Add,
  Remove,
  ExpandMore,
  ChevronRight,
  NavigateNext,
  NavigateBefore,
  FirstPage,
  LastPage,
  Refresh,
  Download,
  Upload,
  QrCode2,
  Bolt,
  AutoAwesome,
  Whatshot,
  TrendingDown,
  Sell,
  ShoppingBag,
  AccountCircle,
  CurrencyBitcoin,
  Token,
  Paid,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

// Types
interface NFT {
  tokenId: string;
  type: NFTType;
  name: string;
  description: string;
  image: string;
  owner: string;
  creator: string;
  price?: number;
  currency: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  metadata: {
    destination?: string;
    date?: string;
    achievement?: string;
    experienceId?: string;
    edition?: number;
    totalEditions?: number;
    attributes?: Array<{
      trait: string;
      value: string | number;
    }>;
  };
  stats: {
    views: number;
    likes: number;
    sales: number;
  };
  listed: boolean;
  createdAt: string;
  lastSalePrice?: number;
  blockchain: string;
}

enum NFTType {
  TRAVEL_BADGE = 'travel_badge',
  DESTINATION_STAMP = 'destination_stamp',
  EXPERIENCE_CERTIFICATE = 'experience_certificate',
  LOYALTY_TOKEN = 'loyalty_token',
  EXCLUSIVE_ACCESS = 'exclusive_access',
  PHOTO_MEMORY = 'photo_memory',
  ACHIEVEMENT = 'achievement',
}

interface Collection {
  id: string;
  name: string;
  description: string;
  creator: string;
  image: string;
  nfts: string[];
  floorPrice: number;
  totalVolume: number;
  verified: boolean;
}

interface Activity {
  id: string;
  type: 'sale' | 'mint' | 'transfer' | 'list' | 'bid';
  nft: NFT;
  from: string;
  to: string;
  price?: number;
  timestamp: string;
}

interface FilterOptions {
  category: string;
  rarity: string;
  priceRange: [number, number];
  sortBy: string;
  searchQuery: string;
  showOnlyListed: boolean;
}

// Constants
const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: <Category /> },
  { value: 'badges', label: 'Travel Badges', icon: <WorkspacePremium /> },
  { value: 'stamps', label: 'Destination Stamps', icon: <Place /> },
  { value: 'certificates', label: 'Experience Certificates', icon: <Verified /> },
  { value: 'loyalty', label: 'Loyalty Tokens', icon: <Loyalty /> },
  { value: 'access', label: 'Exclusive Access', icon: <Diamond /> },
  { value: 'photos', label: 'Photo Memories', icon: <PhotoCamera /> },
  { value: 'achievements', label: 'Achievements', icon: <EmojiEvents /> },
];

const RARITY_COLORS = {
  common: '#9e9e9e',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ff9800',
};

const SORT_OPTIONS = [
  { value: 'price_low', label: 'Price: Low to High', icon: <ArrowUpward /> },
  { value: 'price_high', label: 'Price: High to Low', icon: <ArrowDownward /> },
  { value: 'recent', label: 'Recently Listed', icon: <NewReleases /> },
  { value: 'popular', label: 'Most Popular', icon: <TrendingUp /> },
  { value: 'rarity', label: 'Rarity', icon: <Diamond /> },
];

interface NFTMarketplaceProps {
  userId: string;
  walletAddress?: string;
  onConnect?: () => void;
}

const NFTMarketplace: React.FC<NFTMarketplaceProps> = ({ 
  userId, 
  walletAddress,
  onConnect 
}) => {
  const theme = useTheme();
  
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<NFT[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userBalance, setUserBalance] = useState(1000); // Mock balance
  
  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    rarity: 'all',
    priceRange: [0, 10000],
    sortBy: 'recent',
    searchQuery: '',
    showOnlyListed: true,
  });
  
  // Load NFTs
  useEffect(() => {
    loadNFTs();
    loadCollections();
    loadActivities();
  }, [filters, page]);
  
  const loadNFTs = async () => {
    setLoading(true);
    try {
      // Mock API call
      const mockNFTs: NFT[] = Array.from({ length: 20 }, (_, i) => ({
        tokenId: `nft_${i}`,
        type: Object.values(NFTType)[i % 7],
        name: `Travel NFT #${i + 1}`,
        description: `A unique travel memory from an amazing journey`,
        image: `https://source.unsplash.com/400x400/?travel,${i}`,
        owner: `0x${Math.random().toString(16).substr(2, 8)}`,
        creator: `0x${Math.random().toString(16).substr(2, 8)}`,
        price: Math.floor(Math.random() * 1000) + 50,
        currency: 'SPIRIT',
        rarity: ['common', 'rare', 'epic', 'legendary'][Math.floor(Math.random() * 4)] as any,
        category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].value,
        metadata: {
          destination: ['Paris', 'Tokyo', 'New York', 'Dubai'][Math.floor(Math.random() * 4)],
          date: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
          edition: i + 1,
          totalEditions: 100,
        },
        stats: {
          views: Math.floor(Math.random() * 1000),
          likes: Math.floor(Math.random() * 100),
          sales: Math.floor(Math.random() * 10),
        },
        listed: Math.random() > 0.3,
        createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
        lastSalePrice: Math.floor(Math.random() * 500),
        blockchain: 'Ethereum',
      }));
      
      setNfts(mockNFTs);
      setTotalPages(5);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCollections = async () => {
    // Mock collections
    const mockCollections: Collection[] = [
      {
        id: 'col1',
        name: 'World Wonders',
        description: 'Exclusive NFTs from the 7 wonders of the world',
        creator: 'Spirit Tours',
        image: 'https://source.unsplash.com/400x400/?landmark',
        nfts: ['nft_1', 'nft_2', 'nft_3'],
        floorPrice: 250,
        totalVolume: 15000,
        verified: true,
      },
      {
        id: 'col2',
        name: 'Hidden Gems',
        description: 'Discover secret destinations',
        creator: 'Explorer DAO',
        image: 'https://source.unsplash.com/400x400/?nature',
        nfts: ['nft_4', 'nft_5'],
        floorPrice: 100,
        totalVolume: 5000,
        verified: false,
      },
    ];
    setCollections(mockCollections);
  };
  
  const loadActivities = async () => {
    // Mock activities
    const mockActivities: Activity[] = Array.from({ length: 10 }, (_, i) => ({
      id: `activity_${i}`,
      type: ['sale', 'mint', 'transfer', 'list', 'bid'][Math.floor(Math.random() * 5)] as any,
      nft: nfts[0] || {} as NFT,
      from: `0x${Math.random().toString(16).substr(2, 8)}`,
      to: `0x${Math.random().toString(16).substr(2, 8)}`,
      price: Math.floor(Math.random() * 500),
      timestamp: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
    }));
    setActivities(mockActivities);
  };
  
  // Handlers
  const handlePurchase = async (nft: NFT) => {
    if (!walletAddress) {
      onConnect?.();
      return;
    }
    
    setPurchaseDialogOpen(true);
    setSelectedNFT(nft);
  };
  
  const confirmPurchase = async () => {
    if (!selectedNFT || !selectedNFT.price) return;
    
    try {
      // Mock purchase
      console.log('Purchasing NFT:', selectedNFT);
      
      // Update balance
      setUserBalance(prev => prev - selectedNFT.price!);
      
      // Close dialog
      setPurchaseDialogOpen(false);
      setSelectedNFT(null);
      
      // Show success message
      alert('NFT purchased successfully!');
      
      // Reload NFTs
      loadNFTs();
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Purchase failed. Please try again.');
    }
  };
  
  const toggleFavorite = (nftId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(nftId)) {
        newFavorites.delete(nftId);
      } else {
        newFavorites.add(nftId);
      }
      return newFavorites;
    });
  };
  
  const addToCart = (nft: NFT) => {
    setCart(prev => [...prev, nft]);
  };
  
  const removeFromCart = (nftId: string) => {
    setCart(prev => prev.filter(n => n.tokenId !== nftId));
  };
  
  // Filter NFTs
  const filteredNFTs = nfts.filter(nft => {
    if (filters.showOnlyListed && !nft.listed) return false;
    if (filters.category !== 'all' && nft.category !== filters.category) return false;
    if (filters.rarity !== 'all' && nft.rarity !== filters.rarity) return false;
    if (nft.price && (nft.price < filters.priceRange[0] || nft.price > filters.priceRange[1])) return false;
    if (filters.searchQuery && !nft.name.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    return true;
  });
  
  // Sort NFTs
  const sortedNFTs = [...filteredNFTs].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price_low':
        return (a.price || 0) - (b.price || 0);
      case 'price_high':
        return (b.price || 0) - (a.price || 0);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return b.stats.views - a.stats.views;
      case 'rarity':
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
      default:
        return 0;
    }
  });
  
  // Render NFT Card
  const renderNFTCard = (nft: NFT) => (
    <Card 
      key={nft.tokenId}
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
          transition: 'all 0.3s',
        },
      }}
    >
      {/* Rarity Badge */}
      <Chip
        label={nft.rarity.toUpperCase()}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          backgroundColor: RARITY_COLORS[nft.rarity],
          color: 'white',
          fontWeight: 'bold',
        }}
      />
      
      {/* Favorite Button */}
      <IconButton
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.8)' }}
        onClick={() => toggleFavorite(nft.tokenId)}
      >
        {favorites.has(nft.tokenId) ? <Favorite color="error" /> : <FavoriteBorder />}
      </IconButton>
      
      <CardMedia
        component="img"
        height="250"
        image={nft.image}
        alt={nft.name}
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          setSelectedNFT(nft);
          setDetailsOpen(true);
        }}
      />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom noWrap>
          {nft.name}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Place fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {nft.metadata.destination}
          </Typography>
        </Box>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" gap={0.5}>
            <Chip 
              label={`#${nft.metadata.edition}/${nft.metadata.totalEditions}`}
              size="small"
              variant="outlined"
            />
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Visibility fontSize="small" />
            <Typography variant="caption">{nft.stats.views}</Typography>
            <ThumbUp fontSize="small" sx={{ ml: 1 }} />
            <Typography variant="caption">{nft.stats.likes}</Typography>
          </Box>
        </Box>
        
        {nft.listed && nft.price && (
          <Box mt={2}>
            <Typography variant="h6" color="primary">
              {nft.price} {nft.currency}
            </Typography>
            {nft.lastSalePrice && (
              <Typography variant="caption" color="text.secondary">
                Last sale: {nft.lastSalePrice} {nft.currency}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
      
      <CardActions>
        {nft.listed ? (
          <>
            <Button 
              size="small"
              variant="contained"
              fullWidth
              startIcon={<ShoppingCart />}
              onClick={() => handlePurchase(nft)}
            >
              Buy Now
            </Button>
            <IconButton size="small" onClick={() => addToCart(nft)}>
              <Add />
            </IconButton>
          </>
        ) : (
          <Button size="small" fullWidth disabled>
            Not Listed
          </Button>
        )}
      </CardActions>
    </Card>
  );
  
  // Render Collections
  const renderCollections = () => (
    <Grid container spacing={3}>
      {collections.map(collection => (
        <Grid item xs={12} md={6} lg={4} key={collection.id}>
          <Card>
            <CardMedia
              component="img"
              height="200"
              image={collection.image}
              alt={collection.name}
            />
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">{collection.name}</Typography>
                {collection.verified && <Verified color="primary" fontSize="small" />}
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {collection.description}
              </Typography>
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Floor Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {collection.floorPrice} SPIRIT
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Volume</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {collection.totalVolume} SPIRIT
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
            <CardActions>
              <Button size="small" fullWidth>View Collection</Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
  
  // Render Activity Feed
  const renderActivityFeed = () => (
    <List>
      {activities.map(activity => (
        <React.Fragment key={activity.id}>
          <ListItem>
            <ListItemAvatar>
              <Avatar src={activity.nft.image} />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">
                    {activity.type === 'sale' && 'Sold'}
                    {activity.type === 'mint' && 'Minted'}
                    {activity.type === 'transfer' && 'Transferred'}
                    {activity.type === 'list' && 'Listed'}
                    {activity.type === 'bid' && 'Bid placed'}
                  </Typography>
                  {activity.price && (
                    <Chip label={`${activity.price} SPIRIT`} size="small" color="primary" />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" display="block">
                    From: {activity.from.substring(0, 6)}...{activity.from.substring(activity.from.length - 4)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    To: {activity.to.substring(0, 6)}...{activity.to.substring(activity.to.length - 4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.timestamp).toLocaleString()}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
        </React.Fragment>
      ))}
    </List>
  );
  
  return (
    <Container maxWidth="xl">
      <Box py={4}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h3" gutterBottom>
            <Diamond sx={{ mr: 1, verticalAlign: 'middle' }} />
            NFT Marketplace
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Collect unique travel memories and exclusive experiences
          </Typography>
          
          {/* Wallet Info */}
          <Box mt={2} display="flex" alignItems="center" gap={2}>
            {walletAddress ? (
              <>
                <Chip
                  icon={<AccountBalanceWallet />}
                  label={`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                  color="primary"
                />
                <Chip
                  icon={<Token />}
                  label={`${userBalance} SPIRIT`}
                  color="secondary"
                />
              </>
            ) : (
              <Button
                variant="contained"
                startIcon={<AccountBalanceWallet />}
                onClick={onConnect}
              >
                Connect Wallet
              </Button>
            )}
            
            {/* Cart */}
            <Badge badgeContent={cart.length} color="error">
              <IconButton>
                <ShoppingCart />
              </IconButton>
            </Badge>
          </Box>
        </Box>
        
        {/* Tabs */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
          <Tab label="Explore" icon={<TravelExplore />} />
          <Tab label="Collections" icon={<Collections />} />
          <Tab label="Activity" icon={<History />} />
          <Tab label="My NFTs" icon={<AccountCircle />} />
        </Tabs>
        
        {/* Filters */}
        {activeTab === 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="Search NFTs..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {cat.icon}
                          {cat.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  >
                    {SORT_OPTIONS.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {option.icon}
                          {option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="body2" gutterBottom>
                  Price Range: {filters.priceRange[0]} - {filters.priceRange[1]} SPIRIT
                </Typography>
                <Slider
                  value={filters.priceRange}
                  onChange={(_, value) => setFilters({ ...filters, priceRange: value as [number, number] })}
                  min={0}
                  max={10000}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, value) => value && setViewMode(value)}
                >
                  <ToggleButton value="grid">
                    <ViewModule />
                  </ToggleButton>
                  <ToggleButton value="list">
                    <ViewList />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {/* Content */}
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map(i => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rectangular" height={400} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <>
            {activeTab === 0 && (
              <>
                <Grid container spacing={3}>
                  {sortedNFTs.map(nft => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={nft.tokenId}>
                      {renderNFTCard(nft)}
                    </Grid>
                  ))}
                </Grid>
                
                {/* Pagination */}
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              </>
            )}
            
            {activeTab === 1 && renderCollections()}
            
            {activeTab === 2 && (
              <Paper sx={{ p: 2 }}>
                {renderActivityFeed()}
              </Paper>
            )}
            
            {activeTab === 3 && (
              <Typography>Your NFT collection will appear here</Typography>
            )}
          </>
        )}
        
        {/* NFT Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {selectedNFT && (
            <>
              <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {selectedNFT.name}
                  <IconButton onClick={() => setDetailsOpen(false)}>
                    <Close />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <img
                      src={selectedNFT.image}
                      alt={selectedNFT.name}
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body1" paragraph>
                      {selectedNFT.description}
                    </Typography>
                    
                    <Box mb={2}>
                      <Chip
                        label={selectedNFT.rarity.toUpperCase()}
                        sx={{
                          backgroundColor: RARITY_COLORS[selectedNFT.rarity],
                          color: 'white',
                          mr: 1,
                        }}
                      />
                      <Chip label={`Edition #${selectedNFT.metadata.edition}`} />
                    </Box>
                    
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Destination"
                          secondary={selectedNFT.metadata.destination}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Created"
                          secondary={new Date(selectedNFT.createdAt).toLocaleDateString()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Blockchain"
                          secondary={selectedNFT.blockchain}
                        />
                      </ListItem>
                    </List>
                    
                    {selectedNFT.price && (
                      <Box mt={3}>
                        <Typography variant="h5" color="primary" gutterBottom>
                          {selectedNFT.price} {selectedNFT.currency}
                        </Typography>
                        <Button
                          variant="contained"
                          fullWidth
                          size="large"
                          startIcon={<ShoppingCart />}
                          onClick={() => handlePurchase(selectedNFT)}
                        >
                          Buy Now
                        </Button>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </DialogContent>
            </>
          )}
        </Dialog>
        
        {/* Purchase Confirmation Dialog */}
        <Dialog
          open={purchaseDialogOpen}
          onClose={() => setPurchaseDialogOpen(false)}
        >
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogContent>
            {selectedNFT && (
              <Box>
                <Typography variant="body1" paragraph>
                  You are about to purchase <strong>{selectedNFT.name}</strong> for{' '}
                  <strong>{selectedNFT.price} {selectedNFT.currency}</strong>
                </Typography>
                <Alert severity="info">
                  Your current balance: {userBalance} SPIRIT
                </Alert>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPurchaseDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmPurchase}
              disabled={selectedNFT && selectedNFT.price ? selectedNFT.price > userBalance : true}
            >
              Confirm Purchase
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default NFTMarketplace;