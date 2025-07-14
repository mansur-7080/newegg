/**
 * Payment Model for UltraMarket
 * Professional MongoDB schema for payment transactions
 */

import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod, PaymentStatus, Currency } from '../types/payment.types';

export interface IPayment extends Document {
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  processedAt?: Date;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  refundedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: Object.values(Currency),
      default: Currency.UZS,
    },
    method: {
      type: String,
      required: true,
      enum: Object.values(PaymentMethod),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    transactionId: {
      type: String,
      trim: true,
      sparse: true,
    },
    processedAt: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    failureReason: {
      type: String,
      trim: true,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

// Indexes for better performance
PaymentSchema.index({ orderId: 1, createdAt: -1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ method: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ createdAt: -1 });

// Virtual for total amount (including refunds)
PaymentSchema.virtual('netAmount').get(function (this: IPayment) {
  return this.amount - this.refundedAmount;
});

// Virtual for refund status
PaymentSchema.virtual('refundStatus').get(function (this: IPayment) {
  if (this.refundedAmount === 0) return 'NO_REFUND';
  if (this.refundedAmount >= this.amount) return 'FULLY_REFUNDED';
  return 'PARTIALLY_REFUNDED';
});

// Pre-save middleware for validation
PaymentSchema.pre('save', function (next) {
  // Validate amount limits for Uzbekistan
  if (this.amount < 1000) {
    return next(new Error('Amount must be at least 1000 UZS'));
  }
  
  if (this.amount > 100000000) {
    return next(new Error('Amount exceeds maximum limit of 100M UZS'));
  }

  // Validate refunded amount
  if (this.refundedAmount > this.amount) {
    return next(new Error('Refunded amount cannot exceed original amount'));
  }

  // Update status based on refunded amount
  if (this.refundedAmount > 0) {
    if (this.refundedAmount >= this.amount) {
      this.status = PaymentStatus.REFUNDED;
    } else if (this.status === PaymentStatus.COMPLETED) {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }
  }

  next();
});

// Static methods
PaymentSchema.statics = {
  /**
   * Find payments by order ID
   */
  async findByOrderId(orderId: string) {
    return this.find({ orderId }).sort({ createdAt: -1 });
  },

  /**
   * Find payments by user ID
   */
  async findByUserId(userId: string, options?: { limit?: number; offset?: number }) {
    const query = this.find({ userId }).sort({ createdAt: -1 });
    
    if (options?.limit) {
      query.limit(options.limit);
    }
    
    if (options?.offset) {
      query.skip(options.offset);
    }
    
    return query.exec();
  },

  /**
   * Find payments by status
   */
  async findByStatus(status: PaymentStatus, options?: { limit?: number; offset?: number }) {
    const query = this.find({ status }).sort({ createdAt: -1 });
    
    if (options?.limit) {
      query.limit(options.limit);
    }
    
    if (options?.offset) {
      query.skip(options.offset);
    }
    
    return query.exec();
  },

  /**
   * Find payments by method
   */
  async findByMethod(method: PaymentMethod, options?: { limit?: number; offset?: number }) {
    const query = this.find({ method }).sort({ createdAt: -1 });
    
    if (options?.limit) {
      query.limit(options.limit);
    }
    
    if (options?.offset) {
      query.skip(options.offset);
    }
    
    return query.exec();
  },

  /**
   * Get payment statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const matchStage: any = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.COMPLETED] }, 1, 0]
            }
          },
          methodDistribution: {
            $push: '$method'
          },
          currencyDistribution: {
            $push: '$currency'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalPayments: 1,
          totalAmount: 1,
          averageAmount: { $round: ['$averageAmount', 2] },
          successRate: {
            $cond: [
              { $eq: ['$totalPayments', 0] },
              0,
              { $divide: ['$successCount', '$totalPayments'] }
            ]
          },
          methodDistribution: 1,
          currencyDistribution: 1
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {
      totalPayments: 0,
      totalAmount: 0,
      averageAmount: 0,
      successRate: 0,
      methodDistribution: [],
      currencyDistribution: []
    };
  },

  /**
   * Get daily payment statistics
   */
  async getDailyStatistics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    return this.aggregate(pipeline);
  },

  /**
   * Get payment methods distribution
   */
  async getMethodDistribution() {
    const pipeline = [
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    return this.aggregate(pipeline);
  },

  /**
   * Get currency distribution
   */
  async getCurrencyDistribution() {
    const pipeline = [
      {
        $group: {
          _id: '$currency',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    return this.aggregate(pipeline);
  },

  /**
   * Find failed payments
   */
  async findFailedPayments(options?: { limit?: number; offset?: number }) {
    const query = this.find({
      status: { $in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] }
    }).sort({ createdAt: -1 });
    
    if (options?.limit) {
      query.limit(options.limit);
    }
    
    if (options?.offset) {
      query.skip(options.offset);
    }
    
    return query.exec();
  },

  /**
   * Find pending payments older than specified hours
   */
  async findStalePendingPayments(hours: number = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return this.find({
      status: PaymentStatus.PENDING,
      createdAt: { $lt: cutoffDate }
    }).sort({ createdAt: -1 });
  },

  /**
   * Update payment status
   */
  async updateStatus(paymentId: string, status: PaymentStatus, metadata?: Record<string, any>) {
    const updateData: any = { status };
    
    if (status === PaymentStatus.COMPLETED) {
      updateData.processedAt = new Date();
    }
    
    if (metadata) {
      updateData.metadata = metadata;
    }

    return this.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true, runValidators: true }
    );
  },

  /**
   * Process refund
   */
  async processRefund(paymentId: string, refundAmount: number, reason?: string) {
    const payment = await this.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Payment is not completed');
    }

    if (refundAmount > payment.amount - payment.refundedAmount) {
      throw new Error('Refund amount exceeds available amount');
    }

    payment.refundedAmount += refundAmount;
    
    if (payment.refundedAmount >= payment.amount) {
      payment.status = PaymentStatus.REFUNDED;
    } else {
      payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    if (reason) {
      payment.metadata = {
        ...payment.metadata,
        lastRefundReason: reason,
        lastRefundAmount: refundAmount,
        lastRefundDate: new Date(),
      };
    }

    return payment.save();
  }
};

// Instance methods
PaymentSchema.methods = {
  /**
   * Check if payment can be refunded
   */
  canRefund(): boolean {
    return this.status === PaymentStatus.COMPLETED && 
           this.refundedAmount < this.amount;
  },

  /**
   * Get available amount for refund
   */
  getAvailableRefundAmount(): number {
    return this.amount - this.refundedAmount;
  },

  /**
   * Check if payment is fully refunded
   */
  isFullyRefunded(): boolean {
    return this.refundedAmount >= this.amount;
  },

  /**
   * Check if payment is partially refunded
   */
  isPartiallyRefunded(): boolean {
    return this.refundedAmount > 0 && this.refundedAmount < this.amount;
  },

  /**
   * Get payment summary
   */
  getSummary() {
    return {
      id: this._id,
      orderId: this.orderId,
      amount: this.amount,
      currency: this.currency,
      method: this.method,
      status: this.status,
      netAmount: this.netAmount,
      refundStatus: this.refundStatus,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
    };
  }
};

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);