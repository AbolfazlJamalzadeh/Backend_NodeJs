const User = require('../models/user.model');
const ErrorHandler = require('../utils/errorHandler');
const smsService = require('../utils/smsService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { fullName, phone, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ phone });
  if (userExists) {
    return next(new ErrorHandler('کاربری با این شماره تلفن قبلا ثبت نام کرده است', 400));
  }

  // Create user
  const user = await User.create({
    fullName,
    phone,
    email,
    password,
  });

  // Check if profile is complete
  const profileStatus = user.checkProfileCompletion();
  user.isProfileCompleted = profileStatus.isComplete;
  await user.save();

  // Generate OTP code
  const otp = await user.generateOTP();
  
  // Send OTP via SMS
  try {
    await smsService.sendOTP(phone, otp);
    
    // Return response
    res.status(201).json({
      success: true,
      message: 'کاربر با موفقیت ثبت نام شد و کد تایید به شماره موبایل شما ارسال شد',
      phone: phone,
      needsVerification: true
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Even if OTP sending fails, registration is successful
    // We just don't enforce verification in that case
    sendTokenResponse(user, 201, res);
  }
});

/**
 * @desc    Login user (request OTP)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  // Check if phone is provided
  if (!phone) {
    return next(new ErrorHandler('لطفا شماره تلفن را وارد کنید', 400));
  }

  // Check if user exists
  const user = await User.findOne({ phone });
  if (!user) {
    return next(new ErrorHandler('کاربری با این شماره تلفن یافت نشد', 404));
  }

  // Generate OTP
  const otp = await user.generateOTP();
  
  // Send OTP via SMS
  try {
    await smsService.sendOTP(phone, otp);
    
    res.status(200).json({
      success: true,
      message: 'کد تایید با موفقیت ارسال شد',
      phone: phone
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return next(new ErrorHandler('خطا در ارسال کد تایید، لطفا دوباره تلاش کنید', 500));
  }
});

/**
 * @desc    Request OTP for login
 * @route   POST /api/auth/request-otp
 * @access  Public
 */
exports.requestOTP = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new ErrorHandler('لطفا شماره تلفن را وارد کنید', 400));
  }

  // Find user by phone
  let user = await User.findOne({ phone });
  if (!user) {
    return next(new ErrorHandler('کاربری با این شماره تلفن یافت نشد', 404));
  }

  // Generate OTP
  const otp = await user.generateOTP();

  // Send OTP via SMS
  try {
    await smsService.sendOTP(phone, otp);
    
    res.status(200).json({
      success: true,
      message: 'کد تایید با موفقیت ارسال شد',
      phone: phone
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return next(new ErrorHandler('خطا در ارسال کد تایید، لطفا دوباره تلاش کنید', 500));
  }
});

/**
 * @desc    Verify OTP and login
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return next(new ErrorHandler('لطفا شماره تلفن و کد تایید را وارد کنید', 400));
  }

  // Find user
  const user = await User.findOne({ phone });
  if (!user) {
    return next(new ErrorHandler('کاربری با این شماره تلفن یافت نشد', 404));
  }

  // Verify OTP
  const isValidOTP = await user.verifyOTP(otp);
  if (!isValidOTP) {
    return next(new ErrorHandler('کد تایید نامعتبر است یا منقضی شده است', 401));
  }

  // Clear OTP fields
  user.otpCode = undefined;
  user.otpExpire = undefined;
  
  // Update last login time
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  console.log(`User ${user.phone} (${user._id}) logged in successfully via OTP`);

  // Send token
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  // Check if profile is complete
  const profileStatus = user.checkProfileCompletion();
  
  res.status(200).json({
    success: true,
    data: user,
    profileStatus,
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { fullName, email, address, postalCode } = req.body;

  // Find user
  const user = await User.findById(req.user.id);

  // Update fields
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (address) user.address = address;
  if (postalCode) user.postalCode = postalCode;

  // Check if profile is complete
  const profileStatus = user.checkProfileCompletion();
  user.isProfileCompleted = profileStatus.isComplete;
  
  await user.save();

  res.status(200).json({
    success: true,
    data: user,
    profileStatus,
  });
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler('لطفا رمز عبور فعلی و رمز عبور جدید را وارد کنید', 400));
  }

  // Find user
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorHandler('رمز عبور فعلی نادرست است', 401));
  }

  // Set new password
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'رمز عبور با موفقیت بروزرسانی شد',
  });
});

/**
 * @desc    Log user out / clear cookie
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'با موفقیت خارج شدید',
    data: {},
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  // Use secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Get profile completion status
  const profileStatus = user.checkProfileCompletion();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isProfileCompleted: user.isProfileCompleted,
      profileStatus,
    },
  });
}; 