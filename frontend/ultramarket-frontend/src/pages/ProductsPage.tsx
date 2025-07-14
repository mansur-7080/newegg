import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ProductsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Barcha mahsulotlar
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Typography>Mahsulotlar ro'yxati tez orada qo'shiladi...</Typography>
      </Box>
    </Container>
  );
};

export default ProductsPage;