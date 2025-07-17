/**
 * Category Model
 * Professional category schema with hierarchy support
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import { logger } from '../shared/logger';

// Interfaces
export interface ICategoryMetadata {
  icon?: string;
  color?: string;
  bannerImage?: string;
  description?: string;
  keywords?: string[];
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  path: string;
  isActive: boolean;
  sortOrder: number;
  metadata: ICategoryMetadata;
  
  // Computed fields
  productCount?: number;
  childrenCount?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getChildren(): Promise<ICategory[]>;
  getParents(): Promise<ICategory[]>;
  getFullPath(): Promise<ICategory[]>;
  hasProducts(): Promise<boolean>;
  canBeDeleted(): Promise<boolean>;
}

// Static methods interface
export interface ICategoryModel extends Model<ICategory> {
  buildTree(parentId?: mongoose.Types.ObjectId, maxDepth?: number): Promise<ICategory[]>;
  getAnalytics(): Promise<{
    total: number;
    active: number;
    roots: number;
    levelDistribution: any[];
  }>;
}

// Schema definition
const CategorySchema = new Schema<ICategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    index: true,
  },
  
  slug: {
    type: String,
    required: [true, 'Category slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
    index: true,
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true,
  },
  
  level: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Level cannot be negative'],
    max: [10, 'Maximum category depth is 10 levels'],
    index: true,
  },
  
  path: {
    type: String,
    required: true,
    default: '',
    index: true,
  },
  
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  
  sortOrder: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Sort order cannot be negative'],
  },
  
  metadata: {
    icon: {
      type: String,
      trim: true,
      maxlength: [100, 'Icon name cannot exceed 100 characters'],
    },
    
    color: {
      type: String,
      trim: true,
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code'],
    },
    
    bannerImage: {
      type: String,
      trim: true,
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Metadata description cannot exceed 1000 characters'],
    },
    
    keywords: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
}, {
  timestamps: true,
  collection: 'categories',
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete (ret as any).__v;
      return ret;
    }
  },
  toObject: { virtuals: true },
});

// Indexes
CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index({ level: 1, isActive: 1 });
// Path index is defined at field level
CategorySchema.index({ name: 'text', 'metadata.description': 'text' });
CategorySchema.index({ 'metadata.keywords': 1 });

// Virtual for children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { sortOrder: 1 } },
});

// Virtual for parent
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

// Pre-save middleware
CategorySchema.pre('save', async function(next) {
  try {
    // Generate slug if not provided
    if (!this.slug || this.isModified('name')) {
      this.slug = await generateUniqueSlug(this.name, this._id as mongoose.Types.ObjectId);
    }
    
    // Calculate level and path
    if (this.parentId) {
      const parent = await (this.constructor as any).findById(this.parentId);
      if (parent) {
        this.level = parent.level + 1;
        this.path = parent.path ? `${parent.path}/${parent._id}` : `${parent._id}`;
        
        // Prevent circular references
        if (this.path.includes((this._id as mongoose.Types.ObjectId).toString())) {
          throw new Error('Circular reference detected in category hierarchy');
        }
      } else {
        throw new Error('Parent category not found');
      }
    } else {
      this.level = 0;
      this.path = '';
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-remove middleware
CategorySchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Check if category has children
    const childrenCount = await (this.constructor as any).countDocuments({ parentId: this._id });
    if (childrenCount > 0) {
      throw new Error('Cannot delete category with child categories');
    }
    
    // Check if category has products
    const Product = mongoose.model('Product');
    const productCount = await Product.countDocuments({ category: this._id });
    if (productCount > 0) {
      throw new Error('Cannot delete category with associated products');
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
CategorySchema.methods.getChildren = async function(): Promise<ICategory[]> {
  return (this.constructor as any).find({ parentId: this._id }).sort({ sortOrder: 1 });
};

CategorySchema.methods.getParents = async function(): Promise<ICategory[]> {
  const parents: ICategory[] = [];
  let current = this;
  
  while (current.parentId) {
          const parent = await (this.constructor as any).findById(current.parentId);
    if (!parent) break;
    parents.unshift(parent);
    current = parent;
  }
  
  return parents;
};

CategorySchema.methods.getFullPath = async function(): Promise<ICategory[]> {
  const parents = await this.getParents();
  return [...parents, this];
};

CategorySchema.methods.hasProducts = async function(): Promise<boolean> {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ category: this._id });
  return count > 0;
};

CategorySchema.methods.canBeDeleted = async function(): Promise<boolean> {
  const childrenCount = await (this.constructor as any).countDocuments({ parentId: this._id });
  const hasProducts = await this.hasProducts();
  return childrenCount === 0 && !hasProducts;
};

// Static methods
CategorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

CategorySchema.statics.findRoots = function(includeInactive = false) {
  const filter: any = { parentId: null };
  if (!includeInactive) {
    filter.isActive = true;
  }
  return this.find(filter).sort({ sortOrder: 1 });
};

CategorySchema.statics.buildTree = async function(parentId = null, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  const categories = await this.find({ parentId, isActive: true }).sort({ sortOrder: 1 });
  
  for (const category of categories) {
    category.children = await (this as any).buildTree(category._id, maxDepth, currentDepth + 1);
  }
  
  return categories;
};

CategorySchema.statics.getAnalytics = async function() {
  const pipeline = [
    {
      $facet: {
        totalCategories: [{ $count: "count" }],
        activeCategories: [{ $match: { isActive: true } }, { $count: "count" }],
        levelDistribution: [
          { $group: { _id: "$level", count: { $sum: 1 } } },
          { $sort: { _id: 1 as 1 } }
        ],
        categoriesWithoutParent: [
          { $match: { parentId: null } },
          { $count: "count" }
        ]
      }
    }
  ];
  
  const [result] = await this.aggregate(pipeline);
  return {
    total: result.totalCategories[0]?.count || 0,
    active: result.activeCategories[0]?.count || 0,
    roots: result.categoriesWithoutParent[0]?.count || 0,
    levelDistribution: result.levelDistribution,
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
  
  const Category = mongoose.model<ICategory>('Category');
  
  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existing = await Category.findOne(query);
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Create and export model
const Category: ICategoryModel = mongoose.model<ICategory, ICategoryModel>('Category', CategorySchema);

export default Category;
export { Category };