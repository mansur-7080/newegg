#!/bin/bash

# ProductDetailPage
cat > src/pages/ProductDetailPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const ProductDetailPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Mahsulot tafsilotlari</Typography>
    </Container>
  );
};
export default ProductDetailPage;
EOL

# CategoryPage
cat > src/pages/CategoryPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const CategoryPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Kategoriya sahifasi</Typography>
    </Container>
  );
};
export default CategoryPage;
EOL

# CartPage
cat > src/pages/CartPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const CartPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Savatcha</Typography>
    </Container>
  );
};
export default CartPage;
EOL

# CheckoutPage
cat > src/pages/CheckoutPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const CheckoutPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">To'lov sahifasi</Typography>
    </Container>
  );
};
export default CheckoutPage;
EOL

# SearchResultsPage
cat > src/pages/SearchResultsPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const SearchResultsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Qidiruv natijalari</Typography>
    </Container>
  );
};
export default SearchResultsPage;
EOL

# NotFoundPage
cat > src/pages/NotFoundPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h2" gutterBottom>404</Typography>
      <Typography variant="h5" gutterBottom>Sahifa topilmadi</Typography>
      <Box sx={{ mt: 4 }}>
        <Button variant="contained" onClick={() => navigate('/')}>
          Bosh sahifaga qaytish
        </Button>
      </Box>
    </Container>
  );
};
export default NotFoundPage;
EOL

# Auth pages
cat > src/pages/auth/LoginPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const LoginPage: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4">Tizimga kirish</Typography>
    </Container>
  );
};
export default LoginPage;
EOL

cat > src/pages/auth/RegisterPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const RegisterPage: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4">Ro'yxatdan o'tish</Typography>
    </Container>
  );
};
export default RegisterPage;
EOL

# User pages
cat > src/pages/user/ProfilePage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const ProfilePage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Foydalanuvchi profili</Typography>
    </Container>
  );
};
export default ProfilePage;
EOL

cat > src/pages/user/OrdersPage.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const OrdersPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Buyurtmalar</Typography>
    </Container>
  );
};
export default OrdersPage;
EOL

# Admin pages
cat > src/pages/admin/AdminDashboard.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const AdminDashboard: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Admin Dashboard</Typography>
    </Container>
  );
};
export default AdminDashboard;
EOL

cat > src/pages/admin/AdminProducts.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const AdminProducts: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Mahsulotlarni boshqarish</Typography>
    </Container>
  );
};
export default AdminProducts;
EOL

cat > src/pages/admin/AdminOrders.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const AdminOrders: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Buyurtmalarni boshqarish</Typography>
    </Container>
  );
};
export default AdminOrders;
EOL

cat > src/pages/admin/AdminUsers.tsx << 'EOL'
import React from 'react';
import { Container, Typography } from '@mui/material';
const AdminUsers: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Foydalanuvchilarni boshqarish</Typography>
    </Container>
  );
};
export default AdminUsers;
EOL

echo "All pages created successfully!"
