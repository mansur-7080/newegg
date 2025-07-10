import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  categoryId: string;
  brandId: string;
  price: {
    current: number;
    original?: number;
    currency: string;
  };
  images: {
    primary: string;
    gallery: string[];
    thumbnails: string[];
  };
  attributes: {
    [key: string]: any;
  };
  specifications: {
    [key: string]: any;
  };
  inventory: {
    quantity: number;
    reserved: number;
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
    title: string;
    description: string;
    keywords: string[];
    url: string;
  };
  status: 'active' | 'inactive' | 'draft' | 'archived';
  visibility: 'public' | 'private' | 'password';
  featured: boolean;
  trending: boolean;
  rating: {
    average: number;
    count: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  tags: string[];
  relatedProducts: string[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    attributes: {
      [key: string]: any;
    };
    inventory: {
      quantity: number;
      reserved: number;
    };
    images: string[];
  }[];
  metadata: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
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
    uppercase: true,
    trim: true
  },
  categoryId: {
    type: String,
    required: true,
    index: true
  },
  brandId: {
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
      required: true,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
    }
  },
  images: {
    primary: {
      type: String,
      required: true
    },
    gallery: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Image URL must be a valid HTTP/HTTPS URL'
      }
    }],
    thumbnails: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Thumbnail URL must be a valid HTTP/HTTPS URL'
      }
    }]
  },
  attributes: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  specifications: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  inventory: {
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reserved: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 10
    },
    trackInventory: {
      type: Boolean,
      required: true,
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
    title: {
      type: String,
      required: true,
      maxlength: 60
    },
    description: {
      type: String,
      required: true,
      maxlength: 160
    },
    keywords: [{
      type: String,
      trim: true
    }],
    url: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    required: true,
    enum: ['public', 'private', 'password'],
    default: 'public'
  },
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  trending: {
    type: Boolean,
    default: false,
    index: true
  },
  rating: {
    average: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    distribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  relatedProducts: [{
    type: String,
    ref: 'Product'
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
      required: true,
      uppercase: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    attributes: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    },
    inventory: {
      quantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },
      reserved: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      }
    },
    images: [{
      type: String,
      validate: {
        validator: function(v: string) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Variant image URL must be a valid HTTP/HTTPS URL'
      }
    }]
  }],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ProductSchema.index({ name: 'text', description: 'text', shortDescription: 'text' });
ProductSchema.index({ categoryId: 1, status: 1 });
ProductSchema.index({ brandId: 1, status: 1 });
ProductSchema.index({ 'price.current': 1 });
ProductSchema.index({ featured: 1, status: 1 });
ProductSchema.index({ trending: 1, status: 1 });
ProductSchema.index({ 'rating.average': -1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });

// Virtual for available quantity
ProductSchema.virtual('availableQuantity').get(function() {
  return this.inventory.quantity - this.inventory.reserved;
});

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function() {
  if (this.price.original && this.price.original > this.price.current) {
    return Math.round(((this.price.original - this.price.current) / this.price.original) * 100);
  }
  return 0;
});

// Virtual for is on sale
ProductSchema.virtual('isOnSale').get(function() {
  return this.price.original && this.price.original > this.price.current;
});

// Virtual for is low stock
ProductSchema.virtual('isLowStock').get(function() {
  return this.inventory.trackInventory && this.availableQuantity <= this.inventory.lowStockThreshold;
});

// Virtual for is out of stock
ProductSchema.virtual('isOutOfStock').get(function() {
  return this.inventory.trackInventory && this.availableQuantity <= 0;
});

// Pre-save middleware
ProductSchema.pre('save', function(next) {
  // Generate URL if not provided
  if (!this.seo.url) {
    this.seo.url = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }

  // Update rating average
  if (this.rating.count > 0) {
    const total = Object.entries(this.rating.distribution).reduce((sum, [rating, count]) => {
      return sum + (parseInt(rating) * count);
    }, 0);
    this.rating.average = total / this.rating.count;
  }

  next();
});

// Static methods
ProductSchema.statics.findByCategory = function(categoryId: string) {
  return this.find({ categoryId, status: 'active' });
};

ProductSchema.statics.findByBrand = function(brandId: string) {
  return this.find({ brandId, status: 'active' });
};

ProductSchema.statics.findFeatured = function() {
  return this.find({ featured: true, status: 'active' });
};

ProductSchema.statics.findTrending = function() {
  return this.find({ trending: true, status: 'active' });
};

ProductSchema.statics.search = function(query: string) {
  return this.find({
    $text: { $search: query },
    status: 'active'
  }, {
    score: { $meta: 'textScore' }
  }).sort({ score: { $meta: 'textScore' } });
};

// Instance methods
ProductSchema.methods.updateRating = function(rating: number) {
  this.rating.count += 1;
  this.rating.distribution[rating] += 1;
  
  const total = Object.entries(this.rating.distribution).reduce((sum, [r, count]) => {
    return sum + (parseInt(r) * count);
  }, 0);
  
  this.rating.average = total / this.rating.count;
  return this.save();
};

ProductSchema.methods.reserveInventory = function(quantity: number) {
  if (this.inventory.trackInventory && this.availableQuantity < quantity) {
    throw new Error('Insufficient inventory');
  }
  
  this.inventory.reserved += quantity;
  return this.save();
};

ProductSchema.methods.releaseInventory = function(quantity: number) {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  return this.save();
};

ProductSchema.methods.consumeInventory = function(quantity: number) {
  if (this.inventory.trackInventory && this.availableQuantity < quantity) {
    throw new Error('Insufficient inventory');
  }
  
  this.inventory.quantity -= quantity;
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  return this.save();
};

export const Product = mongoose.model<IProduct>('Product', ProductSchema);