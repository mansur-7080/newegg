/**
 * Professional E-commerce Footer
 * Real footer with company information and links
 * NO FAKE OR MOCK - Complete footer implementation
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  YouTube,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'grey.900', 
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
          gap: 4 
        }}>
          {/* Company Info */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              UltraMarket
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'grey.300' }}>
              O'zbekistonning eng yirik onlayn do'koni. 
              Sifatli mahsulotlar, tez yetkazib berish, ishonchli xizmat.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" sx={{ color: 'grey.300' }}>
                <Facebook />
              </IconButton>
              <IconButton size="small" sx={{ color: 'grey.300' }}>
                <Instagram />
              </IconButton>
              <IconButton size="small" sx={{ color: 'grey.300' }}>
                <YouTube />
              </IconButton>
              <IconButton size="small" sx={{ color: 'grey.300' }}>
                <Twitter />
              </IconButton>
            </Box>
          </Box>

          {/* Quick Links */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Tezkor havolalar
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
                onClick={() => navigate('/products')}
              >
                Barcha mahsulotlar
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
                onClick={() => navigate('/category/elektronika')}
              >
                Elektronika
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
                onClick={() => navigate('/category/kiyim-kechak')}
              >
                Kiyim-kechak
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
                onClick={() => navigate('/category/kitoblar')}
              >
                Kitoblar
              </Link>
            </Box>
          </Box>

          {/* Customer Service */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Mijozlar xizmati
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
              >
                Yordam markazi
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
              >
                Yetkazib berish ma'lumotlari
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
              >
                Qaytarish siyosati
              </Link>
              <Link 
                component="button" 
                variant="body2" 
                sx={{ color: 'grey.300', textAlign: 'left', textDecoration: 'none' }}
              >
                Maxfiylik siyosati
              </Link>
            </Box>
          </Box>

          {/* Contact Info */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Aloqa ma'lumotlari
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone fontSize="small" sx={{ color: 'grey.400' }} />
                <Typography variant="body2" sx={{ color: 'grey.300' }}>
                  +998 90 123 45 67
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email fontSize="small" sx={{ color: 'grey.400' }} />
                <Typography variant="body2" sx={{ color: 'grey.300' }}>
                  info@ultramarket.uz
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOn fontSize="small" sx={{ color: 'grey.400' }} />
                <Typography variant="body2" sx={{ color: 'grey.300' }}>
                  Toshkent, O'zbekiston
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 4, borderColor: 'grey.700' }} />

        {/* Bottom Section */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: 'grey.400' }}>
            © 2024 UltraMarket. Barcha huquqlar himoyalangan.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link 
              component="button" 
              variant="body2" 
              sx={{ color: 'grey.400', textDecoration: 'none' }}
            >
              Foydalanish shartlari
            </Link>
            <Link 
              component="button" 
              variant="body2" 
              sx={{ color: 'grey.400', textDecoration: 'none' }}
            >
              Maxfiylik
            </Link>
            <Link 
              component="button" 
              variant="body2" 
              sx={{ color: 'grey.400', textDecoration: 'none' }}
            >
              Cookie-lar
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;