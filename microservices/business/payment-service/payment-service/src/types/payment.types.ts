/**
 * Payment Types for UltraMarket
 * Professional payment type definitions for Uzbekistan market
 */

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  APELSIN = 'APELSIN',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum Currency {
  UZS = 'UZS',
  USD = 'USD',
  EUR = 'EUR',
  RUB = 'RUB',
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: PaymentMethod;
  isActive: boolean;
  config: Record<string, any>;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  processedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWebhook {
  id: string;
  provider: string;
  event: string;
  payload: Record<string, any>;
  signature: string;
  processed: boolean;
  createdAt: Date;
}

export interface RefundTransaction {
  id: string;
  originalPaymentId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: PaymentStatus;
  processedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentStatistics {
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  successRate: number;
  methodDistribution: Record<PaymentMethod, number>;
  currencyDistribution: Record<Currency, number>;
  dailyStats: Array<{
    date: string;
    count: number;
    amount: number;
  }>;
}

export interface UzbekistanBank {
  name: string;
  code: string;
  account: string;
  mfo: string;
  swift: string;
  isActive: boolean;
}

export interface ClickPaymentData {
  serviceId: string;
  merchantId: string;
  amount: number;
  currency: string;
  merchantTransId: string;
  merchantPrepareId: string;
  returnUrl: string;
  cancelUrl: string;
  description: string;
  signString: string;
}

export interface PaymePaymentData {
  method: string;
  params: {
    amount: number;
    currency: string;
    account: {
      order: string;
    };
    description: string;
    callbackUrl: string;
    callbackTimeout: number;
  };
  signString: string;
}

export interface ApelsinPaymentData {
  merchantId: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  signString: string;
}

export interface BankTransferData {
  bankName: string;
  bankAccount: string;
  mfo: string;
  swift: string;
  transferCode: string;
  amount: number;
  currency: string;
  instructions: string[];
}

export interface CashOnDeliveryData {
  amount: number;
  currency: string;
  requiresConfirmation: boolean;
  deliveryAddress: string;
  customerPhone: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PaymentSecurityConfig {
  enableSignatureValidation: boolean;
  enableAmountValidation: boolean;
  enableCurrencyValidation: boolean;
  maxAmount: number;
  minAmount: number;
  allowedCurrencies: Currency[];
  allowedMethods: PaymentMethod[];
  timeoutMs: number;
  retryAttempts: number;
}

export interface PaymentLogEntry {
  id: string;
  paymentId: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface PaymentAuditTrail {
  id: string;
  paymentId: string;
  action: string;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  changes: Record<string, any>;
  timestamp: Date;
}