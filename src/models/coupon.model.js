const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'کد تخفیف الزامی است'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'نوع تخفیف الزامی است'],
    },
    discount: {
      type: Number,
      required: [true, 'مقدار تخفیف الزامی است'],
      min: [0, 'مقدار تخفیف نمی‌تواند منفی باشد'],
    },
    minPurchase: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number, // Maximum discount amount for percentage discounts
      default: 0, // 0 means no limit
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'تاریخ پایان اعتبار الزامی است'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number, // How many times this coupon can be used in total
      default: 0, // 0 means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    userUsageLimit: {
      type: Number, // How many times a single user can use this coupon
      default: 1,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    excludedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        order: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
        },
        discountAmount: Number,
      },
    ],
    allowCombination: {
      type: Boolean, // Whether this coupon can be used with other promotions
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isPermanent: {
      type: Boolean,
      default: false,
    },
    isForNewUsers: {
      type: Boolean,
      default: false,
    },
    userGroups: [String], // Target specific user groups
  },
  {
    timestamps: true,
  }
);

// Check if coupon is valid
couponSchema.methods.isValid = function () {
  // Check if coupon is active
  if (!this.isActive) {
    return {
      isValid: false,
      message: 'کد تخفیف غیرفعال است',
    };
  }
  
  const now = new Date();
  
  // Check if coupon has started
  if (this.startDate > now) {
    return {
      isValid: false,
      message: 'کد تخفیف هنوز شروع نشده است',
    };
  }
  
  // Check if coupon has expired
  if (!this.isPermanent && this.endDate < now) {
    return {
      isValid: false,
      message: 'کد تخفیف منقضی شده است',
    };
  }
  
  // Check if coupon has reached usage limit
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return {
      isValid: false,
      message: 'تعداد استفاده از این کد تخفیف به حداکثر رسیده است',
    };
  }
  
  return {
    isValid: true,
    message: 'کد تخفیف معتبر است',
  };
};

// Check if user can use this coupon
couponSchema.methods.canUserUse = function (userId) {
  // Check if user has already used this coupon
  const userUsage = this.usedBy.filter(
    (usage) => usage.user.toString() === userId.toString()
  ).length;
  
  if (userUsage >= this.userUsageLimit) {
    return {
      canUse: false,
      message: 'شما قبلاً از این کد تخفیف استفاده کرده‌اید',
    };
  }
  
  return {
    canUse: true,
    message: 'کد تخفیف قابل استفاده است',
  };
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function (cartTotal) {
  if (cartTotal < this.minPurchase) {
    return {
      isApplicable: false,
      discountAmount: 0,
      message: `حداقل خرید برای این کد تخفیف ${this.minPurchase} تومان می‌باشد`,
    };
  }
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (cartTotal * this.discount) / 100;
    
    // Apply maximum discount if set
    if (this.maxDiscount > 0 && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else {
    // Fixed amount
    discountAmount = Math.min(this.discount, cartTotal);
  }
  
  return {
    isApplicable: true,
    discountAmount,
    message: 'تخفیف اعمال شد',
  };
};

// Mark coupon as used by user
couponSchema.methods.markAsUsed = async function (userId, orderId, discountAmount) {
  this.usedCount += 1;
  
  this.usedBy.push({
    user: userId,
    usedAt: new Date(),
    order: orderId,
    discountAmount,
  });
  
  return await this.save();
};

// Create indexes
couponSchema.index({ isActive: 1 });
couponSchema.index({ endDate: 1 });
couponSchema.index({ 'usedBy.user': 1 });

module.exports = mongoose.model('Coupon', couponSchema); 