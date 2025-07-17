import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  parentId?: mongoose.Types.ObjectId;
  image?: string;
  icon?: string;
  isActive: boolean;
  displayOrder: number;
  metadata?: Record<string, any>;
  path: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true
    },
    image: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid image URL'
      }
    },
    icon: {
      type: String
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: 0
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    path: {
      type: String,
      index: true
    },
    level: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for parent reference
CategorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentId',
  foreignField: '_id',
  justOne: true
});

// Virtual for children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentId'
});

  // Pre-save hook to generate path and calculate level
  CategorySchema.pre('save', async function(next) {
    if (this.isModified('parentId') || this.isNew) {
      if (this.parentId) {
        const parent = await mongoose.model('Category').findById(this.parentId);
        if (parent) {
          this.path = parent.path ? `${parent.path}/${this._id}` : `${parent._id}/${this._id}`;
          this.level = parent.level + 1;
        }
      } else {
        this.path = (this._id as any).toString();
        this.level = 0;
      }
    }
    next();
  });

// Index for efficient queries
CategorySchema.index({ path: 1 });
CategorySchema.index({ name: 'text', description: 'text' });
CategorySchema.index({ isActive: 1, displayOrder: 1 });
CategorySchema.index({ parentId: 1, isActive: 1 });

// Methods
CategorySchema.methods.getAncestors = async function() {
  const ids = this.path.split('/').filter((id: string) => id !== this._id.toString());
  return mongoose.model('Category').find({ _id: { $in: ids } });
};

CategorySchema.methods.getDescendants = async function() {
  return mongoose.model('Category').find({
    path: { $regex: `^${this.path}/` }
  });
};

// Statics
CategorySchema.statics.findBySlug = function(slug: string) {
  return this.findOne({ slug, isActive: true });
};

CategorySchema.statics.getRootCategories = function() {
  return this.find({ parentId: null, isActive: true }).sort({ displayOrder: 1, name: 1 });
};

export default mongoose.model<ICategory>('Category', CategorySchema);