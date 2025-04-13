const Review = require('../models/review.model');
const Product = require('../models/product.model');
const Order = require('../models/order.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all reviews
 * @route   GET /api/reviews
 * @access  Public
 */
exports.getReviews = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {};
  
  // Filter by product
  if (req.query.product) {
    filter.product = req.query.product;
  }
  
  // Filter by approval status
  if (req.query.approved === 'true') {
    filter.isApproved = true;
  } else if (req.query.approved === 'false' && (req.user && ['admin', 'manager'].includes(req.user.role))) {
    filter.isApproved = false;
  } else {
    // For public access, only show approved reviews
    filter.isApproved = true;
  }
  
  // Filter by verified purchase
  if (req.query.verified === 'true') {
    filter.purchaseVerified = true;
  }
  
  // Filter by rating
  if (req.query.rating) {
    filter.rating = parseInt(req.query.rating, 10);
  }
  
  // Count total reviews
  const total = await Review.countDocuments(filter);
  
  // Get reviews with pagination
  const reviews = await Review.find(filter)
    .populate('user', 'fullName avatar')
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Pagination result
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
  
  res.status(200).json({
    success: true,
    count: reviews.length,
    pagination,
    data: reviews
  });
});

/**
 * @desc    Get review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
exports.getReviewById = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id)
    .populate('user', 'fullName avatar')
    .populate('product', 'name slug images');
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // For non-admin users, only show approved reviews
  if (!review.isApproved && (!req.user || !['admin', 'manager'].includes(req.user.role))) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: review
  });
});

/**
 * @desc    Create new review
 * @route   POST /api/reviews
 * @access  Private
 */
exports.createReview = asyncHandler(async (req, res, next) => {
  // Add user ID to request body
  req.body.user = req.user.id;
  
  // Check if product exists
  const product = await Product.findById(req.body.product);
  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }
  
  // Check if user has already reviewed this product
  const existingReview = await Review.findOne({
    user: req.user.id,
    product: req.body.product
  });
  
  if (existingReview) {
    return next(new ErrorResponse('شما قبلاً برای این محصول نظر ثبت کرده‌اید', 400));
  }
  
  // Check if user has purchased this product
  const hasPurchased = await Order.findOne({
    user: req.user.id,
    'items.product': req.body.product,
    isPaid: true
  });
  
  // Set purchase verification
  req.body.purchaseVerified = Boolean(hasPurchased);
  
  // Auto-approve reviews from admins
  if (['admin', 'manager'].includes(req.user.role)) {
    req.body.isApproved = true;
  }
  
  // Create review
  const review = await Review.create(req.body);
  
  res.status(201).json({
    success: true,
    data: review
  });
});

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
exports.updateReview = asyncHandler(async (req, res, next) => {
  let review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // Check if user is review owner or admin
  if (review.user.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Only allow updating specific fields
  const allowedFields = ['title', 'rating', 'comment', 'images'];
  
  // For admins and managers, allow updating approval status
  if (['admin', 'manager'].includes(req.user.role)) {
    allowedFields.push('isApproved');
  }
  
  // Filter request body to include only allowed fields
  const updateData = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }
  
  // Update review
  review = await Review.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: review
  });
});

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // Check if user is review owner or admin
  if (review.user.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  await review.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Approve review
 * @route   PUT /api/reviews/:id/approve
 * @access  Private (Admin/Manager)
 */
exports.approveReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: review
  });
});

/**
 * @desc    Reply to review
 * @route   PUT /api/reviews/:id/reply
 * @access  Private (Admin/Manager)
 */
exports.replyToReview = asyncHandler(async (req, res, next) => {
  const { comment } = req.body;
  
  if (!comment) {
    return next(new ErrorResponse('پاسخ الزامی است', 400));
  }
  
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    {
      reply: {
        comment,
        date: Date.now(),
        user: req.user.id
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('reply.user', 'fullName role');
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: review
  });
});

/**
 * @desc    Report review
 * @route   PUT /api/reviews/:id/report
 * @access  Private
 */
exports.reportReview = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  if (!reason) {
    return next(new ErrorResponse('دلیل گزارش الزامی است', 400));
  }
  
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // Check if user has already reported this review
  const alreadyReported = review.reports.some(
    report => report.user && report.user.toString() === req.user.id
  );
  
  if (alreadyReported) {
    return next(new ErrorResponse('شما قبلاً این نظر را گزارش کرده‌اید', 400));
  }
  
  // Add report
  review.reports.push({
    user: req.user.id,
    reason,
    date: Date.now()
  });
  
  // Increment report count
  review.reportCount += 1;
  
  // Auto-disapprove if report count exceeds threshold
  if (review.reportCount >= 5 && review.isApproved) {
    review.isApproved = false;
  }
  
  await review.save();
  
  res.status(200).json({
    success: true,
    message: 'گزارش شما با موفقیت ثبت شد'
  });
});

/**
 * @desc    Like review
 * @route   PUT /api/reviews/:id/like
 * @access  Private
 */
exports.likeReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // Increment likes
  review.likes += 1;
  await review.save();
  
  res.status(200).json({
    success: true,
    data: {
      likes: review.likes,
      dislikes: review.dislikes
    }
  });
});

/**
 * @desc    Dislike review
 * @route   PUT /api/reviews/:id/dislike
 * @access  Private
 */
exports.dislikeReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }
  
  // Increment dislikes
  review.dislikes += 1;
  await review.save();
  
  res.status(200).json({
    success: true,
    data: {
      likes: review.likes,
      dislikes: review.dislikes
    }
  });
});

/**
 * @desc    Get reviews by product
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
exports.getProductReviews = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {
    product: req.params.id,
    isApproved: true
  };
  
  // Filter by rating
  if (req.query.rating) {
    filter.rating = parseInt(req.query.rating, 10);
  }
  
  // Filter by verified purchase
  if (req.query.verified === 'true') {
    filter.purchaseVerified = true;
  }
  
  // Count total reviews
  const total = await Review.countDocuments(filter);
  
  // Get reviews with pagination
  const reviews = await Review.find(filter)
    .populate('user', 'fullName avatar')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Get rating statistics
  const stats = await Review.aggregate([
    { $match: { product: mongoose.Types.ObjectId(req.params.id), isApproved: true } },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Format rating statistics
  const ratingStats = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  
  stats.forEach(stat => {
    ratingStats[stat._id] = stat.count;
  });
  
  // Pagination result
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
  
  res.status(200).json({
    success: true,
    count: reviews.length,
    pagination,
    ratingStats,
    data: reviews
  });
});

/**
 * @desc    Get reviews by user (My reviews)
 * @route   GET /api/reviews/me
 * @access  Private
 */
exports.getMyReviews = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {
    user: req.user.id
  };
  
  // Count total reviews
  const total = await Review.countDocuments(filter);
  
  // Get reviews with pagination
  const reviews = await Review.find(filter)
    .populate('product', 'name slug images')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Pagination result
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
  
  res.status(200).json({
    success: true,
    count: reviews.length,
    pagination,
    data: reviews
  });
}); 