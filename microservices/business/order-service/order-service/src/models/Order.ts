import mongoose, { Document, Schema } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  items: {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variantId?: string;
    variantName?: string;
  }[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
  };
  shipping: {
    address: {
      firstName: string;
      lastName: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    method: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
  };
  billing: {
    address: {
      firstName: string;
      lastName: string;
      company?: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
    method: string;
  };
  payment: {
    method: string;
    transactionId?: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
    amount: number;
    currency: string;
    gateway: string;
    paidAt?: Date;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  statusHistory: {
    status: string;
    timestamp: Date;
    note?: string;
    updatedBy?: string;
  }[];
  notes: {
    customer?: string;
    internal?: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  customer: {
    id: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phone: String
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    variantId: String,
    variantName: String
  }],
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    tax: {
      type: Number,
      required: true,
      min: 0
    },
    shipping: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    }
  },
  shipping: {
    address: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      company: String,
      address1: {
        type: String,
        required: true
      },
      address2: String,
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      postalCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        required: true
      },
      phone: String
    },
    method: {
      type: String,
      required: true
    },
    trackingNumber: String,
    estimatedDelivery: Date
  },
  billing: {
    address: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      company: String,
      address1: {
        type: String,
        required: true
      },
      address2: String,
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      postalCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        required: true
      },
      phone: String
    },
    method: {
      type: String,
      required: true
    }
  },
  payment: {
    method: {
      type: String,
      required: true
    },
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD'
    },
    gateway: {
      type: String,
      required: true
    },
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    note: String,
    updatedBy: String
  }],
  notes: {
    customer: String,
    internal: String
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ 'payment.transactionId': 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'payment.status': 1 });

// Virtual for order summary
OrderSchema.virtual('summary').get(function() {
  return {
    orderNumber: this.orderNumber,
    status: this.status,
    total: this.totals.total,
    currency: this.totals.currency,
    itemCount: this.items.length,
    createdAt: this.createdAt
  };
});

// Virtual for is paid
OrderSchema.virtual('isPaid').get(function() {
  return this.payment.status === 'paid';
});

// Virtual for can be cancelled
OrderSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'confirmed', 'processing'].includes(this.status);
});

// Virtual for can be refunded
OrderSchema.virtual('canBeRefunded').get(function() {
  return this.payment.status === 'paid' && ['shipped', 'delivered'].includes(this.status);
});

// Pre-save middleware to update status history
OrderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: 'system' // This should be set from the request context
    });
  }
  next();
});

// Static method to generate order number
OrderSchema.statics.generateOrderNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const prefix = `ORD-${year}${month}${day}-`;
  
  const lastOrder = await this.findOne({
    orderNumber: { $regex: `^${prefix}` }
  }).sort({ orderNumber: -1 });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Static method to find orders by user
OrderSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const { page = 1, limit = 20, status } = options;
  const skip = (page - 1) * limit;
  
  const filter: any = { userId };
  if (status) filter.status = status;
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to find orders by status
OrderSchema.statics.findByStatus = function(status: string, options: any = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ status })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Instance method to update status
OrderSchema.methods.updateStatus = function(newStatus: string, note?: string, updatedBy?: string) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });
  
  // Update timestamps based on status
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = new Date();
      break;
    case 'shipped':
      this.shippedAt = new Date();
      break;
    case 'delivered':
      this.deliveredAt = new Date();
      break;
    case 'cancelled':
      this.cancelledAt = new Date();
      break;
  }
  
  return this.save();
};

// Instance method to add tracking number
OrderSchema.methods.addTrackingNumber = function(trackingNumber: string) {
  this.shipping.trackingNumber = trackingNumber;
  return this.save();
};

// Instance method to calculate totals
OrderSchema.methods.calculateTotals = function() {
  const subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const total = subtotal + this.totals.tax + this.totals.shipping - this.totals.discount;
  
  this.totals.subtotal = subtotal;
  this.totals.total = total;
  
  return this.save();
};

export const Order = mongoose.model<IOrder>('Order', OrderSchema);