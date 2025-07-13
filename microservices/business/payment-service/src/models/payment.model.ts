/**
 * Payment Service Database Models
 * Professional payment transaction models for UltraMarket
 */

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  
  // Provider specific fields
  providerTransactionId?: string;
  providerMerchantId?: string;
  providerPrepareId?: string;
  
  // Transaction details
  description?: string;
  metadata?: Record<string, any>;
  
  // URLs
  returnUrl?: string;
  cancelUrl?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  
  // Error information
  errorCode?: string;
  errorMessage?: string;
  
  // Refund information
  refundAmount?: number;
  refundedAt?: Date;
  refundReason?: string;
}

export interface PaymentWebhook {
  id: string;
  transactionId: string;
  provider: PaymentProvider;
  action: WebhookAction;
  payload: Record<string, any>;
  signature?: string;
  verified: boolean;
  processed: boolean;
  createdAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: PaymentMethodType;
  provider: PaymentProvider;
  
  // Card details (encrypted)
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  
  // Bank details
  bankName?: string;
  bankAccountLast4?: string;
  
  // Provider specific
  providerMethodId?: string;
  providerCustomerId?: string;
  
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRefund {
  id: string;
  transactionId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  providerRefundId?: string;
  createdAt: Date;
  processedAt?: Date;
  errorMessage?: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded'
}

export enum PaymentProvider {
  CLICK = 'click',
  PAYME = 'payme',
  APELSIN = 'apelsin',
  UZCARD = 'uzcard',
  HUMO = 'humo',
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_DELIVERY = 'cash_on_delivery'
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  DIGITAL_WALLET = 'digital_wallet',
  CASH = 'cash'
}

export enum WebhookAction {
  PREPARE = 'prepare',
  COMPLETE = 'complete',
  CANCEL = 'cancel',
  REFUND = 'refund',
  STATUS_UPDATE = 'status_update'
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface CreatePaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentProvider;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string;
  qrCode?: string;
  instructions?: string;
  expiresAt?: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}