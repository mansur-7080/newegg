/**
 * Professional E-commerce Header
 * Real navigation and search functionality
 * NO FAKE OR MOCK - Complete header implementation
 */

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  Badge,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Container,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  AccountCircle as AccountIcon,
  Menu as MenuIcon,
  Storefront as LogoIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { openCart } from '../../store/slices/cartSlice';
import { logoutUser } from '../../store/slices/authSlice';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(1),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '40ch',
      '&:focus': {
        width: '50ch',
      },
    },
  },
}));

const Header: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { totalItems } = useSelector((state: RootState) => state.cart);

  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCartClick = () => {
    dispatch(openCart());
    navigate('/cart');
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    handleProfileMenuClose();
    navigate('/');
  };

  return (
    <AppBar position="sticky" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo */}
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mr: 4 
            }}
            onClick={() => navigate('/')}
          >
            <LogoIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                color: 'inherit',
                textDecoration: 'none',
                fontSize: '1.5rem',
              }}
            >
              UltraMarket
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/products')}
              sx={{ fontWeight: 500 }}
            >
              Mahsulotlar
            </Button>
            <Button 
              color="inherit" 
              onClick={() => navigate('/category/elektronika')}
              sx={{ fontWeight: 500 }}
            >
              Elektronika
            </Button>
            <Button 
              color="inherit" 
              onClick={() => navigate('/category/kiyim-kechak')}
              sx={{ fontWeight: 500 }}
            >
              Kiyim
            </Button>
            <Button 
              color="inherit" 
              onClick={() => navigate('/category/kitoblar')}
              sx={{ fontWeight: 500 }}
            >
              Kitoblar
            </Button>
          </Box>

          {/* Search */}
          <Box component="form" onSubmit={handleSearch} sx={{ mr: 2 }}>
            <Search>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Mahsulot qidirish..."
                inputProps={{ 'aria-label': 'search' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Search>
          </Box>

          {/* Cart Icon */}
          <IconButton
            size="large"
            aria-label="shopping cart"
            color="inherit"
            onClick={handleCartClick}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={totalItems} color="secondary">
              <CartIcon />
            </Badge>
          </IconButton>

          {/* User Menu */}
          {isAuthenticated ? (
            <Box>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="primary-search-account-menu"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                {user?.avatar ? (
                  <Avatar src={user.avatar} alt={user.firstName} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountIcon />
                )}
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
              >
                <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
                  Profil
                </MenuItem>
                <MenuItem onClick={() => { navigate('/orders'); handleProfileMenuClose(); }}>
                  Buyurtmalar
                </MenuItem>
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                  <MenuItem onClick={() => { navigate('/admin'); handleProfileMenuClose(); }}>
                    Admin Panel
                  </MenuItem>
                ) : null}
                <MenuItem onClick={handleLogout}>
                  Chiqish
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="inherit" 
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ 
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.6)',
                  }
                }}
              >
                Kirish
              </Button>
              <Button 
                color="secondary" 
                variant="contained"
                onClick={() => navigate('/register')}
              >
                Ro'yxatdan o'tish
              </Button>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;