const Product = require('../models/product.model');
const Category = require('../models/category.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const holooService = require('../utils/holooService');
const mongoose = require('mongoose');
const { getProductReviews } = require('./review.controller');
const HolooService = require('../utils/holooService');
const axios = require('axios');

/**
 * @desc    Get all products with filtering, sorting and pagination
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Build filter
  const filter = {};
  
  // Apply active filter for public access
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    filter.isActive = true;
  }
  
  // Filter by category
  if (req.query.category) {
    // Find the category and all its subcategories
    const category = await Category.findById(req.query.category);
    
    if (category) {
      // Get all subcategories recursively
      const subcategories = await getAllSubcategories(category._id);
      
      // Add category and all subcategories to filter
      filter.category = { $in: [category._id, ...subcategories] };
    }
  }
  
  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    
    if (req.query.minPrice) {
      filter.price.$gte = parseInt(req.query.minPrice, 10);
    }
    
    if (req.query.maxPrice) {
      filter.price.$lte = parseInt(req.query.maxPrice, 10);
    }
  }
  
  // Filter by availability
  if (req.query.inStock === 'true') {
    filter.inStock = true;
  }
  
  // Filter by featured
  if (req.query.featured === 'true') {
    filter.featured = true;
  }
  
  // Search query
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
      { sku: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  // Sort by
  let sortBy = {};
  if (req.query.sort) {
    switch (req.query.sort) {
      case 'newest':
        sortBy = { createdAt: -1 };
        break;
      case 'price-asc':
        sortBy = { price: 1 };
        break;
      case 'price-desc':
        sortBy = { price: -1 };
        break;
      case 'popular':
        sortBy = { viewCount: -1 };
        break;
      case 'rating':
        sortBy = { averageRating: -1 };
        break;
      default:
        sortBy = { createdAt: -1 };
    }
  } else {
    sortBy = { createdAt: -1 };
  }
  
  const total = await Product.countDocuments(filter);
  
  const products = await Product.find(filter)
    .populate('category', 'name slug')
    .select('-description -specifications -questions')
    .sort(sortBy)
    .skip(startIndex)
    .limit(limit);
  
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
    count: products.length,
    pagination,
    total,
    data: products
  });
});

/**
 * @desc    Get product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate('relatedProducts', 'name price images');

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Include review stats
  const reviewStats = await getProductReviewStats(product._id);

  // Increment view count
  product.clickCount += 1;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      ...product.toObject(),
      reviewStats
    }
  });
});

/**
 * @desc    Get product by slug
 * @route   GET /api/products/slug/:slug
 * @access  Public
 */
exports.getProductBySlug = asyncHandler(async (req, res, next) => {
  const product = await Product.findOne({ slug: req.params.slug })
    .populate('category', 'name')
    .populate('relatedProducts', 'name price images');

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Include review stats
  const reviewStats = await getProductReviewStats(product._id);

  // Increment view count
  product.clickCount += 1;
  await product.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      ...product.toObject(),
      reviewStats
    }
  });
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private (Admin)
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
  // Check if category exists - first try by ID, then by name
  let category;
  
  if (mongoose.Types.ObjectId.isValid(req.body.category)) {
    // If it's a valid ObjectId, search by ID
    category = await Category.findById(req.body.category);
  } else {
    // If not a valid ObjectId, try to find by name
    category = await Category.findOne({ name: req.body.category });
  }
  
  if (!category) {
    return next(new ErrorResponse('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  // Replace category name with category ID in request body
  req.body.category = category._id;

  // Create product
  const product = await Product.create(req.body);

  // Sync with Holoo inventory system
  try {
    await holooService.updateInventory(product._id, product.stock, 'increase');
  } catch (error) {
    console.error('Holoo sync error:', error.message);
    // Continue even if Holoo sync fails
  }

  res.status(201).json({
    success: true,
    data: product,
  });
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // If category is being updated, check if it exists
  if (req.body.category) {
    let category;
    
    if (mongoose.Types.ObjectId.isValid(req.body.category)) {
      // If it's a valid ObjectId, search by ID
      category = await Category.findById(req.body.category);
    } else {
      // If not a valid ObjectId, try to find by name
      category = await Category.findOne({ name: req.body.category });
    }
    
    if (!category) {
      return next(new ErrorResponse('دسته‌بندی مورد نظر یافت نشد', 404));
    }
    
    // Replace category name with category ID in request body
    req.body.category = category._id;
  }

  // Check if stock is updated
  const oldStock = product.stock;
  const newStock = req.body.stock !== undefined ? req.body.stock : oldStock;
  
  // Update product
  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Sync with Holoo inventory system if stock changed
  if (newStock !== oldStock) {
    try {
      const difference = newStock - oldStock;
      const operation = difference > 0 ? 'increase' : 'decrease';
      
      await holooService.updateInventory(
        product._id, 
        Math.abs(difference), 
        operation
      );
    } catch (error) {
      console.error('Holoo sync error:', error.message);
      // Continue even if Holoo sync fails
    }
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 */
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: 'محصول با موفقیت حذف شد',
  });
});

/**
 * @desc    Create product review
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
exports.createProductReview = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Check if user already reviewed
  const alreadyReviewed = product.reviews.find(
    review => review.user.toString() === req.user.id
  );

  if (alreadyReviewed) {
    return next(new ErrorResponse('شما قبلا برای این محصول نظر ثبت کرده‌اید', 400));
  }

  // Add review
  const review = {
    user: req.user.id,
    rating: Number(rating),
    comment,
    isApproved: false, // New reviews need approval
  };

  product.reviews.push(review);
  await product.save();

  res.status(201).json({
    success: true,
    message: 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد',
  });
});

/**
 * @desc    Get product reviews
 * @route   GET /api/products/:id/reviews
 * @access  Public
 */
exports.getProductReviews = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .populate({
      path: 'reviews.user',
      select: 'fullName',
    });

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Only return approved reviews for regular users
  const reviews = req.user && ['admin', 'manager'].includes(req.user.role)
    ? product.reviews
    : product.reviews.filter(review => review.isApproved);

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

/**
 * @desc    Approve product review
 * @route   PUT /api/products/reviews/:id
 * @access  Private (Admin)
 */
exports.approveReview = asyncHandler(async (req, res, next) => {
  const { productId, reviewId } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Find review
  const review = product.reviews.id(reviewId);

  if (!review) {
    return next(new ErrorResponse('نظر مورد نظر یافت نشد', 404));
  }

  // Toggle approval status
  review.isApproved = !review.isApproved;

  await product.save();

  res.status(200).json({
    success: true,
    message: `نظر با موفقیت ${review.isApproved ? 'تایید' : 'رد'} شد`,
  });
});

/**
 * @desc    Get product questions
 * @route   GET /api/products/:id/questions
 * @access  Public
 */
exports.getProductQuestions = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id)
    .select('questions')
    .populate('questions.user', 'fullName')
    .populate('questions.answeredBy', 'fullName');

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Filter questions for non-admin users
  const questions = req.user && ['admin', 'manager'].includes(req.user.role)
    ? product.questions
    : product.questions.filter(question => question.status === 'approved');

  res.status(200).json({
    success: true,
    count: questions.length,
    data: questions
  });
});

/**
 * @desc    Add product question
 * @route   POST /api/products/:id/questions
 * @access  Private
 */
exports.addProductQuestion = asyncHandler(async (req, res, next) => {
  const { question } = req.body;

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Add question
  product.questions.push({
    user: req.user.id,
    question,
    isAnswered: false,
  });

  await product.save();

  res.status(201).json({
    success: true,
    message: 'سوال شما با موفقیت ثبت شد',
  });
});

/**
 * @desc    Answer product question
 * @route   PUT /api/products/:id/questions/:questionId
 * @access  Private (Admin)
 */
exports.answerProductQuestion = asyncHandler(async (req, res, next) => {
  const { answer, status } = req.body;
  
  if (!answer && !status) {
    return next(new ErrorResponse('پاسخ یا وضعیت سوال الزامی است', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Find question
  const question = product.questions.id(req.params.questionId);

  if (!question) {
    return next(new ErrorResponse('سوال مورد نظر یافت نشد', 404));
  }

  // Update answer
  if (answer) question.answer = answer;
  if (status) question.status = status;
  
  question.isAnswered = true;
  question.answeredBy = req.user.id;
  question.answeredAt = Date.now();

  await product.save();

  res.status(200).json({
    success: true,
    message: 'پاسخ با موفقیت ثبت شد',
    data: question
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 8;
  
  const products = await Product.find({ isActive: true, featured: true })
    .populate('category', 'name slug')
    .select('-description -specifications -questions')
    .sort({ createdAt: -1 })
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

/**
 * @desc    Get recent products
 * @route   GET /api/products/recent
 * @access  Public
 */
exports.getRecentProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 8;
  
  const products = await Product.find({ isActive: true })
    .populate('category', 'name slug')
    .select('-description -specifications -questions')
    .sort({ createdAt: -1 })
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

/**
 * @desc    Get popular products
 * @route   GET /api/products/popular
 * @access  Public
 */
exports.getPopularProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 8;
  
  const products = await Product.find({ isActive: true })
    .populate('category', 'name slug')
    .select('-description -specifications -questions')
    .sort({ viewCount: -1 })
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

/**
 * @desc    Update product inventory
 * @route   PUT /api/products/:id/inventory
 * @access  Private (Admin)
 */
exports.updateProductInventory = asyncHandler(async (req, res, next) => {
  const { countInStock, trackInventory } = req.body;
  
  if (countInStock === undefined && trackInventory === undefined) {
    return next(new ErrorResponse('هیچ اطلاعاتی برای به‌روزرسانی ارسال نشده است', 400));
  }
  
  let product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }
  
  // Update inventory fields
  if (countInStock !== undefined) product.countInStock = countInStock;
  if (trackInventory !== undefined) product.trackInventory = trackInventory;
  
  // Update inStock status based on inventory
  if (product.trackInventory) {
    product.inStock = product.countInStock > 0;
  }
  
  await product.save();
  
  res.status(200).json({
    success: true,
    message: 'موجودی محصول با موفقیت به‌روزرسانی شد',
    data: {
      _id: product._id,
      countInStock: product.countInStock,
      trackInventory: product.trackInventory,
      inStock: product.inStock
    }
  });
});

// Helper function to get all subcategories recursively
const getAllSubcategories = async (categoryId) => {
  const subcategories = await Category.find({ parent: categoryId }).select('_id');
  
  let allSubcategories = subcategories.map(cat => cat._id);
  
  for (const subcat of subcategories) {
    const children = await getAllSubcategories(subcat._id);
    allSubcategories = allSubcategories.concat(children);
  }
  
  return allSubcategories;
};

// Helper function to get review stats for a product
const getProductReviewStats = async (productId) => {
  const Review = require('../models/review.model');
  
  // Get rating statistics
  const stats = await Review.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId), isApproved: true } },
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
  
  // Calculate total reviews and average rating
  const totalReviews = Object.values(ratingStats).reduce((a, b) => a + b, 0);
  let averageRating = 0;
  
  if (totalReviews > 0) {
    const sum = Object.entries(ratingStats).reduce((acc, [rating, count]) => {
      return acc + (parseInt(rating) * count);
    }, 0);
    
    averageRating = parseFloat((sum / totalReviews).toFixed(1));
  }
  
  return {
    totalReviews,
    averageRating,
    ratingStats
  };
};

/**
 * @desc    Sync products from Holoo
 * @route   POST /api/products/holoo/sync
 * @access  Private (Admin)
 */
exports.syncProductsFromHoloo = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  const updateAll = req.query.updateAll === 'true';
  
  try {
    const holooService = new HolooService();
    
    // همگام‌سازی دسته‌بندی‌ها
    const categoriesResult = await holooService.syncCategories();
    
    // همگام‌سازی محصولات
    const result = await holooService.syncProducts({
      page,
      limit,
      updateAll
    });
    
    res.status(200).json({
      success: true,
      message: 'محصولات با موفقیت از هلو همگام‌سازی شدند',
      data: {
        categories: categoriesResult,
        products: result
      }
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در همگام‌سازی با هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Get Holoo products without importing them
 * @route   GET /api/products/holoo/preview
 * @access  Private (Admin)
 */
exports.previewHolooProducts = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  
  try {
    const holooService = new HolooService();
    const products = await holooService.getProducts(page, limit);
    
    res.status(200).json({
      success: true,
      count: products.product?.length || 0,
      data: products.product || []
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در دریافت محصولات هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Start Holoo periodic sync
 * @route   POST /api/products/holoo/start-periodic-sync
 * @access  Private (Admin)
 */
exports.startHolooPeriodicSync = asyncHandler(async (req, res, next) => {
  try {
    const interval = parseInt(req.query.interval, 10) || 60; // Default: 60 minutes
    
    const holooService = new HolooService();
    holooService.syncInterval = interval * 60 * 1000; // Convert to milliseconds
    holooService.startPeriodicSync();
    
    res.status(200).json({
      success: true,
      message: `همگام‌سازی دوره‌ای با هلو هر ${interval} دقیقه شروع شد`
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در شروع همگام‌سازی دوره‌ای با هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Stop Holoo periodic sync
 * @route   POST /api/products/holoo/stop-periodic-sync
 * @access  Private (Admin)
 */
exports.stopHolooPeriodicSync = asyncHandler(async (req, res, next) => {
  try {
    const holooService = new HolooService();
    holooService.stopPeriodicSync();
    
    res.status(200).json({
      success: true,
      message: 'همگام‌سازی دوره‌ای با هلو متوقف شد'
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در توقف همگام‌سازی دوره‌ای با هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Import a single product from Holoo
 * @route   POST /api/products/holoo/import/:erpCode
 * @access  Private (Admin)
 */
exports.importSingleProduct = asyncHandler(async (req, res, next) => {
  const { erpCode } = req.params;
  
  if (!erpCode) {
    return next(new ErrorResponse('کد محصول هلو الزامی است', 400));
  }
  
  try {
    const holooService = new HolooService();
    
    // دریافت محصول از هلو با کد ErpCode
    const response = await axios.get(`${holooService.baseUrl}/Product?erpCode=${erpCode}`, {
      headers: {
        'Authorization': await holooService.ensureAuthenticated(),
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.product || !response.data.product.length) {
      return next(new ErrorResponse('محصول در هلو یافت نشد', 404));
    }
    
    const holooProduct = response.data.product[0];
    
    // همگام‌سازی دسته‌بندی‌ها
    await holooService.syncCategories();
    
    // جستجوی دسته‌بندی متناظر
    let category = null;
    
    if (holooProduct.SideGroupErpCode) {
      category = await Category.findOne({ holooErpCode: holooProduct.SideGroupErpCode });
    }
    
    if (!category && holooProduct.MainGroupErpCode) {
      category = await Category.findOne({ holooErpCode: holooProduct.MainGroupErpCode });
    }
    
    // اگر دسته‌بندی پیدا نشد، از دسته‌بندی پیش‌فرض استفاده کنید
    if (!category) {
      category = await Category.findOne({ name: 'متفرقه' });
      
      // ایجاد دسته‌بندی پیش‌فرض اگر وجود ندارد
      if (!category) {
        category = await Category.create({
          name: 'متفرقه',
          slug: 'miscellaneous',
          isMainCategory: true
        });
      }
    }
    
    // تبدیل داده‌های هلو به فرمت مورد نیاز سایت
    const productData = {
      name: holooProduct.Name,
      description: `محصول ${holooProduct.Name} از هلو همگام‌سازی شده است.`,
      price: holooProduct.SellPrice || 0,
      comparePrice: holooProduct.SellPrice2 || 0,
      category: category._id,
      stock: holooProduct.Few || 0,
      holooErpCode: holooProduct.ErpCode,
      holooCode: holooProduct.Code,
      specifications: [
        { title: 'کد محصول', value: holooProduct.Code },
        { title: 'واحد', value: holooProduct.unitTitle || 'عدد' }
      ],
      isActive: true,
      syncedFromHoloo: true,
      lastHolooSync: new Date(),
      holooSyncDetails: {
        unitTitle: holooProduct.unitTitle,
        mainGroupErpCode: holooProduct.MainGroupErpCode,
        sideGroupErpCode: holooProduct.SideGroupErpCode
      }
    };
    
    // افزودن قیمت‌های بیشتر به مشخصات
    if (holooProduct.SellPrice3) {
      productData.specifications.push({ title: 'قیمت ۳', value: holooProduct.SellPrice3.toString() });
    }
    
    // جستجوی محصول موجود با کد ErpCode هلو
    let product = await Product.findOne({ holooErpCode: holooProduct.ErpCode });
    
    if (product) {
      // بروزرسانی محصول موجود
      Object.assign(product, productData);
      await product.save();
      
      res.status(200).json({
        success: true,
        message: `محصول ${holooProduct.Name} با موفقیت به‌روزرسانی شد`,
        data: product
      });
    } else {
      // ایجاد محصول جدید
      product = await Product.create(productData);
      
      res.status(201).json({
        success: true,
        message: `محصول ${holooProduct.Name} با موفقیت وارد شد`,
        data: product
      });
    }
  } catch (error) {
    return next(new ErrorResponse(`خطا در وارد کردن محصول از هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Get Holoo sync status
 * @route   GET /api/products/holoo/status
 * @access  Private (Admin)
 */
exports.getHolooSyncStatus = asyncHandler(async (req, res, next) => {
  try {
    // تعداد محصولات همگام‌سازی شده با هلو
    const syncedProductsCount = await Product.countDocuments({ syncedFromHoloo: true });
    
    // تعداد محصولات همگام‌سازی شده در 24 ساعت گذشته
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentlySyncedCount = await Product.countDocuments({
      syncedFromHoloo: true,
      lastHolooSync: { $gte: oneDayAgo }
    });
    
    // آخرین محصولات همگام‌سازی شده
    const recentSyncedProducts = await Product.find({ syncedFromHoloo: true })
      .sort({ lastHolooSync: -1 })
      .limit(5)
      .select('name stock price lastHolooSync');
    
    res.status(200).json({
      success: true,
      data: {
        totalSyncedProducts: syncedProductsCount,
        recentlySyncedCount,
        recentSyncedProducts
      }
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در دریافت وضعیت همگام‌سازی با هلو: ${error.message}`, 500));
  }
}); 