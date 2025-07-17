/**
 * Product Model
 * Professional product schema with full e-commerce features
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import { logger } from '@ultramarket/shared/logging/logger';

// Interfaces
export interface IProductVariant {
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  inventory: {
    quantity: number;
    tracked: boolean;
    allowBackorder: boolean;
    lowStockThreshold?: number;
  };
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  attributes: Record<string, string>; // size: "M", color: "Red"
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductReview {
  userId: mongoose.Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  verified: boolean;
  helpful: number;
  reported: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
}

export interface IProductInventory {
  quantity: number;
  tracked: boolean;
  allowBackorder: boolean;
  lowStockThreshold?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
}

export interface IProduct extends Document {
  // Basic Information
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;

  // Categorization
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  brand?: string;
  tags: string[];

  // Pricing
  price: number;
  compareAtPrice?: number;
  cost?: number;
  currency: string;
  taxable: boolean;
  taxCode?: string;

  // Inventory
  inventory: IProductInventory;

  // Physical properties
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };

  // Media
  images: string[];
  videos?: string[];

  // Variants
  hasVariants: boolean;
  variants: IProductVariant[];
  options: Array<{
    name: string;
    values: string[];
  }>;

  // SEO
  seo: IProductSEO;

  // Status
  status: 'draft' | 'active' | 'archived';
  publishedAt?: Date;

  // Vendor
  vendorId: mongoose.Types.ObjectId;

  // Features
  isFeatured: boolean;
  isDigital: boolean;
  requiresShipping: boolean;

  // Analytics
  viewCount: number;
  salesCount: number;
  rating: {
    average: number;
    count: number;
  };

  // Reviews
  reviews: IProductReview[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Methods
  updateInventory(quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<void>;
  reserveInventory(quantity: number): Promise<boolean>;
  releaseInventory(quantity: number): Promise<void>;
  calculateAverageRating(): void;
  addReview(review: Partial<IProductReview>): Promise<void>;
  canBeDeleted(): Promise<boolean>;
  isInStock(): boolean;
  getAvailableQuantity(): number;
}

// Schema definition
const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [255, 'Product name cannot exceed 255 characters'],
    index: true,
  },

  slug: {
    type: String,
    required: [true, 'Product slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    index: true,
  },

  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },

  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters'],
  },

  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'],
    index: true,
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true,
  },

  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    index: true,
  },

  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters'],
    index: true,
  },

  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],

  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true,
  },

  compareAtPrice: {
    type: Number,
    min: [0, 'Compare at price cannot be negative'],
    validate: {
      validator: function(this: IProduct, value: number) {
        return !value || value > this.price;
      },
      message: 'Compare at price must be greater than regular price',
    },
  },

  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
  },

  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code'],
  },

  taxable: {
    type: Boolean,
    required: true,
    default: true,
  },

  taxCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Tax code cannot exceed 20 characters'],
  },

  inventory: {
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Inventory quantity cannot be negative'],
    },
    tracked: {
      type: Boolean,
      required: true,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      required: true,
      default: false,
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative'],
      default: 10,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative'],
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Available quantity cannot be negative'],
    },
  },

  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative'],
  },

  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative'],
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative'],
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative'],
    },
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm',
    },
  },

  images: [{
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      },
      message: 'Image must be a valid URL with supported format (jpg, jpeg, png, gif, webp)',
    },
  }],

  videos: [{
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+\.(mp4|webm|ogg)$/i.test(url) || 
               /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//.test(url);
      },
      message: 'Video must be a valid URL',
    },
  }],

  hasVariants: {
    type: Boolean,
    required: true,
    default: false,
  },

  variants: [{
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Variant price cannot be negative'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Variant compare at price cannot be negative'],
    },
    cost: {
      type: Number,
      min: [0, 'Variant cost cannot be negative'],
    },
    inventory: {
      quantity: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Variant inventory cannot be negative'],
      },
      tracked: {
        type: Boolean,
        required: true,
        default: true,
      },
      allowBackorder: {
        type: Boolean,
        required: true,
        default: false,
      },
      lowStockThreshold: {
        type: Number,
        min: [0, 'Variant low stock threshold cannot be negative'],
      },
    },
    weight: {
      type: Number,
      min: [0, 'Variant weight cannot be negative'],
    },
    dimensions: {
      length: { type: Number, min: [0, 'Length cannot be negative'] },
      width: { type: Number, min: [0, 'Width cannot be negative'] },
      height: { type: Number, min: [0, 'Height cannot be negative'] },
      unit: { type: String, enum: ['cm', 'in'], default: 'cm' },
    },
    attributes: {
      type: Map,
      of: String,
    },
    images: [String],
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  }],

  options: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    values: [{
      type: String,
      required: true,
      trim: true,
    }],
  }],

  seo: {
    title: {
      type: String,
      trim: true,
      maxlength: [255, 'SEO title cannot exceed 255 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'SEO description cannot exceed 500 characters'],
    },
    keywords: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    canonicalUrl: {
      type: String,
      trim: true,
    },
  },

  status: {
    type: String,
    required: true,
    enum: {
      values: ['draft', 'active', 'archived'],
      message: 'Status must be draft, active, or archived',
    },
    default: 'draft',
    index: true,
  },

  publishedAt: {
    type: Date,
    index: true,
  },

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor ID is required'],
    index: true,
  },

  isFeatured: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },

  isDigital: {
    type: Boolean,
    required: true,
    default: false,
  },

  requiresShipping: {
    type: Boolean,
    required: true,
    default: true,
  },

  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative'],
  },

  salesCount: {
    type: Number,
    default: 0,
    min: [0, 'Sales count cannot be negative'],
  },

  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating average cannot be negative'],
      max: [5, 'Rating average cannot exceed 5'],
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative'],
    },
  },

  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
      min: [0, 'Helpful count cannot be negative'],
    },
    reported: {
      type: Number,
      default: 0,
      min: [0, 'Reported count cannot be negative'],
    },
  }],

  deletedAt: {
    type: Date,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'products',
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      if (ret.deletedAt) {
        delete ret.deletedAt;
      }
      return ret;
    }
  },
  toObject: { virtuals: true },
});

// Indexes
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ brand: 1, status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ 'rating.average': -1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ isFeatured: 1, status: 1 });
ProductSchema.index({ vendorId: 1, status: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({ deletedAt: 1 });

// Virtual properties
ProductSchema.virtual('isInStock').get(function() {
  return this.getAvailableQuantity() > 0 || this.inventory.allowBackorder;
});

ProductSchema.virtual('discountPercentage').get(function() {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Pre-save middleware
ProductSchema.pre('save', async function(next) {
  try {
    // Generate slug if not provided or name changed
    if (!this.slug || this.isModified('name')) {
      this.slug = await generateUniqueSlug(this.name, this._id);
    }

    // Set published date when status changes to active
    if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
      this.publishedAt = new Date();
    }

    // Calculate available quantity
    this.inventory.availableQuantity = Math.max(0, this.inventory.quantity - (this.inventory.reservedQuantity || 0));

    // Set default SEO title if not provided
    if (!this.seo.title) {
      this.seo.title = this.name;
    }

    // Set default SEO description if not provided
    if (!this.seo.description && this.shortDescription) {
      this.seo.description = this.shortDescription;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
ProductSchema.methods.updateInventory = async function(quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<void> {
  switch (operation) {
    case 'add':
      this.inventory.quantity += quantity;
      break;
    case 'subtract':
      this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
      break;
    case 'set':
      this.inventory.quantity = Math.max(0, quantity);
      break;
  }
  
  this.inventory.availableQuantity = Math.max(0, this.inventory.quantity - (this.inventory.reservedQuantity || 0));
  await this.save();
};

ProductSchema.methods.reserveInventory = async function(quantity: number): Promise<boolean> {
  if (this.getAvailableQuantity() >= quantity) {
    this.inventory.reservedQuantity = (this.inventory.reservedQuantity || 0) + quantity;
    this.inventory.availableQuantity = Math.max(0, this.inventory.quantity - this.inventory.reservedQuantity);
    await this.save();
    return true;
  }
  return false;
};

ProductSchema.methods.releaseInventory = async function(quantity: number): Promise<void> {
  this.inventory.reservedQuantity = Math.max(0, (this.inventory.reservedQuantity || 0) - quantity);
  this.inventory.availableQuantity = Math.max(0, this.inventory.quantity - this.inventory.reservedQuantity);
  await this.save();
};

ProductSchema.methods.calculateAverageRating = function(): void {
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating.average = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }
};

ProductSchema.methods.addReview = async function(review: Partial<IProductReview>): Promise<void> {
  this.reviews.push(review as IProductReview);
  this.calculateAverageRating();
  await this.save();
};

ProductSchema.methods.canBeDeleted = async function(): Promise<boolean> {
  // Check if product has orders
  const Order = mongoose.model('Order');
  const orderCount = await Order.countDocuments({ 'items.productId': this._id });
  return orderCount === 0;
};

ProductSchema.methods.isInStock = function(): boolean {
  return this.getAvailableQuantity() > 0 || this.inventory.allowBackorder;
};

ProductSchema.methods.getAvailableQuantity = function(): number {
  return Math.max(0, this.inventory.quantity - (this.inventory.reservedQuantity || 0));
};

// Static methods
ProductSchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, status: 'active', deletedAt: null });
};

ProductSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, status: 'active', deletedAt: null });
};

ProductSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, status: 'active', deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ProductSchema.statics.getAnalytics = async function() {
  const pipeline = [
    { $match: { deletedAt: null } },
    {
      $facet: {
        totalProducts: [{ $count: "count" }],
        activeProducts: [{ $match: { status: 'active' } }, { $count: "count" }],
        featuredProducts: [{ $match: { isFeatured: true } }, { $count: "count" }],
        lowStockProducts: [
          { $match: { $expr: { $lte: ["$inventory.availableQuantity", "$inventory.lowStockThreshold"] } } },
          { $count: "count" }
        ],
        totalSales: [{ $group: { _id: null, total: { $sum: "$salesCount" } } }],
        averagePrice: [{ $group: { _id: null, average: { $avg: "$price" } } }],
        categoryDistribution: [
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]
      }
    }
  ];

  const [result] = await this.aggregate(pipeline);
  return {
    total: result.totalProducts[0]?.count || 0,
    active: result.activeProducts[0]?.count || 0,
    featured: result.featuredProducts[0]?.count || 0,
    lowStock: result.lowStockProducts[0]?.count || 0,
    totalSales: result.totalSales[0]?.total || 0,
    averagePrice: result.averagePrice[0]?.average || 0,
    categoryDistribution: result.categoryDistribution,
  };
};

// Helper function to generate unique slug
async function generateUniqueSlug(name: string, excludeId?: mongoose.Types.ObjectId): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  let slug = baseSlug;
  let counter = 1;

  const Product = mongoose.model<IProduct>('Product');

  while (true) {
    const query: any = { slug, deletedAt: null };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Product.findOne(query);
    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Create and export model
const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
export { Product };
