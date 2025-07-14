const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Uzbekistan Payment Providers Configuration
const paymentProviders = {
  click: {
    serviceId: process.env.CLICK_SERVICE_ID || 'test_service_id',
    merchantId: process.env.CLICK_MERCHANT_ID || 'test_merchant',
    secretKey: process.env.CLICK_SECRET_KEY || 'test_secret',
    apiUrl: 'https://api.click.uz/v2/merchant',
    testUrl: 'https://testmerchant.click.uz/v2/merchant'
  },
  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID || 'test_payme_merchant',
    secretKey: process.env.PAYME_SECRET_KEY || 'test_payme_secret', 
    apiUrl: 'https://checkout.paycom.uz/api',
    testUrl: 'https://test.paycom.uz/api'
  },
  uzcard: {
    terminalId: process.env.UZCARD_TERMINAL_ID || 'test_terminal',
    secretKey: process.env.UZCARD_SECRET_KEY || 'test_uzcard_secret',
    apiUrl: 'https://api.uzcard.uz/v1',
    testUrl: 'https://test.uzcard.uz/v1'
  }
};

// In-memory storage for demo (use database in production)
const payments = new Map();
const transactions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    providers: Object.keys(paymentProviders),
    currency: 'UZS'
  });
});

// Generate payment ID
function generatePaymentId() {
  return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Generate transaction signature for Click
function generateClickSignature(params, secretKey) {
  const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  return crypto.createHash('md5').update(sortedParams + secretKey).digest('hex');
}

// Create payment intent
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, currency = 'UZS', provider = 'click', orderId, userId, description } = req.body;

    if (!amount || !orderId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, orderId, userId' 
      });
    }

    if (amount < 1000) {
      return res.status(400).json({ 
        error: 'Minimum payment amount is 1000 UZS' 
      });
    }

    const paymentId = generatePaymentId();
    const payment = {
      id: paymentId,
      amount: parseFloat(amount),
      currency,
      provider,
      orderId,
      userId,
      description: description || `Payment for order ${orderId}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    payments.set(paymentId, payment);

    // Generate provider-specific payment URL
    let paymentUrl = '';
    let providerData = {};

    switch (provider) {
      case 'click':
        const clickParams = {
          service_id: paymentProviders.click.serviceId,
          merchant_id: paymentProviders.click.merchantId,
          amount: amount,
          transaction_param: paymentId,
          return_url: `${req.protocol}://${req.get('host')}/api/payments/callback/click`,
          merchant_trans_id: paymentId
        };
        const clickSignature = generateClickSignature(clickParams, paymentProviders.click.secretKey);
        paymentUrl = `${paymentProviders.click.testUrl}/invoice/create?` + 
          Object.keys(clickParams).map(key => `${key}=${encodeURIComponent(clickParams[key])}`).join('&') +
          `&sign=${clickSignature}`;
        providerData = { clickParams, signature: clickSignature };
        break;

      case 'payme':
        const paymeParams = {
          merchant: paymentProviders.payme.merchantId,
          amount: amount * 100, // Payme uses tiyin (1 UZS = 100 tiyin)
          account: { order_id: orderId, user_id: userId },
          callback: `${req.protocol}://${req.get('host')}/api/payments/callback/payme`
        };
        paymentUrl = `${paymentProviders.payme.testUrl}?` + 
          Object.keys(paymeParams).map(key => `${key}=${encodeURIComponent(JSON.stringify(paymeParams[key]))}`).join('&');
        providerData = paymeParams;
        break;

      case 'uzcard':
        const uzcardParams = {
          terminal_id: paymentProviders.uzcard.terminalId,
          amount: amount,
          order_id: orderId,
          return_url: `${req.protocol}://${req.get('host')}/api/payments/callback/uzcard`
        };
        paymentUrl = `${paymentProviders.uzcard.testUrl}/pay?` + 
          Object.keys(uzcardParams).map(key => `${key}=${encodeURIComponent(uzcardParams[key])}`).join('&');
        providerData = uzcardParams;
        break;

      default:
        return res.status(400).json({ error: 'Unsupported payment provider' });
    }

    payment.paymentUrl = paymentUrl;
    payment.providerData = providerData;
    payments.set(paymentId, payment);

    res.status(201).json({
      success: true,
      paymentId,
      paymentUrl,
      amount,
      currency,
      provider,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Get payment status
app.get('/api/payments/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    provider: payment.provider,
    status: payment.status,
    orderId: payment.orderId,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  });
});

// Click payment callback
app.post('/api/payments/callback/click', (req, res) => {
  try {
    const { click_trans_id, service_id, click_paydoc_id, merchant_trans_id, amount, action, error, error_note, sign_time, sign_string } = req.body;

    const payment = payments.get(merchant_trans_id);
    if (!payment) {
      return res.status(404).json({ error: -5, error_note: 'Transaction not found' });
    }

    if (action === 0) { // Payment preparation
      payment.status = 'processing';
      payment.clickTransId = click_trans_id;
      payment.updatedAt = new Date().toISOString();
      payments.set(payment.id, payment);
      
      res.json({ 
        click_trans_id, 
        merchant_trans_id, 
        merchant_prepare_id: payment.id,
        error: 0,
        error_note: 'Success'
      });
    } else if (action === 1) { // Payment completion
      if (error === 0) {
        payment.status = 'completed';
        payment.clickPaydocId = click_paydoc_id;
        payment.completedAt = new Date().toISOString();
      } else {
        payment.status = 'failed';
        payment.errorNote = error_note;
      }
      payment.updatedAt = new Date().toISOString();
      payments.set(payment.id, payment);

      res.json({
        click_trans_id,
        merchant_trans_id,
        error: 0,
        error_note: 'Success'
      });
    }
  } catch (error) {
    console.error('Click callback error:', error);
    res.status(500).json({ error: -1, error_note: 'Internal error' });
  }
});

// Payme payment callback
app.post('/api/payments/callback/payme', (req, res) => {
  try {
    const { method, params } = req.body;
    
    switch (method) {
      case 'CheckPerformTransaction':
        // Check if transaction can be performed
        const orderId = params.account.order_id;
        res.json({ result: { allow: true } });
        break;

      case 'CreateTransaction':
        // Create transaction
        const transactionId = 'TXN_' + Date.now();
        transactions.set(transactionId, {
          id: transactionId,
          amount: params.amount,
          account: params.account,
          status: 'created',
          createdAt: Date.now()
        });
        res.json({ result: { transaction: transactionId, state: 1 } });
        break;

      case 'PerformTransaction':
        // Perform transaction
        const transaction = transactions.get(params.id);
        if (transaction) {
          transaction.status = 'completed';
          transaction.performedAt = Date.now();
          transactions.set(params.id, transaction);
          res.json({ result: { transaction: params.id, state: 2 } });
        } else {
          res.status(404).json({ error: { code: -31003, message: 'Transaction not found' } });
        }
        break;

      default:
        res.status(400).json({ error: { code: -32601, message: 'Method not found' } });
    }
  } catch (error) {
    console.error('Payme callback error:', error);
    res.status(500).json({ error: { code: -32603, message: 'Internal error' } });
  }
});

// List supported payment methods
app.get('/api/payments/methods', (req, res) => {
  res.json({
    methods: [
      {
        id: 'click',
        name: 'Click',
        description: 'Click.uz - O\'zbekistonning yetakchi to\'lov tizimi',
        logo: 'https://click.uz/logo.png',
        currencies: ['UZS'],
        minAmount: 1000,
        maxAmount: 50000000
      },
      {
        id: 'payme',
        name: 'Payme',
        description: 'Payme.uz - Mobil to\'lovlar tizimi',
        logo: 'https://payme.uz/logo.png', 
        currencies: ['UZS'],
        minAmount: 1000,
        maxAmount: 50000000
      },
      {
        id: 'uzcard',
        name: 'Uzcard',
        description: 'Uzcard - Milliy to\'lov tizimi',
        logo: 'https://uzcard.uz/logo.png',
        currencies: ['UZS'],
        minAmount: 1000,
        maxAmount: 50000000
      },
      {
        id: 'cash',
        name: 'Naqd pul',
        description: 'Yetkazib berish vaqtida to\'lash',
        currencies: ['UZS'],
        minAmount: 1000,
        maxAmount: 10000000
      }
    ]
  });
});

// Get payment statistics
app.get('/api/payments/stats', (req, res) => {
  const allPayments = Array.from(payments.values());
  const stats = {
    total: allPayments.length,
    completed: allPayments.filter(p => p.status === 'completed').length,
    pending: allPayments.filter(p => p.status === 'pending').length,
    failed: allPayments.filter(p => p.status === 'failed').length,
    totalAmount: allPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
    providers: Object.keys(paymentProviders).map(provider => ({
      name: provider,
      count: allPayments.filter(p => p.provider === provider).length
    }))
  };

  res.json(stats);
});

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'UltraMarket Payment Service',
    version: '1.0.0',
    providers: Object.keys(paymentProviders),
    currency: 'UZS',
    endpoints: [
      'GET /health',
      'POST /api/payments/create',
      'GET /api/payments/:paymentId',
      'GET /api/payments/methods',
      'GET /api/payments/stats'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Payment service error:', err);
  res.status(500).json({ error: 'Internal payment service error' });
});

app.listen(PORT, () => {
  console.log(`💳 Payment Service running on port ${PORT}`);
  console.log(`🇺🇿 Uzbekistan Payment Providers: ${Object.keys(paymentProviders).join(', ')}`);
  console.log(`💰 Currency: UZS (O'zbek so'mi)`);
});

module.exports = app;