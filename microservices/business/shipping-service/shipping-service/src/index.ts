/**
 * UltraMarket Professional Shipping Service
 * Real shipping providers integration for Uzbekistan market
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3011;
const prisma = new PrismaClient();

// Types
interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  days: string;
  logo: string;
  regions: string[];
  description: string;
  available: boolean;
}

interface ShippingProvider {
  name: string;
  apiUrl?: string;
  apiKey?: string;
  baseRate: number;
  regions: string[];
  deliveryDays: string;
}

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use(express.json());

// Uzbekistan shipping providers configuration
const SHIPPING_PROVIDERS: Record<string, ShippingProvider> = {
  uzpost: {
    name: 'Uzbekiston Post',
    apiUrl: 'https://api.uzpost.uz/v1',
    apiKey: process.env.UZPOST_API_KEY,
    baseRate: 10000, // UZS
    regions: ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg\'ona', 'Namangan', 'Qashqadaryo', 'Surxondaryo', 'Sirdaryo', 'Jizzax', 'Navoiy', 'Xorazm', 'Qoraqalpog\'iston'],
    deliveryDays: '3-7',
  },
  express24: {
    name: 'Express24',
    apiUrl: 'https://api.express24.uz/v1',
    apiKey: process.env.EXPRESS24_API_KEY,
    baseRate: 15000, // UZS
    regions: ['Toshkent', 'Samarqand', 'Buxoro'],
    deliveryDays: '1-2',
  },
  yandex: {
    name: 'Yandex Delivery',
    apiUrl: 'https://api.yandex.uz/delivery/v1',
    apiKey: process.env.YANDEX_API_KEY,
    baseRate: 20000, // UZS
    regions: ['Toshkent', 'Samarqand'],
    deliveryDays: '1-3',
  },
  local: {
    name: 'Mahalliy Kuryer',
    baseRate: 8000, // UZS
    regions: ['Toshkent'],
    deliveryDays: '2-4',
  },
};

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'shipping-service',
    timestamp: new Date().toISOString(),
    providers: Object.keys(SHIPPING_PROVIDERS),
  });
});

// Get shipping rates for Uzbekistan regions
app.get('/api/v1/shipping/rates', async (req, res) => {
  try {
    const { region, weight = 1, distance = 0 } = req.query;
    const weightNum = Number(weight);
    const distanceNum = Number(distance);

    const rates: ShippingRate[] = [];

    for (const [providerId, provider] of Object.entries(SHIPPING_PROVIDERS)) {
      // Check if provider serves this region
      if (!provider.regions.includes(region as string) && providerId !== 'local') {
        continue;
      }

      // Calculate rate based on weight and distance
      let rate = provider.baseRate;
      
      // Weight-based pricing
      if (weightNum > 5) {
        rate += Math.floor(weightNum / 5) * 5000;
      }
      
      // Distance-based pricing
      if (distanceNum > 50) {
        rate += Math.floor(distanceNum / 50) * 3000;
      }

      // Regional pricing adjustments
      if (region !== 'Toshkent') {
        rate += 5000; // Additional cost for regions
      }

      rates.push({
        id: providerId,
        name: provider.name,
        price: rate,
        currency: 'UZS',
        days: provider.deliveryDays,
        logo: `/images/delivery/${providerId}.png`,
        regions: provider.regions,
        description: `${provider.name} - Ishonchli yetkazib berish`,
        available: true,
      });
    }

    // Save rate calculation to database
    await prisma.shippingRateCalculation.create({
      data: {
        region: region as string,
        weight: weightNum,
        distance: distanceNum,
        rates: JSON.stringify(rates),
        timestamp: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Shipping rates calculated successfully',
      data: rates,
    });
  } catch (error) {
    console.error('Error calculating shipping rates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping rates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create shipping order
app.post('/api/v1/shipping/create', async (req, res) => {
  try {
    const {
      orderId,
      providerId,
      recipientName,
      recipientPhone,
      address,
      region,
      weight,
      value,
      paymentMethod = 'prepaid',
    } = req.body;

    // Validate provider
    if (!SHIPPING_PROVIDERS[providerId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipping provider',
      });
    }

    // Generate tracking number
    const trackingNumber = generateTrackingNumber(providerId);

    // Create shipping order in database
    const shippingOrder = await prisma.shippingOrder.create({
      data: {
        orderId,
        providerId,
        trackingNumber,
        recipientName,
        recipientPhone,
        address,
        region,
        weight: Number(weight),
        value: Number(value),
        paymentMethod,
        status: 'created',
        estimatedDelivery: calculateEstimatedDelivery(providerId),
        createdAt: new Date(),
      },
    });

    // Create initial tracking event
    await prisma.shippingTracking.create({
      data: {
        trackingNumber,
        status: 'Qabul qilindi',
        location: 'Toshkent',
        description: 'Buyurtma qabul qilindi va qayta ishlash uchun tayyor',
        timestamp: new Date(),
      },
    });

    // Send to shipping provider API (if available)
    if (SHIPPING_PROVIDERS[providerId].apiUrl) {
      try {
        await createShippingWithProvider(providerId, shippingOrder);
      } catch (apiError) {
        console.error(`API error for provider ${providerId}:`, apiError);
        // Continue with local tracking even if API fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Shipping order created successfully',
      data: {
        trackingNumber,
        orderId,
        provider: SHIPPING_PROVIDERS[providerId].name,
        status: 'created',
        estimatedDelivery: shippingOrder.estimatedDelivery,
      },
    });
  } catch (error) {
    console.error('Error creating shipping order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shipping order',
      error: error.message,
    });
  }
});

// Track shipment
app.get('/api/v1/shipping/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    // Get shipping order
    const shippingOrder = await prisma.shippingOrder.findUnique({
      where: { trackingNumber },
    });

    if (!shippingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Tracking number not found',
      });
    }

    // Get tracking history
    const trackingHistory = await prisma.shippingTracking.findMany({
      where: { trackingNumber },
      orderBy: { timestamp: 'desc' },
    });

    // Update tracking from provider API if available
    const provider = SHIPPING_PROVIDERS[shippingOrder.providerId];
    if (provider.apiUrl) {
      try {
        await updateTrackingFromProvider(shippingOrder.providerId, trackingNumber);
      } catch (apiError) {
        console.error(`API tracking error for ${shippingOrder.providerId}:`, apiError);
      }
    }

    res.json({
      success: true,
      message: 'Tracking information retrieved successfully',
      data: {
        trackingNumber,
        orderId: shippingOrder.orderId,
        provider: provider.name,
        status: shippingOrder.status,
        estimatedDelivery: shippingOrder.estimatedDelivery,
        recipient: {
          name: shippingOrder.recipientName,
          phone: shippingOrder.recipientPhone,
          address: shippingOrder.address,
          region: shippingOrder.region,
        },
        tracking: trackingHistory.map(event => ({
          date: event.timestamp,
          status: event.status,
          location: event.location,
          description: event.description,
        })),
      },
    });
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track shipment',
      error: error.message,
    });
  }
});

// Update shipment status
app.put('/api/v1/shipping/:trackingNumber/status', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, location, description } = req.body;

    // Update shipping order status
    await prisma.shippingOrder.update({
      where: { trackingNumber },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Add tracking event
    await prisma.shippingTracking.create({
      data: {
        trackingNumber,
        status,
        location,
        description,
        timestamp: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Shipment status updated successfully',
      data: {
        trackingNumber,
        status,
        location,
        description,
      },
    });
  } catch (error) {
    console.error('Error updating shipment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shipment status',
      error: error.message,
    });
  }
});

// Helper functions
function generateTrackingNumber(providerId: string): string {
  const prefix = {
    uzpost: 'UZ',
    express24: 'EX24',
    yandex: 'YD',
    local: 'LOC',
  }[providerId] || 'ULT';

  return `${prefix}${Date.now().toString().slice(-8)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

function calculateEstimatedDelivery(providerId: string): Date {
  const provider = SHIPPING_PROVIDERS[providerId];
  const days = parseInt(provider.deliveryDays.split('-')[1]) || 3;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function createShippingWithProvider(providerId: string, order: any) {
  const provider = SHIPPING_PROVIDERS[providerId];
  
  if (!provider.apiUrl || !provider.apiKey) {
    throw new Error(`API configuration missing for provider ${providerId}`);
  }

  const response = await axios.post(`${provider.apiUrl}/orders`, {
    tracking_number: order.trackingNumber,
    recipient: {
      name: order.recipientName,
      phone: order.recipientPhone,
      address: order.address,
      region: order.region,
    },
    package: {
      weight: order.weight,
      value: order.value,
    },
    payment_method: order.paymentMethod,
  }, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function updateTrackingFromProvider(providerId: string, trackingNumber: string) {
  const provider = SHIPPING_PROVIDERS[providerId];
  
  if (!provider.apiUrl || !provider.apiKey) {
    return;
  }

  const response = await axios.get(`${provider.apiUrl}/tracking/${trackingNumber}`, {
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
    },
  });

  // Update local tracking with provider data
  if (response.data.events) {
    for (const event of response.data.events) {
      await prisma.shippingTracking.upsert({
        where: {
          trackingNumber_timestamp: {
            trackingNumber,
            timestamp: new Date(event.timestamp),
          },
        },
        update: {},
        create: {
          trackingNumber,
          status: event.status,
          location: event.location,
          description: event.description,
          timestamp: new Date(event.timestamp),
        },
      });
    }
  }
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ Professional Shipping Service running on port ${PORT}`);
  console.log(`🚚 Uzbekistan shipping providers: ${Object.keys(SHIPPING_PROVIDERS).join(', ')}`);
});

export default app;
