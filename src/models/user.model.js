const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'شماره تلفن الزامی است'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'لطفا یک ایمیل معتبر وارد کنید'],
    },
    password: {
      type: String,
      minlength: [6, 'رمز عبور باید حداقل 6 کاراکتر باشد'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'manager'],
      default: 'user',
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    wallet: {
      balance: {
        type: Number,
        default: 0,
      },
      transactions: [
        {
          amount: Number,
          type: {
            type: String,
            enum: ['deposit', 'withdrawal', 'purchase', 'refund'],
          },
          description: String,
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otpCode: String,
    otpExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if profile is complete
userSchema.methods.checkProfileCompletion = function () {
  const requiredFields = ['fullName', 'email', 'address', 'postalCode'];
  const missingFields = requiredFields.filter(field => !this[field]);
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
};

// Generate and hash OTP
userSchema.methods.generateOTP = async function () {
  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash OTP and set to otpCode field
  const salt = await bcrypt.genSalt(10);
  this.otpCode = await bcrypt.hash(otp, salt);

  // Set expiry date
  this.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await this.save();

  // In development mode, log the OTP to the console for testing
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Generated OTP for ${this.phone}: ${otp}`);
  }

  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = async function (enteredOTP) {
  // Check if OTP is expired
  if (Date.now() > this.otpExpire) {
    return false;
  }

  // Match the entered OTP with the stored hash
  return await bcrypt.compare(enteredOTP, this.otpCode);
};

module.exports = mongoose.model('User', userSchema); 