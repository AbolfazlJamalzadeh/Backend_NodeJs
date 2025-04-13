const Coupon = require('../models/coupon.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create a new coupon
 * @route   POST /api/coupons
 * @access  Private/Admin
 */
exports.createCoupon = asyncHandler(async (req, res, next) => {
  const {
    code,
    discountType,
    discountValue,
    maxDiscount,
    minPurchase,
    expiresAt,
    maxUsageCount,
    isSingleUse,
    isActive,
    description,
    productRestrictions,
    categoryRestrictions
  } = req.body;

  // Check if coupon code already exists
  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    return next(new ErrorResponse('کد تخفیف قبلاً در سیستم ثبت شده است', 400));
  }

  // Validate discount value
  if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
    return next(new ErrorResponse('درصد تخفیف باید بین 1 تا 100 باشد', 400));
  }

  if (discountType === 'fixed' && discountValue <= 0) {
    return next(new ErrorResponse('مقدار تخفیف باید بزرگتر از صفر باشد', 400));
  }

  // Create coupon
  const coupon = await Coupon.create({
    code,
    discountType,
    discountValue,
    maxDiscount,
    minPurchase,
    expiresAt,
    usageLimit: maxUsageCount,
    isSingleUse,
    isActive,
    description,
    productRestrictions,
    categoryRestrictions,
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: 'کد تخفیف با موفقیت ایجاد شد',
    data: coupon
  });
});

/**
 * @desc    Get all coupons
 * @route   GET /api/coupons
 * @access  Private/Admin
 */
exports.getCoupons = asyncHandler(async (req, res) => {
  // Build filter
  const filter = {};
  
  // Filter by active status
  if (req.query.isActive) {
    filter.isActive = req.query.isActive === 'true';
  }
  
  // Filter by expiry status
  if (req.query.expired === 'true') {
    filter.expiresAt = { $lt: new Date() };
  } else if (req.query.expired === 'false') {
    filter.expiresAt = { $gt: new Date() };
  }
  
  // Search by code
  if (req.query.code) {
    filter.code = { $regex: req.query.code, $options: 'i' };
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const total = await Coupon.countDocuments(filter);
  
  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('createdBy', 'name');
  
  // Pagination result
  const pagination = {};
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: coupons.length,
    pagination,
    total,
    data: coupons
  });
});

/**
 * @desc    Get coupon by ID
 * @route   GET /api/coupons/:id
 * @access  Private/Admin
 */
exports.getCouponById = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id).populate('createdBy', 'name');
  
  if (!coupon) {
    return next(new ErrorResponse('کد تخفیف مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: coupon
  });
});

/**
 * @desc    Update coupon
 * @route   PUT /api/coupons/:id
 * @access  Private/Admin
 */
exports.updateCoupon = asyncHandler(async (req, res, next) => {
  const {
    code,
    discountType,
    discountValue,
    maxDiscount,
    minPurchase,
    expiresAt,
    maxUsageCount,
    isSingleUse,
    isActive,
    description,
    productRestrictions,
    categoryRestrictions
  } = req.body;

  let coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return next(new ErrorResponse('کد تخفیف مورد نظر یافت نشد', 404));
  }

  // Check if new code already exists (if code is being changed)
  if (code && code !== coupon.code) {
    const existingCoupon = await Coupon.findOne({ code });
    if (existingCoupon) {
      return next(new ErrorResponse('کد تخفیف قبلاً در سیستم ثبت شده است', 400));
    }
  }

  // Validate discount value
  if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
    return next(new ErrorResponse('درصد تخفیف باید بین 1 تا 100 باشد', 400));
  }

  if (discountType === 'fixed' && discountValue <= 0) {
    return next(new ErrorResponse('مقدار تخفیف باید بزرگتر از صفر باشد', 400));
  }

  // Update coupon
  coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    {
      code,
      discountType,
      discountValue,
      maxDiscount,
      minPurchase,
      expiresAt,
      usageLimit: maxUsageCount,
      isSingleUse,
      isActive,
      description,
      productRestrictions,
      categoryRestrictions,
      updatedBy: req.user.id,
      updatedAt: Date.now()
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'کد تخفیف با موفقیت به‌روزرسانی شد',
    data: coupon
  });
});

/**
 * @desc    Delete coupon
 * @route   DELETE /api/coupons/:id
 * @access  Private/Admin
 */
exports.deleteCoupon = asyncHandler(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  
  if (!coupon) {
    return next(new ErrorResponse('کد تخفیف مورد نظر یافت نشد', 404));
  }
  
  await coupon.remove();
  
  res.status(200).json({
    success: true,
    message: 'کد تخفیف با موفقیت حذف شد',
    data: {}
  });
});

/**
 * @desc    Validate coupon
 * @route   POST /api/coupons/validate
 * @access  Private
 */
exports.validateCoupon = asyncHandler(async (req, res, next) => {
  const { code, cartTotal } = req.body;
  
  if (!code) {
    return next(new ErrorResponse('کد تخفیف الزامی است', 400));
  }
  
  // Find the coupon
  const coupon = await Coupon.findOne({ 
    code, 
    isActive: true,
    expiresAt: { $gt: Date.now() }
  });
  
  if (!coupon) {
    return next(new ErrorResponse('کد تخفیف نامعتبر است یا منقضی شده است', 400));
  }
  
  // Check usage limit
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return next(new ErrorResponse('این کد تخفیف به حداکثر تعداد استفاده رسیده است', 400));
  }
  
  // Check if user has already used this coupon (if it's single-use per user)
  if (coupon.isSingleUse) {
    const hasUsed = coupon.usedBy.some(
      u => u.user.toString() === req.user.id
    );
    
    if (hasUsed) {
      return next(new ErrorResponse('شما قبلاً از این کد تخفیف استفاده کرده‌اید', 400));
    }
  }
  
  // Check minimum purchase requirement
  if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
    return next(
      new ErrorResponse(
        `حداقل مبلغ خرید برای این کد تخفیف ${coupon.minPurchase.toLocaleString()} تومان است`, 
        400
      )
    );
  }
  
  // Calculate discount
  let discountAmount = 0;
  
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartTotal * coupon.discountValue) / 100;
    
    // Apply max discount cap if it exists
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else { // fixed amount
    discountAmount = coupon.discountValue;
  }
  
  res.status(200).json({
    success: true,
    message: 'کد تخفیف معتبر است',
    data: {
      coupon,
      discountAmount,
      finalPrice: cartTotal - discountAmount
    }
  });
}); 