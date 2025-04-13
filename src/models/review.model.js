const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'کاربر الزامی است'],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'محصول الزامی است'],
    },
    rating: {
      type: Number,
      required: [true, 'امتیاز الزامی است'],
      min: [1, 'امتیاز باید حداقل 1 باشد'],
      max: [5, 'امتیاز باید حداکثر 5 باشد'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'عنوان نظر نباید بیش از 100 کاراکتر باشد'],
    },
    comment: {
      type: String,
      required: [true, 'متن نظر الزامی است'],
      trim: true,
      maxlength: [1000, 'متن نظر نباید بیش از 1000 کاراکتر باشد'],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    purchaseVerified: {
      type: Boolean,
      default: false,
    },
    images: [
      {
        url: String,
        alt: String,
      },
    ],
    reply: {
      comment: String,
      date: Date,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    reports: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// A user can only review a product once
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Update product average rating after review is saved
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

// Update product average rating after review is removed
reviewSchema.post('remove', async function () {
  await this.constructor.calculateAverageRating(this.product);
});

// Static method to calculate average product rating
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const Product = require('./product.model');
  
  try {
    // Calculate average from all approved reviews
    const stats = await this.aggregate([
      { $match: { product: productId, isApproved: true } },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$rating' },
          numReviews: { $sum: 1 },
        },
      },
    ]);

    // Update product with calculated stats
    const avgRating = stats.length > 0 ? stats[0].avgRating : 0;
    const numReviews = stats.length > 0 ? stats[0].numReviews : 0;

    await Product.findByIdAndUpdate(
      productId,
      {
        averageRating: avgRating,
        numReviews: numReviews,
      },
      { new: true }
    );
  } catch (error) {
    console.error('Error calculating review stats:', error);
  }
};

module.exports = mongoose.model('Review', reviewSchema); 