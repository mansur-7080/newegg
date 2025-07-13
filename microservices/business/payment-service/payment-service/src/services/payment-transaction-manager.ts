import { logger } from '../utils/logger';

// Enhanced logger for payment transactions
const paymentLogger = {
  info: (message: string, meta?: any) => console.log(`[PAYMENT-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[PAYMENT-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[PAYMENT-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  gatewayResponse?: any;
  fraudScore?: number;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface PaymentVerification {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fraudIndicators: FraudIndicator[];
  riskScore: number;
}

export interface FraudIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  score: number;
}

export interface TransactionRollback {
  success: boolean;
  transactionId: string;
  originalAmount: number;
  refundedAmount: number;
  fees: number;
  errors: string[];
}

export interface PaymentReconciliation {
  totalTransactions: number;
  totalAmount: number;
  discrepancies: ReconciliationDiscrepancy[];
  summary: {
    completed: number;
    failed: number;
    pending: number;
    refunded: number;
  };
}

export interface ReconciliationDiscrepancy {
  transactionId: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  type: 'missing' | 'excess' | 'mismatch';
}

// Mock payment gateway for demonstration
class MockPaymentGateway {
  private transactions: PaymentTransaction[] = [];

  async processPayment(paymentData: any): Promise<{
    success: boolean;
    transactionId: string;
    gatewayResponse: any;
    fraudScore: number;
  }> {
    const transactionId = `gateway_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate payment processing
    const success = Math.random() > 0.1; // 90% success rate
    const fraudScore = Math.random() * 100;
    
    const transaction: PaymentTransaction = {
      id: transactionId,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      paymentMethod: paymentData.paymentMethod,
      status: success ? 'completed' : 'failed',
      gatewayResponse: {
        code: success ? 'SUCCESS' : 'FAILED',
        message: success ? 'Payment processed successfully' : 'Payment failed',
        reference: `ref_${transactionId}`,
      },
      fraudScore,
      riskLevel: fraudScore > 70 ? 'high' : fraudScore > 30 ? 'medium' : 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: paymentData.metadata,
    };

    this.transactions.push(transaction);

    return {
      success,
      transactionId,
      gatewayResponse: transaction.gatewayResponse,
      fraudScore,
    };
  }

  async refundPayment(transactionId: string, amount: number): Promise<{
    success: boolean;
    refundId: string;
    gatewayResponse: any;
  }> {
    const transaction = this.transactions.find(t => t.id === transactionId);
    
    if (!transaction) {
      return {
        success: false,
        refundId: '',
        gatewayResponse: { code: 'NOT_FOUND', message: 'Transaction not found' },
      };
    }

    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const success = Math.random() > 0.05; // 95% refund success rate

    return {
      success,
      refundId,
      gatewayResponse: {
        code: success ? 'REFUND_SUCCESS' : 'REFUND_FAILED',
        message: success ? 'Refund processed successfully' : 'Refund failed',
        reference: `refund_ref_${refundId}`,
      },
    };
  }

  async getTransaction(transactionId: string): Promise<PaymentTransaction | null> {
    return this.transactions.find(t => t.id === transactionId) || null;
  }

  async getAllTransactions(): Promise<PaymentTransaction[]> {
    return this.transactions;
  }
}

export class PaymentTransactionManager {
  private gateway: MockPaymentGateway;
  private transactions: Map<string, PaymentTransaction> = new Map();
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.gateway = new MockPaymentGateway();
  }

  /**
   * ENHANCED: Process payment with comprehensive validation and fraud detection
   */
  async processPayment(paymentData: {
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    customerData: any;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    errors: string[];
    warnings: string[];
    fraudScore?: number;
    riskLevel?: string;
  }> {
    try {
      // 1. Validate payment data
      const validation = this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings,
        };
      }

      // 2. Fraud detection
      const fraudCheck = await this.detectFraud(paymentData);
      if (fraudCheck.riskScore > 80) {
        paymentLogger.warn('High fraud risk detected', {
          orderId: paymentData.orderId,
          riskScore: fraudCheck.riskScore,
          indicators: fraudCheck.fraudIndicators,
        });

        return {
          success: false,
          errors: ['Payment rejected due to high fraud risk'],
          warnings: fraudCheck.fraudIndicators.map(i => i.description),
          fraudScore: fraudCheck.riskScore,
          riskLevel: 'high',
        };
      }

      // 3. Process payment with retry logic
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const result = await this.gateway.processPayment(paymentData);
          
          if (result.success) {
            const transaction: PaymentTransaction = {
              id: result.transactionId,
              orderId: paymentData.orderId,
              amount: paymentData.amount,
              currency: paymentData.currency,
              paymentMethod: paymentData.paymentMethod,
              status: 'completed',
              gatewayResponse: result.gatewayResponse,
              fraudScore: result.fraudScore,
              riskLevel: result.fraudScore > 70 ? 'high' : result.fraudScore > 30 ? 'medium' : 'low',
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: paymentData.metadata,
            };

            this.transactions.set(result.transactionId, transaction);

            paymentLogger.info('Payment processed successfully', {
              transactionId: result.transactionId,
              orderId: paymentData.orderId,
              amount: paymentData.amount,
              fraudScore: result.fraudScore,
            });

            return {
              success: true,
              transactionId: result.transactionId,
              errors: [],
              warnings: fraudCheck.fraudIndicators.map(i => i.description),
              fraudScore: result.fraudScore,
              riskLevel: transaction.riskLevel,
            };
          } else {
            throw new Error('Payment gateway returned failure');
          }
        } catch (error) {
          lastError = error as Error;
          paymentLogger.warn(`Payment attempt ${attempt} failed`, {
            orderId: paymentData.orderId,
            error: lastError.message,
            attempt,
          });

          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelay * attempt);
          }
        }
      }

      // All retries failed
      paymentLogger.error('Payment processing failed after all retries', {
        orderId: paymentData.orderId,
        error: lastError?.message,
        attempts: this.maxRetries,
      });

      return {
        success: false,
        errors: [`Payment processing failed: ${lastError?.message}`],
        warnings: [],
      };

    } catch (error) {
      paymentLogger.error('Payment processing error', {
        orderId: paymentData.orderId,
        error,
      });

      return {
        success: false,
        errors: ['Payment processing failed due to system error'],
        warnings: [],
      };
    }
  }

  /**
   * ENHANCED: Rollback payment transaction
   */
  async rollbackTransaction(transactionId: string, reason: string): Promise<TransactionRollback> {
    const result: TransactionRollback = {
      success: false,
      transactionId,
      originalAmount: 0,
      refundedAmount: 0,
      fees: 0,
      errors: [],
    };

    try {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        result.errors.push('Transaction not found');
        return result;
      }

      if (transaction.status !== 'completed') {
        result.errors.push('Transaction is not in completed status');
        return result;
      }

      result.originalAmount = transaction.amount;

      // Process refund
      const refundResult = await this.gateway.refundPayment(transactionId, transaction.amount);
      
      if (refundResult.success) {
        // Update transaction status
        transaction.status = 'refunded';
        transaction.updatedAt = new Date();
        transaction.metadata = {
          ...transaction.metadata,
          refundReason: reason,
          refundId: refundResult.refundId,
        };

        result.success = true;
        result.refundedAmount = transaction.amount;
        result.fees = this.calculateRefundFees(transaction.amount);

        paymentLogger.info('Payment rollback completed', {
          transactionId,
          originalAmount: result.originalAmount,
          refundedAmount: result.refundedAmount,
          reason,
        });
      } else {
        result.errors.push('Refund processing failed');
        paymentLogger.error('Payment rollback failed', {
          transactionId,
          error: refundResult.gatewayResponse.message,
        });
      }

      return result;
    } catch (error) {
      paymentLogger.error('Payment rollback error', {
        transactionId,
        error,
      });

      result.errors.push('Rollback failed due to system error');
      return result;
    }
  }

  /**
   * ENHANCED: Verify payment transaction
   */
  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    const result: PaymentVerification = {
      isValid: false,
      errors: [],
      warnings: [],
      fraudIndicators: [],
      riskScore: 0,
    };

    try {
      const transaction = this.transactions.get(transactionId);
      if (!transaction) {
        result.errors.push('Transaction not found');
        return result;
      }

      // Check transaction status
      if (transaction.status !== 'completed') {
        result.errors.push(`Transaction status is ${transaction.status}, expected completed`);
        return result;
      }

      // Verify with gateway
      const gatewayTransaction = await this.gateway.getTransaction(transactionId);
      if (!gatewayTransaction) {
        result.errors.push('Transaction not found in payment gateway');
        return result;
      }

      // Compare amounts
      if (gatewayTransaction.amount !== transaction.amount) {
        result.errors.push('Amount mismatch between local and gateway records');
      }

      // Check fraud indicators
      if (transaction.fraudScore && transaction.fraudScore > 50) {
        result.fraudIndicators.push({
          type: 'HIGH_FRAUD_SCORE',
          severity: 'high',
          description: `High fraud score detected: ${transaction.fraudScore}`,
          score: transaction.fraudScore,
        });
      }

      if (transaction.amount > 1000) {
        result.fraudIndicators.push({
          type: 'HIGH_AMOUNT',
          severity: 'medium',
          description: `High amount transaction: $${transaction.amount}`,
          score: 30,
        });
      }

      // Calculate overall risk score
      result.riskScore = this.calculateRiskScore(transaction, result.fraudIndicators);
      result.isValid = result.errors.length === 0 && result.riskScore < 70;

      paymentLogger.info('Payment verification completed', {
        transactionId,
        isValid: result.isValid,
        riskScore: result.riskScore,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
      });

      return result;
    } catch (error) {
      paymentLogger.error('Payment verification failed', {
        transactionId,
        error,
      });

      result.errors.push('Verification failed due to system error');
      return result;
    }
  }

  /**
   * ENHANCED: Reconcile payments
   */
  async reconcilePayments(startDate: Date, endDate: Date): Promise<PaymentReconciliation> {
    const result: PaymentReconciliation = {
      totalTransactions: 0,
      totalAmount: 0,
      discrepancies: [],
      summary: {
        completed: 0,
        failed: 0,
        pending: 0,
        refunded: 0,
      },
    };

    try {
      // Get local transactions
      const localTransactions = Array.from(this.transactions.values()).filter(
        t => t.createdAt >= startDate && t.createdAt <= endDate
      );

      // Get gateway transactions
      const gatewayTransactions = await this.gateway.getAllTransactions();

      // Calculate local summary
      for (const transaction of localTransactions) {
        result.totalTransactions++;
        result.totalAmount += transaction.amount;

        switch (transaction.status) {
          case 'completed':
            result.summary.completed++;
            break;
          case 'failed':
            result.summary.failed++;
            break;
          case 'pending':
            result.summary.pending++;
            break;
          case 'refunded':
            result.summary.refunded++;
            break;
        }
      }

      // Find discrepancies
      for (const localTx of localTransactions) {
        const gatewayTx = gatewayTransactions.find(gt => gt.id === localTx.id);
        
        if (!gatewayTx) {
          result.discrepancies.push({
            transactionId: localTx.id,
            expectedAmount: localTx.amount,
            actualAmount: 0,
            difference: localTx.amount,
            type: 'missing',
          });
        } else if (gatewayTx.amount !== localTx.amount) {
          result.discrepancies.push({
            transactionId: localTx.id,
            expectedAmount: localTx.amount,
            actualAmount: gatewayTx.amount,
            difference: Math.abs(localTx.amount - gatewayTx.amount),
            type: 'mismatch',
          });
        }
      }

      paymentLogger.info('Payment reconciliation completed', {
        totalTransactions: result.totalTransactions,
        totalAmount: result.totalAmount,
        discrepancyCount: result.discrepancies.length,
        dateRange: { startDate, endDate },
      });

      return result;
    } catch (error) {
      paymentLogger.error('Payment reconciliation failed', { error });
      return result;
    }
  }

  /**
   * Validate payment data
   */
  private validatePaymentData(paymentData: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!paymentData.orderId) {
      errors.push('Order ID is required');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Amount validation
    if (paymentData.amount > 10000) {
      warnings.push('High amount transaction detected');
    }

    if (paymentData.amount < 1) {
      warnings.push('Very low amount transaction');
    }

    // Currency validation
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY'];
    if (!validCurrencies.includes(paymentData.currency)) {
      errors.push('Invalid currency');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect fraud patterns
   */
  private async detectFraud(paymentData: any): Promise<{
    riskScore: number;
    fraudIndicators: FraudIndicator[];
  }> {
    const indicators: FraudIndicator[] = [];
    let riskScore = 0;

    // Check for suspicious patterns
    if (paymentData.amount > 5000) {
      indicators.push({
        type: 'HIGH_AMOUNT',
        severity: 'medium',
        description: 'Transaction amount exceeds $5,000',
        score: 30,
      });
      riskScore += 30;
    }

    if (paymentData.paymentMethod === 'credit_card' && paymentData.amount > 1000) {
      indicators.push({
        type: 'HIGH_CREDIT_AMOUNT',
        severity: 'medium',
        description: 'High credit card transaction',
        score: 20,
      });
      riskScore += 20;
    }

    // Check customer data for suspicious patterns
    if (paymentData.customerData?.isNewCustomer && paymentData.amount > 500) {
      indicators.push({
        type: 'NEW_CUSTOMER_HIGH_AMOUNT',
        severity: 'high',
        description: 'New customer with high amount transaction',
        score: 50,
      });
      riskScore += 50;
    }

    // Time-based checks
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      indicators.push({
        type: 'OFF_HOURS',
        severity: 'low',
        description: 'Transaction outside business hours',
        score: 10,
      });
      riskScore += 10;
    }

    return {
      riskScore: Math.min(riskScore, 100),
      fraudIndicators: indicators,
    };
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(transaction: PaymentTransaction, indicators: FraudIndicator[]): number {
    let score = transaction.fraudScore || 0;

    // Add indicator scores
    for (const indicator of indicators) {
      score += indicator.score;
    }

    // Additional risk factors
    if (transaction.amount > 1000) {
      score += 20;
    }

    if (transaction.paymentMethod === 'credit_card') {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate refund fees
   */
  private calculateRefundFees(amount: number): number {
    // Simple fee calculation: 2.9% + $0.30
    return Math.max(0.30, amount * 0.029);
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const paymentTransactionManager = new PaymentTransactionManager();