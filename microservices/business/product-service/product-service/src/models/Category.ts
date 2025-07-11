import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId?: mongoose.Types.ObjectId;
  level: number;
  sortOrder: number;
  isActive: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    image: {
      type: String,
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    level: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    seo: {
      title: {
        type: String,
        maxlength: 60,
      },
      description: {
        type: String,
        maxlength: 160,
      },
      keywords: [{
        type: String,
        trim: true,
      }],
    },
    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ level: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ sortOrder: 1 });

// Virtual for parent category
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for child categories
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId',
});

// Pre-save middleware
CategorySchema.pre('save', function(next) {
  // Auto-generate slug if not provided
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Set default SEO title if not provided
  if (!this.seo?.title) {
    this.seo = this.seo || {};
    this.seo.title = this.name;
  }
  
  // Calculate level based on parent
  if (this.parentId) {
    this.level = 1; // Will be updated in post-save
  } else {
    this.level = 0;
  }
  
  next();
});

// Post-save middleware to calculate level
CategorySchema.post('save', async function() {
  if (this.parentId) {
    const parent = await this.constructor.findById(this.parentId);
    if (parent) {
      this.level = parent.level + 1;
      if (this.isModified('level')) {
        await this.save();
      }
    }
  }
});

// Instance methods
CategorySchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ categoryId: this._id, isActive: true });
  this.productCount = count;
  return this.save();
};

// Static methods
CategorySchema.statics.findRootCategories = function() {
  return this.find({ parentId: null, isActive: true }).sort({ sortOrder: 1 });
};

CategorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

CategorySchema.statics.findChildren = function(parentId: string) {
  return this.find({ parentId, isActive: true }).sort({ sortOrder: 1 });
};

CategorySchema.statics.getCategoryTree = async function() {
  const categories = await this.find({ isActive: true }).sort({ sortOrder: 1 });
  
  const buildTree = (parentId: string | null = null) => {
    return categories
      .filter(cat => (parentId === null && !cat.parentId) || cat.parentId?.toString() === parentId)
      .map(cat => ({
        ...cat.toObject(),
        children: buildTree(cat._id.toString()),
      }));
  };
  
  return buildTree();
};

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
