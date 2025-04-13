const Question = require('../models/question.model');
const Product = require('../models/product.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const mongoose = require('mongoose');

/**
 * @desc    Get all questions
 * @route   GET /api/questions
 * @access  Public
 */
exports.getQuestions = asyncHandler(async (req, res) => {
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
    // For public access, only show approved questions
    filter.isApproved = true;
  }
  
  // Filter by answer status
  if (req.query.answered === 'true') {
    filter.isAnswered = true;
  } else if (req.query.answered === 'false') {
    filter.isAnswered = false;
  }
  
  // Count total questions
  const total = await Question.countDocuments(filter);
  
  // Get questions with pagination
  const questions = await Question.find(filter)
    .populate('user', 'fullName avatar')
    .populate('product', 'name slug images')
    .populate('answer.user', 'fullName role')
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
    count: questions.length,
    pagination,
    data: questions
  });
});

/**
 * @desc    Get question by ID
 * @route   GET /api/questions/:id
 * @access  Public
 */
exports.getQuestionById = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id)
    .populate('user', 'fullName avatar')
    .populate('product', 'name slug images')
    .populate('answer.user', 'fullName role');
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // For non-admin users, only show approved questions
  if (!question.isApproved && (!req.user || !['admin', 'manager'].includes(req.user.role))) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // For private questions, only show to owner or admin
  if (question.isPrivate && (!req.user || (req.user.id !== question.user.toString() && !['admin', 'manager'].includes(req.user.role)))) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Create new question
 * @route   POST /api/questions
 * @access  Private
 */
exports.createQuestion = asyncHandler(async (req, res, next) => {
  // Add user ID to request body
  req.body.user = req.user.id;
  
  // Check if product exists
  const product = await Product.findById(req.body.product);
  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }
  
  // Auto-approve questions from admins
  if (['admin', 'manager'].includes(req.user.role)) {
    req.body.isApproved = true;
  }
  
  // Create question
  const question = await Question.create(req.body);
  
  res.status(201).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Update question
 * @route   PUT /api/questions/:id
 * @access  Private
 */
exports.updateQuestion = asyncHandler(async (req, res, next) => {
  let question = await Question.findById(req.params.id);
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // Check if user is question owner or admin
  if (question.user.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Only allow updating specific fields
  const allowedFields = ['question', 'isPrivate'];
  
  // For admins and managers, allow updating additional fields
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
  
  // Update question
  question = await Question.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Delete question
 * @route   DELETE /api/questions/:id
 * @access  Private
 */
exports.deleteQuestion = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // Check if user is question owner or admin
  if (question.user.toString() !== req.user.id && !['admin', 'manager'].includes(req.user.role)) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  await question.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Answer question
 * @route   PUT /api/questions/:id/answer
 * @access  Private (Admin/Manager)
 */
exports.answerQuestion = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  
  if (!text) {
    return next(new ErrorResponse('پاسخ الزامی است', 400));
  }
  
  const question = await Question.findByIdAndUpdate(
    req.params.id,
    {
      answer: {
        text,
        date: Date.now(),
        user: req.user.id
      },
      isAnswered: true
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('answer.user', 'fullName role');
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Approve question
 * @route   PUT /api/questions/:id/approve
 * @access  Private (Admin/Manager)
 */
exports.approveQuestion = asyncHandler(async (req, res, next) => {
  const question = await Question.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: question
  });
});

/**
 * @desc    Report question
 * @route   PUT /api/questions/:id/report
 * @access  Private
 */
exports.reportQuestion = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  if (!reason) {
    return next(new ErrorResponse('دلیل گزارش الزامی است', 400));
  }
  
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // Check if user has already reported this question
  const alreadyReported = question.reports.some(
    report => report.user && report.user.toString() === req.user.id
  );
  
  if (alreadyReported) {
    return next(new ErrorResponse('شما قبلاً این پرسش را گزارش کرده‌اید', 400));
  }
  
  // Add report
  question.reports.push({
    user: req.user.id,
    reason,
    date: Date.now()
  });
  
  // Increment report count
  question.reportCount += 1;
  
  // Auto-disapprove if report count exceeds threshold
  if (question.reportCount >= 5 && question.isApproved) {
    question.isApproved = false;
  }
  
  await question.save();
  
  res.status(200).json({
    success: true,
    message: 'گزارش شما با موفقیت ثبت شد'
  });
});

/**
 * @desc    Like question
 * @route   PUT /api/questions/:id/like
 * @access  Private
 */
exports.likeQuestion = asyncHandler(async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  
  if (!question) {
    return next(new ErrorResponse('پرسش مورد نظر یافت نشد', 404));
  }
  
  // Increment likes
  question.likes += 1;
  await question.save();
  
  res.status(200).json({
    success: true,
    data: {
      likes: question.likes
    }
  });
});

/**
 * @desc    Get questions by product
 * @route   GET /api/products/:id/questions
 * @access  Public
 */
exports.getProductQuestions = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {
    product: req.params.id,
    isApproved: true,
    isPrivate: false
  };
  
  // Filter by answer status
  if (req.query.answered === 'true') {
    filter.isAnswered = true;
  } else if (req.query.answered === 'false') {
    filter.isAnswered = false;
  }
  
  // Count total questions
  const total = await Question.countDocuments(filter);
  
  // Get questions with pagination
  const questions = await Question.find(filter)
    .populate('user', 'fullName avatar')
    .populate('answer.user', 'fullName role')
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Count questions by answer status
  const stats = {
    total,
    answered: await Question.countDocuments({ ...filter, isAnswered: true }),
    unanswered: await Question.countDocuments({ ...filter, isAnswered: false })
  };
  
  // Pagination result
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
  
  res.status(200).json({
    success: true,
    count: questions.length,
    pagination,
    stats,
    data: questions
  });
});

/**
 * @desc    Get questions by user (My questions)
 * @route   GET /api/questions/me
 * @access  Private
 */
exports.getMyQuestions = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {
    user: req.user.id
  };
  
  // Filter by answer status
  if (req.query.answered === 'true') {
    filter.isAnswered = true;
  } else if (req.query.answered === 'false') {
    filter.isAnswered = false;
  }
  
  // Count total questions
  const total = await Question.countDocuments(filter);
  
  // Get questions with pagination
  const questions = await Question.find(filter)
    .populate('product', 'name slug images')
    .populate('answer.user', 'fullName role')
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
    count: questions.length,
    pagination,
    data: questions
  });
}); 