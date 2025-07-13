/**
 * Order Service Interface
 * Interface for communicating with Order Service
 */

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface IOrderService {
  getOrderById(orderId: string): Promise<Order | null>;
  getOrderByTransactionId(transactionId: string): Promise<Order | null>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>;
  updateOrderPaymentStatus(orderId: string, paymentStatus: string, transactionId: string): Promise<Order>;
}