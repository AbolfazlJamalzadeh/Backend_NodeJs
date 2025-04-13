const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
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
        name: String, // Store product name in case product is deleted
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, 'تعداد نمی‌تواند کمتر از 1 باشد'],
        },
        color: String,
      },
    ],
    totalItems: {
      type: Number,
      required: true,
    },
    itemsPrice: {
      type: Number,
      required: true,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['zarinpal', 'idpay', 'wallet', 'cod'], // cod = Cash on Delivery
      default: 'zarinpal',
    },
    paymentInfo: {
      authority: String,
      transactionId: String,
      refId: String,
      paymentDate: Date,
      cardNumber: String,
    },
    status: {
      type: String,
      enum: [
        'pendingPayment', // منتظر پرداخت
        'processing', // در حال پردازش
        'shipped', // ارسال شده
        'delivered', // تحویل داده شده
        'cancelled', // لغو شده
        'refunded', // مسترد شده
        'failed', // ناموفق
      ],
      default: 'pendingPayment',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
    trackingCode: String,
    shippingMethod: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard',
    },
    estimatedDeliveryDate: Date,
    couponUsed: {
      code: String,
      discountAmount: Number,
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
    },
    notes: String,
    invoice: {
      invoiceNumber: {
        type: String,
        unique: true,
        sparse: true
      },
      invoiceDate: {
        type: Date,
        default: Date.now
      },
      holoSync: {
        status: {
          type: String,
          enum: ['pending', 'success', 'failed'],
          default: 'pending'
        },
        holoInvoiceId: String,
        syncDate: Date,
        errorMessage: String
      },
      taxDetails: {
        taxRate: {
          type: Number,
          default: 0.09 // 9% مالیات بر ارزش افزوده ایران
        },
        taxAmount: Number
      },
      items: [{
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product'
        },
        name: String,
        price: Number,
        quantity: Number,
        tax: Number
      }]
    },
    refundInfo: {
      reason: String,
      amount: Number,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'refunded'],
      },
      date: Date,
    },
    installmentInfo: {
      provider: String,
      months: Number,
      interestRate: Number,
      monthlyPayment: Number,
      firstPaymentDate: Date,
      lastPaymentDate: Date,
      status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'defaulted'],
      },
    },
    syncedWithHoloo: {
      type: Boolean,
      default: false,
    },
    holooSyncDetails: {
      syncedAt: Date,
      invoiceId: String,
      status: String,
      errorMessage: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to update totalItems
orderSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0);
  }
  next();
});

// Calculate total amount for refunding
orderSchema.methods.calculateRefundAmount = function () {
  return this.isPaid ? this.totalPrice : 0;
};

// Generate invoice number
orderSchema.methods.generateInvoiceNumber = async function() {
  // اگر قبلاً شماره فاکتور تولید شده، آن را برمی‌گردانیم
  if (this.invoice && this.invoice.invoiceNumber) {
    return this.invoice.invoiceNumber;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // استفاده از counter داخلی برای ایجاد شماره فاکتور منحصر به فرد
  let counter = 1;
  
  // دریافت آخرین فاکتور صادر شده در امروز
  const latestOrder = await this.constructor.findOne({
    'invoice.invoiceNumber': { $regex: `^INV-${datePrefix}` }
  }).sort({ 'invoice.invoiceNumber': -1 });
  
  if (latestOrder && latestOrder.invoice && latestOrder.invoice.invoiceNumber) {
    const parts = latestOrder.invoice.invoiceNumber.split('-');
    if (parts.length === 3) {
      counter = parseInt(parts[2], 10) + 1;
    }
  }
  
  const invoiceNumber = `INV-${datePrefix}-${String(counter).padStart(4, '0')}`;
  
  // ایجاد ساختار فاکتور
  if (!this.invoice) {
    this.invoice = {};
  }
  
  this.invoice.invoiceNumber = invoiceNumber;
  this.invoice.invoiceDate = today;
  
  // محاسبه مالیات
  const taxRate = 0.09; // نرخ مالیات بر ارزش افزوده
  const taxAmount = Math.round(this.totalPrice * taxRate / (1 + taxRate));
  
  this.invoice.taxDetails = {
    taxRate: taxRate,
    taxAmount: taxAmount
  };
  
  // ایجاد آیتم‌های فاکتور
  if (this.items && this.items.length > 0) {
    this.invoice.items = this.items.map(item => ({
      product: item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      tax: Math.round(item.price * item.quantity * taxRate / (1 + taxRate))
    }));
  }
  
  await this.save();
  return invoiceNumber;
};

// Cancel order and attempt to restore stock
orderSchema.methods.cancelOrder = async function (reason = 'درخواست مشتری') {
  // Only allow cancellation if order is not delivered or shipped
  if (['delivered', 'shipped'].includes(this.status)) {
    throw new Error('سفارش‌های ارسال شده یا تحویل داده شده قابل لغو نیستند');
  }
  
  this.status = 'cancelled';
  
  // If order was paid, set up refund info
  if (this.isPaid) {
    this.refundInfo = {
      reason,
      amount: this.totalPrice,
      status: 'pending',
      date: new Date(),
    };
  }
  
  return await this.save();
};

// Mark as paid
orderSchema.methods.markAsPaid = async function (paymentInfo = {}) {
  this.isPaid = true;
  this.paidAt = new Date();
  this.status = 'processing';
  this.paymentInfo = { ...this.paymentInfo, ...paymentInfo };
  
  return await this.save();
};

// Mark as delivered
orderSchema.methods.markAsDelivered = async function () {
  this.isDelivered = true;
  this.deliveredAt = new Date();
  this.status = 'delivered';
  
  return await this.save();
};

// Sync with Holoo
orderSchema.methods.syncWithHoloo = async function(syncData) {
  if (!this.invoice) {
    this.invoice = {};
  }
  
  if (!this.invoice.holoSync) {
    this.invoice.holoSync = {
      status: 'pending'
    };
  }
  
  // بروزرسانی وضعیت همگام‌سازی
  this.invoice.holoSync.status = syncData.status || 'pending';
  
  if (syncData.status === 'success') {
    this.invoice.holoSync.holoInvoiceId = syncData.invoiceId;
    this.invoice.holoSync.syncDate = new Date();
  } else if (syncData.status === 'failed') {
    this.invoice.holoSync.errorMessage = syncData.errorMessage;
  }
  
  await this.save();
  return this.invoice.holoSync;
};

// Create indexes
orderSchema.index({ user: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'paymentInfo.transactionId': 1 });

module.exports = mongoose.model('Order', orderSchema); 