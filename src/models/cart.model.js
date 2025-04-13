const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'تعداد نمی‌تواند کمتر از 1 باشد'],
          default: 1,
        },
        color: String,
        price: Number, // Store the price at the time of adding to cart
      },
    ],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    appliedCoupon: {
      code: String,
      discountAmount: Number,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
    },
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    isAbandoned: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update cart totals
cartSchema.methods.updateTotals = function () {
  // Calculate total items
  this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  
  // Calculate total price
  this.totalPrice = this.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  
  // Apply discount if coupon exists
  if (this.appliedCoupon) {
    if (this.appliedCoupon.discountType === 'percentage') {
      const discountAmount = (this.totalPrice * this.appliedCoupon.discountAmount) / 100;
      this.totalPrice = Math.max(0, this.totalPrice - discountAmount);
    } else {
      this.totalPrice = Math.max(0, this.totalPrice - this.appliedCoupon.discountAmount);
    }
  }
  
  // Add shipping cost
  this.totalPrice += this.shippingCost;
  
  return this;
};

// Add item to cart
cartSchema.methods.addItem = function (productId, quantity = 1, color = null, price) {
  const existingItemIndex = this.items.findIndex(
    (item) => item.product.toString() === productId.toString() && item.color === color
  );
  
  if (existingItemIndex > -1) {
    // If item exists, update quantity
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Otherwise add new item
    this.items.push({
      product: productId,
      quantity,
      color,
      price,
    });
  }
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Remove item from cart
cartSchema.methods.removeItem = function (productId, color = null) {
  this.items = this.items.filter(
    (item) => 
      !(item.product.toString() === productId.toString() && 
       (color === null || item.color === color))
  );
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Update item quantity
cartSchema.methods.updateItemQuantity = function (productId, quantity, color = null) {
  const itemIndex = this.items.findIndex(
    (item) => item.product.toString() === productId.toString() && item.color === color
  );
  
  if (itemIndex > -1) {
    if (quantity > 0) {
      this.items[itemIndex].quantity = quantity;
    } else {
      // Remove item if quantity is 0 or negative
      return this.removeItem(productId, color);
    }
  }
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Clear cart
cartSchema.methods.clearCart = function () {
  this.items = [];
  this.appliedCoupon = undefined;
  this.shippingMethod = undefined;
  this.shippingCost = 0;
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Apply coupon
cartSchema.methods.applyCoupon = function (code, discountAmount, discountType) {
  this.appliedCoupon = {
    code,
    discountAmount,
    discountType,
  };
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Remove coupon
cartSchema.methods.removeCoupon = function () {
  this.appliedCoupon = undefined;
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Set shipping method
cartSchema.methods.setShippingMethod = function (method, cost) {
  this.shippingMethod = method;
  this.shippingCost = cost;
  
  this.lastActivity = Date.now();
  return this.updateTotals();
};

// Mark as abandoned
cartSchema.methods.markAsAbandoned = function () {
  this.isAbandoned = true;
  return this;
};

// Create indexes
cartSchema.index({ user: 1 });
cartSchema.index({ isAbandoned: 1, lastActivity: -1 });

module.exports = mongoose.model('Cart', cartSchema); 