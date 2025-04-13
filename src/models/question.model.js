const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
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
    question: {
      type: String,
      required: [true, 'پرسش الزامی است'],
      trim: true,
      maxlength: [500, 'پرسش نباید بیش از 500 کاراکتر باشد'],
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isAnswered: {
      type: Boolean,
      default: false,
    },
    answer: {
      text: String,
      date: Date,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    likes: {
      type: Number,
      default: 0,
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

// Index by product and user
questionSchema.index({ product: 1, createdAt: -1 });
questionSchema.index({ user: 1, createdAt: -1 });
questionSchema.index({ isAnswered: 1, isApproved: 1 });

module.exports = mongoose.model('Question', questionSchema); 