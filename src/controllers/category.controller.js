const Category = require('../models/category.model');
const ErrorHandler = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = asyncHandler(async (req, res, next) => {
  const { parent, level } = req.query;
  
  let query = {};
  
  // Filter by parent category
  if (parent) {
    query.parent = parent === 'null' ? null : parent;
  }
  
  // Filter by level
  if (level) {
    query.level = level;
  }
  
  // Apply active filter for public access
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    query.isActive = true;
  }
  
  const categories = await Category.find(query)
    .sort({ position: 1, name: 1 })
    .populate('parent', 'name');
  
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * @desc    Get category by ID
 * @route   GET /api/categories/:id
 * @access  Public
 */
exports.getCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('parent', 'name')
    .populate('subcategories');
  
  if (!category) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  // Check if category is active for public access
  if (
    !category.isActive && 
    (!req.user || !['admin', 'manager'].includes(req.user.role))
  ) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Get category by slug
 * @route   GET /api/categories/slug/:slug
 * @access  Public
 */
exports.getCategoryBySlug = asyncHandler(async (req, res, next) => {
  const category = await Category.findOne({ slug: req.params.slug })
    .populate('parent', 'name')
    .populate('subcategories');
  
  if (!category) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  // Check if category is active for public access
  if (
    !category.isActive && 
    (!req.user || !['admin', 'manager'].includes(req.user.role))
  ) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private (Admin)
 */
exports.createCategory = asyncHandler(async (req, res, next) => {
  // Check if parent category exists if provided
  if (req.body.parent) {
    const parentCategory = await Category.findById(req.body.parent);
    
    if (!parentCategory) {
      return next(new ErrorHandler('دسته‌بندی والد یافت نشد', 404));
    }
    
    // Set level based on parent category
    req.body.level = parentCategory.level + 1;
  } else {
    // Top-level category
    req.body.level = 1;
  }
  
  const category = await Category.create(req.body);
  
  res.status(201).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin)
 */
exports.updateCategory = asyncHandler(async (req, res, next) => {
  let category = await Category.findById(req.params.id);
  
  if (!category) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  // Check if parent category exists if it's being updated
  if (req.body.parent !== undefined) {
    if (req.body.parent === null) {
      // Changing to top-level category
      req.body.level = 1;
    } else if (req.body.parent) {
      const parentCategory = await Category.findById(req.body.parent);
      
      if (!parentCategory) {
        return next(new ErrorHandler('دسته‌بندی والد یافت نشد', 404));
      }
      
      // Set level based on parent category
      req.body.level = parentCategory.level + 1;
      
      // Prevent circular reference
      if (req.body.parent === req.params.id) {
        return next(new ErrorHandler('یک دسته‌بندی نمی‌تواند والد خودش باشد', 400));
      }
    }
  }
  
  category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  
  res.status(200).json({
    success: true,
    data: category,
  });
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin)
 */
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await Category.findById(req.params.id);
  
  if (!category) {
    return next(new ErrorHandler('دسته‌بندی مورد نظر یافت نشد', 404));
  }
  
  // Check if category has subcategories
  const hasSubcategories = await Category.countDocuments({ parent: req.params.id });
  
  if (hasSubcategories > 0) {
    return next(
      new ErrorHandler(
        'ابتدا باید تمام زیردسته‌های این دسته‌بندی را حذف کنید',
        400
      )
    );
  }
  
  await category.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {},
    message: 'دسته‌بندی با موفقیت حذف شد',
  });
});

/**
 * @desc    Get category tree
 * @route   GET /api/categories/tree
 * @access  Public
 */
exports.getCategoryTree = asyncHandler(async (req, res, next) => {
  // Get all categories
  let categories = await Category.find(
    req.user && ['admin', 'manager'].includes(req.user.role) 
      ? {} 
      : { isActive: true }
  ).sort({ position: 1 });
  
  // Build the tree structure
  const buildTree = (parentId = null) => {
    return categories
      .filter(category => 
        parentId === null 
          ? category.parent === null 
          : category.parent && category.parent.toString() === parentId.toString()
      )
      .map(category => ({
        _id: category._id,
        name: category.name,
        slug: category.slug,
        level: category.level,
        position: category.position,
        isActive: category.isActive,
        image: category.image,
        children: buildTree(category._id),
      }));
  };
  
  const tree = buildTree();
  
  res.status(200).json({
    success: true,
    data: tree,
  });
});

/**
 * @desc    Update category positions
 * @route   PUT /api/categories/positions
 * @access  Private (Admin)
 */
exports.updatePositions = asyncHandler(async (req, res, next) => {
  const { positions } = req.body;
  
  if (!positions || !Array.isArray(positions)) {
    return next(new ErrorHandler('لطفا لیست موقعیت‌ها را ارسال کنید', 400));
  }
  
  // Update positions
  const updatePromises = positions.map(item => {
    if (!item._id || !item.hasOwnProperty('position')) {
      return null;
    }
    
    return Category.findByIdAndUpdate(
      item._id,
      { position: item.position },
      { new: true }
    );
  }).filter(Boolean);
  
  await Promise.all(updatePromises);
  
  res.status(200).json({
    success: true,
    message: 'موقعیت دسته‌بندی‌ها با موفقیت بروزرسانی شد',
  });
}); 