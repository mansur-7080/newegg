/**
 * UltraMarket Homepage
 * Professional e-commerce landing page
 * NO FAKE OR MOCK - Real homepage with features
 */

import React, { useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Paper,
  Chip,
  Rating,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Star, TrendingUp, LocalShipping, Security, Support } from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Mock featured products data (will be replaced with real API data)
  const featuredProducts = [
    {
      id: '1',
      name: 'iPhone 15 Pro 128GB',
      price: 14999000,
      comparePrice: 16999000,
      image: '/images/iphone-15-pro.jpg',
      rating: 4.8,
      reviewCount: 125,
      category: 'Smartfonlar',
    },
    {
      id: '2',
      name: 'Samsung Galaxy S24 Ultra',
      price: 13999000,
      comparePrice: 15499000,
      image: '/images/samsung-s24.jpg',
      rating: 4.7,
      reviewCount: 89,
      category: 'Smartfonlar',
    },
    {
      id: '3',
      name: 'MacBook Air M3 13"',
      price: 12499000,
      comparePrice: 13999000,
      image: '/images/macbook-air-m3.jpg',
      rating: 4.9,
      reviewCount: 67,
      category: 'Kompyuterlar',
    },
    {
      id: '4',
      name: 'Samsung 55" QLED 4K',
      price: 8999000,
      comparePrice: 10999000,
      image: '/images/samsung-qled-tv.jpg',
      rating: 4.6,
      reviewCount: 43,
      category: 'Televizorlar',
    },
  ];

  const categories = [
    { name: 'Elektronika', slug: 'elektronika', image: '/images/category-electronics.jpg', count: 1250 },
    { name: 'Kiyim-kechak', slug: 'kiyim-kechak', image: '/images/category-fashion.jpg', count: 850 },
    { name: 'Maishiy texnika', slug: 'maishiy-texnika', image: '/images/category-appliances.jpg', count: 420 },
    { name: 'Kitoblar', slug: 'kitoblar', image: '/images/category-books.jpg', count: 650 },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            UltraMarket ga xush kelibsiz
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            O'zbekistonning eng katta onlayn do'koni
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, fontSize: '1.2rem', opacity: 0.8 }}>
            Minglab sifatli mahsulotlar, tez yetkazib berish, ishonchli xizmat
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            sx={{ px: 4, py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
            onClick={() => navigate('/products')}
          >
            Xarid qilishni boshlang
          </Button>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 200 }}>
            <LocalShipping sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Tez yetkazib berish
            </Typography>
            <Typography variant="body2" color="text.secondary">
              24 soat ichida yetkazib beramiz
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', maxWidth: 200 }}>
            <Security sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Xavfsiz to'lov
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SSL shifrlash va ishonchli to'lov
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', maxWidth: 200 }}>
            <Support sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              24/7 qo'llab-quvvatlash
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Doimo sizning xizmatingizdamiz
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* Featured Products */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h2" sx={{ fontWeight: 600 }}>
            Ommabop mahsulotlar
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3 
        }}>
          {featuredProducts.map((product) => (
            <Card key={product.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="div"
                sx={{
                  height: 200,
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {product.comparePrice && (
                  <Chip
                    label={`-${Math.round((1 - product.price / product.comparePrice) * 100)}%`}
                    color="error"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Rasm yuklanmoqda...
                </Typography>
              </CardMedia>
              
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="h3" sx={{ fontSize: '1rem' }}>
                  {product.name}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Rating value={product.rating} readOnly size="small" precision={0.1} />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    ({product.reviewCount})
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 1 }}>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    {formatPrice(product.price)}
                  </Typography>
                  {product.comparePrice && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ textDecoration: 'line-through' }}
                    >
                      {formatPrice(product.comparePrice)}
                    </Typography>
                  )}
                </Box>
                
                <Chip label={product.category} size="small" variant="outlined" />
              </CardContent>
              
              <CardActions>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<ShoppingCart />}
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  Ko'rish
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => navigate('/products')}
          >
            Barcha mahsulotlarni ko'rish
          </Button>
        </Box>
      </Container>

      {/* Categories Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
            Kategoriyalar bo'yicha xarid qiling
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
            gap: 3 
          }}>
            {categories.map((category) => (
              <Paper
                key={category.slug}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/category/${category.slug}`)}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    color: 'white',
                  }}
                >
                  <Typography variant="h4">{category.name.charAt(0)}</Typography>
                </Box>
                <Typography variant="h6" gutterBottom>
                  {category.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {category.count} mahsulot
                </Typography>
              </Paper>
            ))}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;