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
