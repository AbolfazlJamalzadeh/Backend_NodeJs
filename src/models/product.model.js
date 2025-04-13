const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'نام محصول الزامی است'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'توضیحات محصول الزامی است'],
    },
    price: {
      type: Number,
      required: [true, 'قیمت محصول الزامی است'],
      min: [0, 'قیمت نمی‌تواند منفی باشد'],
    },
    comparePrice: {
      type: Number,
      min: [0, 'قیمت مقایسه‌ای نمی‌تواند منفی باشد'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'دسته‌بندی محصول الزامی است'],
    },
    stock: {
      type: Number,
      required: [true, 'موجودی محصول الزامی است'],
      min: [0, 'موجودی نمی‌تواند منفی باشد'],
      default: 0,
    },
    sold: {
      type: Number,
      default: 0,
    },
    specifications: [
      {
        title: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
        },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    numReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    colors: [String],
    tags: [String],
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
      weight: Number,
    },
    installmentOptions: [
      {
        provider: String, // e.g., "بانک تجارت", "لیزینگ ایران"
        months: Number,
        interestRate: Number,
        minAmount: Number,
        description: String,
      },
    ],
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    lowStockAlert: {
      type: Number,
      default: 5,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate product slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .replace(/\s+/g, '-')
      .replace(/[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u200C\u200Fa-z0-9-]/gi, '')
      .toLowerCase();
  }
  next();
});

// Calculate discount percentage
productSchema.virtual('discountPercentage').get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) {
    return 0;
  }
  
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

// Check if product is in stock
productSchema.methods.isInStock = function () {
  return this.stock > 0;
};

// Check if product is running low on stock
productSchema.methods.isLowStock = function () {
  return this.stock > 0 && this.stock <= this.lowStockAlert;
};

// Update stock
productSchema.methods.updateStock = async function (quantity, operation = 'decrease') {
  if (operation === 'decrease') {
    if (this.stock < quantity) {
      throw new Error('موجودی کافی نیست');
    }
    this.stock -= quantity;
    this.sold += quantity;
  } else if (operation === 'increase') {
    this.stock += quantity;
    this.sold = Math.max(0, this.sold - quantity);
  }
  
  return await this.save();
};

// Create indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });

// Add a virtual to get reviews for this product
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

// Add a virtual to get questions for this product
productSchema.virtual('questions', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'product',
  justOne: false,
});

module.exports = mongoose.model('Product', productSchema); 