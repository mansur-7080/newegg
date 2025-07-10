import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  sku?: string;
}

export interface ICart extends Document {
  userId: string;
  items: ICartItem[];
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  productId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  image: {
    type: String
  },
  sku: {
    type: String
  }
}, {
  _id: false
});

const cartSchema = new Schema<ICart>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  items: {
    type: [cartItemSchema],
    default: []
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  itemCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  this.itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
  next();
});

// Indexes for performance
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.productId': 1 });
cartSchema.index({ createdAt: -1 });

export const Cart = mongoose.model<ICart>('Cart', cartSchema);