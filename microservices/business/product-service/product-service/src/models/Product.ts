import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  category: string;
  subcategory?: string;
  brand: string;
  price: {
    current: number;
    original?: number;
    currency: string;
  };
  images: {
    primary: string;
    gallery: string[];
  };
  specifications: Record<string, any>;
  features: string[];
  tags: string[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, any>;
  }[];
  inventory: {
    totalStock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
  };
  shipping: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    freeShipping: boolean;
    shippingClass: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    slug: string;
    keywords: string[];
  };
  status: 'active' | 'inactive' | 'draft';
  visibility: 'public' | 'private' | 'password';
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  rating: {
    average: number;
    count: number;
  };
  vendor: {
    id: string;
    name: string;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 500
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: {
    type: String,
    index: true
  },
  brand: {
    type: String,
    required: true,
    index: true
  },
  price: {
    current: {
      type: Number,
      required: true,
      min: 0
    },
    original: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'UZS']
    }
  },
  images: {
    primary: {
      type: String,
      required: true
    },
    gallery: [{
      type: String
    }]
  },
  specifications: {
    type: Schema.Types.Mixed,
    default: {}
  },
  features: [{
    type: String
  }],
  tags: [{
    type: String,
    index: true
  }],
  variants: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    attributes: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }],
  inventory: {
    totalStock: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    trackInventory: {
      type: Boolean,
      default: true
    }
  },
  shipping: {
    weight: {
      type: Number,
      required: true,
      min: 0
    },
    dimensions: {
      length: {
        type: Number,
        required: true,
        min: 0
      },
      width: {
        type: Number,
        required: true,
        min: 0
      },
      height: {
        type: Number,
        required: true,
        min: 0
      }
    },
    freeShipping: {
      type: Boolean,
      default: false
    },
    shippingClass: {
      type: String,
      default: 'standard'
    }
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: 60
    },
    metaDescription: {
      type: String,
      maxlength: 160
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    keywords: [{
      type: String
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'password'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  bestSeller: {
    type: Boolean,
    default: false,
    index: true
  },
  newArrival: {
    type: Boolean,
    default: false,
    index: true
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  vendor: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ 'price.current': 1 });
ProductSchema.index({ 'inventory.totalStock': 1 });
ProductSchema.index({ status: 1, visibility: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ 'rating.average': -1 });
ProductSchema.index({ featured: 1, status: 1 });
ProductSchema.index({ bestSeller: 1, status: 1 });
ProductSchema.index({ newArrival: 1, status: 1 });

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (this.price.original && this.price.original > this.price.current) {
    return Math.round(((this.price.original - this.price.current) / this.price.original) * 100);
  }
  return 0;
});

// Virtual for stock status
ProductSchema.virtual('stockStatus').get(function() {
  if (!this.inventory.trackInventory) return 'unlimited';
  if (this.inventory.totalStock === 0) return 'out_of_stock';
  if (this.inventory.totalStock <= this.inventory.lowStockThreshold) return 'low_stock';
  return 'in_stock';
});

// Pre-save middleware to update total stock from variants
ProductSchema.pre('save', function(next) {
  if (this.variants && this.variants.length > 0) {
    this.inventory.totalStock = this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  next();
});

// Static method to find products by category
ProductSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, status: 'active', visibility: 'public' });
};

// Static method to find featured products
ProductSchema.statics.findFeatured = function() {
  return this.find({ 
    featured: true, 
    status: 'active', 
    visibility: 'public' 
  }).sort({ createdAt: -1 });
};

// Static method to find best sellers
ProductSchema.statics.findBestSellers = function() {
  return this.find({ 
    bestSeller: true, 
    status: 'active', 
    visibility: 'public' 
  }).sort({ 'rating.average': -1 });
};

// Static method to find new arrivals
ProductSchema.statics.findNewArrivals = function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.find({ 
    newArrival: true, 
    status: 'active', 
    visibility: 'public',
    createdAt: { $gte: thirtyDaysAgo }
  }).sort({ createdAt: -1 });
};

// Instance method to update rating
ProductSchema.methods.updateRating = function(averageRating: number, count: number) {
  this.rating.average = averageRating;
  this.rating.count = count;
  return this.save();
};

// Instance method to check if product is in stock
ProductSchema.methods.isInStock = function() {
  if (!this.inventory.trackInventory) return true;
  return this.inventory.totalStock > 0;
};

// Instance method to check if product is low in stock
ProductSchema.methods.isLowStock = function() {
  if (!this.inventory.trackInventory) return false;
  return this.inventory.totalStock <= this.inventory.lowStockThreshold;
};

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
