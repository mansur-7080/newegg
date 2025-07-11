/**
 * Order utility functions for UltraMarket Order Service
 */

import crypto from 'crypto';

/**
 * Generate a unique order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  return `ORD-${date}-${timestamp.slice(-6)}-${random.toUpperCase()}`;
}

/**
 * Calculate order totals including tax, shipping, and discounts
 */
export function calculateOrderTotals(
  items: any[], 
  shipping: any, 
  discount: number = 0
): any {
  const subtotal = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.1; // 10% tax rate
  const shippingCost = shipping?.method === 'free' ? 0 : (shipping?.cost || 5.99);
  const total = subtotal + tax + shippingCost - discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: Math.round(shippingCost * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: 'USD'
  };
}

/**
 * Generate a summary of the order
 */
export function generateOrderSummary(order: any): any {
  const itemCount = order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const uniqueProducts = order.items.length;
  
  return {
    orderNumber: order.orderNumber,
    itemCount,
    uniqueProducts,
    total: formatCurrency(order.totals.total, order.totals.currency),
    status: order.status,
    createdAt: order.createdAt,
    estimatedDelivery: calculateEstimatedDelivery(order.createdAt, order.shipping?.method)
  };
}

/**
 * Validate order status transition
 */
export function validateOrderStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered', 'cancelled'],
    'delivered': ['refunded'],
    'cancelled': [],
    'refunded': []
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Check if order can be cancelled
 */
export function canCancelOrder(status: string): boolean {
  const cancellableStatuses = ['pending', 'confirmed'];
  return cancellableStatuses.includes(status);
}

/**
 * Calculate estimated delivery date
 */
export function calculateEstimatedDelivery(orderDate: Date, shippingMethod?: string): Date {
  const estimatedDate = new Date(orderDate);
  
  switch (shippingMethod) {
    case 'express':
      estimatedDate.setDate(estimatedDate.getDate() + 2); // 2 business days
      break;
    case 'priority':
      estimatedDate.setDate(estimatedDate.getDate() + 3); // 3 business days
      break;
    case 'standard':
    default:
      estimatedDate.setDate(estimatedDate.getDate() + 5); // 5 business days
      break;
  }
  
  return estimatedDate;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

/**
 * Generate tracking URL for shipping carriers
 */
export function generateTrackingUrl(trackingNumber: string, shippingMethod?: string): string {
  const carriers: Record<string, string> = {
    'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    'standard': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'express': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'priority': `https://www.ups.com/track?tracknum=${trackingNumber}`
  };

  return carriers[(shippingMethod?.toLowerCase() || 'standard')] || carriers.standard;
}

/**
 * Validate order data
 */
export function validateOrderData(orderData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }
  
  if (!orderData.customer) {
    errors.push('Customer information is required');
  }
  
  if (!orderData.shipping?.address) {
    errors.push('Shipping address is required');
  }
  
  if (!orderData.billing?.address) {
    errors.push('Billing address is required');
  }
  
  // Validate items
  if (orderData.items) {
    orderData.items.forEach((item: any, index: number) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.productName) {
        errors.push(`Item ${index + 1}: Product name is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Valid unit price is required`);
      }
      if (!item.totalPrice || item.totalPrice < 0) {
        errors.push(`Item ${index + 1}: Valid total price is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate order statistics
 */
export function calculateOrderStats(orders: any[]): any {
  if (orders.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusBreakdown: {},
      topProducts: []
    };
  }

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.totals.total, 0);
  const averageOrderValue = totalRevenue / totalOrders;

  // Status breakdown
  const statusBreakdown = orders.reduce((acc: any, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  // Top products
  const productCounts: Record<string, number> = {};
  orders.forEach((order: any) => {
    order.items.forEach((item: any) => {
      const productKey = `${item.productName} (${item.sku})`;
      productCounts[productKey] = (productCounts[productKey] || 0) + item.quantity;
    });
  });

  const topProducts = Object.entries(productCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([product, count]) => ({ product, count }));

  return {
    totalOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    statusBreakdown,
    topProducts
  };
}

/**
 * Generate order hash for caching
 */
export function generateOrderHash(orderId: string, lastModified: Date): string {
  const data = `${orderId}-${lastModified.getTime()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Check if order is eligible for refund
 */
export function isEligibleForRefund(order: any): boolean {
  const refundableStatuses = ['delivered', 'shipped'];
  const refundWindowDays = 30;
  
  if (!refundableStatuses.includes(order.status)) {
    return false;
  }
  
  const orderDate = new Date(order.createdAt);
  const now = new Date();
  const daysSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceOrder <= refundWindowDays;
}

/**
 * Calculate refund amount
 */
export function calculateRefundAmount(order: any, refundType: 'full' | 'partial' = 'full', partialAmount?: number): number {
  if (refundType === 'partial' && partialAmount) {
    return Math.min(partialAmount, order.totals.total);
  }
  
  return order.totals.total;
}

/**
 * Format order for API response
 */
export function formatOrderForResponse(order: any, includeHistory: boolean = false): any {
  const formatted = {
    id: order._id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    customer: order.customer,
    items: order.items,
    totals: {
      ...order.totals,
      formatted: formatCurrency(order.totals.total, order.totals.currency)
    },
    shipping: order.shipping,
    billing: order.billing,
    payment: order.payment,
    status: order.status,
    notes: order.notes,
    metadata: order.metadata,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    confirmedAt: order.confirmedAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    summary: generateOrderSummary(order)
  };

  if (includeHistory) {
    (formatted as any).statusHistory = order.statusHistory;
  }

  return formatted;
}

/**
 * Get order status color for UI
 */
export function getOrderStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': '#f59e0b', // amber
    'confirmed': '#3b82f6', // blue
    'processing': '#8b5cf6', // purple
    'shipped': '#06b6d4', // cyan
    'delivered': '#10b981', // green
    'cancelled': '#ef4444', // red
    'refunded': '#6b7280' // gray
  };

  return statusColors[status] || '#6b7280';
}

/**
 * Get order status label for UI
 */
export function getOrderStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'processing': 'Processing',
    'shipped': 'Shipped',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };

  return statusLabels[status] || 'Unknown';
}