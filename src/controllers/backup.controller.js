const Product = require('../models/product.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const Category = require('../models/category.model');
const Review = require('../models/review.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const archiver = require('archiver');
const crypto = require('crypto');

/**
 * @desc    Create backup of products
 * @route   GET /api/backup/products
 * @access  Private (Admin)
 */
exports.backupProducts = asyncHandler(async (req, res, next) => {
  // Get all products with their categories and specifications
  const products = await Product.find({})
    .populate('category', 'name')
    .select('-__v');

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(backupDir, `products_backup_${timestamp}.json`);

  // Write backup to file
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2));

  // Generate CSV file as well
  const csvWriter = createObjectCsvWriter({
    path: path.join(backupDir, `products_backup_${timestamp}.csv`),
    header: [
      { id: '_id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'slug', title: 'Slug' },
      { id: 'price', title: 'Price' },
      { id: 'salePrice', title: 'Sale Price' },
      { id: 'countInStock', title: 'Count In Stock' },
      { id: 'inStock', title: 'In Stock' },
      { id: 'brand', title: 'Brand' },
      { id: 'category.name', title: 'Category' },
      { id: 'createdAt', title: 'Created At' },
      { id: 'updatedAt', title: 'Updated At' }
    ]
  });

  // Transform data for CSV
  const csvData = products.map(product => {
    const item = { ...product.toObject() };
    // Handle nested objects
    if (item.category && typeof item.category === 'object') {
      item['category.name'] = item.category.name;
    }
    return item;
  });

  await csvWriter.writeRecords(csvData);

  res.status(200).json({
    success: true,
    message: 'Products backup created successfully',
    data: {
      jsonFile: `/backups/products_backup_${timestamp}.json`,
      csvFile: `/backups/products_backup_${timestamp}.csv`
    }
  });
});

/**
 * @desc    Create backup of users
 * @route   GET /api/backup/users
 * @access  Private (Admin)
 */
exports.backupUsers = asyncHandler(async (req, res, next) => {
  // Get all users (excluding sensitive data)
  const users = await User.find({})
    .select('-password -resetPasswordToken -resetPasswordExpire -createdAt -updatedAt -__v');

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(backupDir, `users_backup_${timestamp}.json`);

  // Write backup to file
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

  // Generate CSV file
  const csvWriter = createObjectCsvWriter({
    path: path.join(backupDir, `users_backup_${timestamp}.csv`),
    header: [
      { id: '_id', title: 'ID' },
      { id: 'fullName', title: 'Full Name' },
      { id: 'email', title: 'Email' },
      { id: 'phone', title: 'Phone' },
      { id: 'role', title: 'Role' },
      { id: 'isActive', title: 'Is Active' }
    ]
  });

  await csvWriter.writeRecords(users);

  res.status(200).json({
    success: true,
    message: 'Users backup created successfully',
    data: {
      jsonFile: `/backups/users_backup_${timestamp}.json`,
      csvFile: `/backups/users_backup_${timestamp}.csv`
    }
  });
});

/**
 * @desc    Create backup of orders
 * @route   GET /api/backup/orders
 * @access  Private (Admin)
 */
exports.backupOrders = asyncHandler(async (req, res, next) => {
  // Get all orders with minimal customer information
  const orders = await Order.find({})
    .populate('user', 'fullName email phone')
    .select('-__v');

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(backupDir, `orders_backup_${timestamp}.json`);

  // Write backup to file
  fs.writeFileSync(filePath, JSON.stringify(orders, null, 2));

  // Generate CSV file
  const csvWriter = createObjectCsvWriter({
    path: path.join(backupDir, `orders_backup_${timestamp}.csv`),
    header: [
      { id: '_id', title: 'Order ID' },
      { id: 'orderNumber', title: 'Order Number' },
      { id: 'user.fullName', title: 'Customer Name' },
      { id: 'user.email', title: 'Customer Email' },
      { id: 'totalPrice', title: 'Total Price' },
      { id: 'status', title: 'Status' },
      { id: 'paymentStatus', title: 'Payment Status' },
      { id: 'paymentMethod', title: 'Payment Method' },
      { id: 'createdAt', title: 'Created At' }
    ]
  });

  // Transform data for CSV
  const csvData = orders.map(order => {
    const item = { ...order.toObject() };
    // Handle nested objects
    if (item.user && typeof item.user === 'object') {
      item['user.fullName'] = item.user.fullName;
      item['user.email'] = item.user.email;
    }
    return item;
  });

  await csvWriter.writeRecords(csvData);

  res.status(200).json({
    success: true,
    message: 'Orders backup created successfully',
    data: {
      jsonFile: `/backups/orders_backup_${timestamp}.json`,
      csvFile: `/backups/orders_backup_${timestamp}.csv`
    }
  });
});

/**
 * @desc    Create backup of categories
 * @route   GET /api/backup/categories
 * @access  Private (Admin)
 */
exports.backupCategories = asyncHandler(async (req, res, next) => {
  // Get all categories
  const categories = await Category.find({});

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(backupDir, `categories_backup_${timestamp}.json`);

  // Write backup to file
  fs.writeFileSync(filePath, JSON.stringify(categories, null, 2));

  // Generate CSV file
  const csvWriter = createObjectCsvWriter({
    path: path.join(backupDir, `categories_backup_${timestamp}.csv`),
    header: [
      { id: '_id', title: 'ID' },
      { id: 'name', title: 'Name' },
      { id: 'slug', title: 'Slug' },
      { id: 'parent', title: 'Parent ID' },
      { id: 'icon', title: 'Icon' }
    ]
  });

  await csvWriter.writeRecords(categories);

  res.status(200).json({
    success: true,
    message: 'Categories backup created successfully',
    data: {
      jsonFile: `/backups/categories_backup_${timestamp}.json`,
      csvFile: `/backups/categories_backup_${timestamp}.csv`
    }
  });
});

/**
 * @desc    Create backup of reviews
 * @route   GET /api/backup/reviews
 * @access  Private (Admin)
 */
exports.backupReviews = asyncHandler(async (req, res, next) => {
  // Get all reviews
  const reviews = await Review.find({})
    .populate('user', 'fullName')
    .populate('product', 'name')
    .select('-__v');

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filePath = path.join(backupDir, `reviews_backup_${timestamp}.json`);

  // Write backup to file
  fs.writeFileSync(filePath, JSON.stringify(reviews, null, 2));

  // Generate CSV file
  const csvWriter = createObjectCsvWriter({
    path: path.join(backupDir, `reviews_backup_${timestamp}.csv`),
    header: [
      { id: '_id', title: 'ID' },
      { id: 'user.fullName', title: 'User' },
      { id: 'product.name', title: 'Product' },
      { id: 'rating', title: 'Rating' },
      { id: 'title', title: 'Title' },
      { id: 'comment', title: 'Comment' },
      { id: 'isApproved', title: 'Is Approved' },
      { id: 'isVerifiedPurchase', title: 'Is Verified Purchase' },
      { id: 'createdAt', title: 'Created At' }
    ]
  });

  // Transform data for CSV
  const csvData = reviews.map(review => {
    const item = { ...review.toObject() };
    // Handle nested objects
    if (item.user && typeof item.user === 'object') {
      item['user.fullName'] = item.user.fullName;
    }
    if (item.product && typeof item.product === 'object') {
      item['product.name'] = item.product.name;
    }
    return item;
  });

  await csvWriter.writeRecords(csvData);

  res.status(200).json({
    success: true,
    message: 'Reviews backup created successfully',
    data: {
      jsonFile: `/backups/reviews_backup_${timestamp}.json`,
      csvFile: `/backups/reviews_backup_${timestamp}.csv`
    }
  });
});

/**
 * @desc    Create complete backup of all entities
 * @route   GET /api/backup/full
 * @access  Private (Admin)
 */
exports.createFullBackup = asyncHandler(async (req, res, next) => {
  // Get all data
  const products = await Product.find({}).populate('category', 'name');
  const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpire');
  const orders = await Order.find({}).populate('user', 'fullName email phone');
  const categories = await Category.find({});
  const reviews = await Review.find({}).populate('user', 'fullName').populate('product', 'name');

  // Create backup directory if it doesn't exist
  const backupDir = path.join(__dirname, '../../public/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const backupFolder = path.join(backupDir, `full_backup_${timestamp}`);
  
  // Create backup folder
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  // Write backup files
  fs.writeFileSync(path.join(backupFolder, 'products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(backupFolder, 'users.json'), JSON.stringify(users, null, 2));
  fs.writeFileSync(path.join(backupFolder, 'orders.json'), JSON.stringify(orders, null, 2));
  fs.writeFileSync(path.join(backupFolder, 'categories.json'), JSON.stringify(categories, null, 2));
  fs.writeFileSync(path.join(backupFolder, 'reviews.json'), JSON.stringify(reviews, null, 2));

  // Create a zip file
  const zipPath = path.join(backupDir, `full_backup_${timestamp}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });

  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add files to the archive
  archive.directory(backupFolder, false);
  
  // Finalize the archive
  await archive.finalize();

  // Return the path to the zip file
  res.status(200).json({
    success: true,
    message: 'Full backup created successfully',
    data: {
      zipFile: `/backups/full_backup_${timestamp}.zip`
    }
  });
});

/**
 * @desc    Restore products from backup file
 * @route   POST /api/backup/restore/products
 * @access  Private (Admin)
 */
exports.restoreProducts = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/json')) {
    return next(new ErrorResponse('Please upload a valid JSON backup file', 400));
  }

  try {
    // Parse the JSON data
    const productsData = JSON.parse(file.data.toString());
    
    // Validate backup data
    if (!Array.isArray(productsData)) {
      return next(new ErrorResponse('Invalid backup file format', 400));
    }

    // Count products before restoration
    const countBefore = await Product.countDocuments();
    
    // Process each product
    let restoredCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const product of productsData) {
      try {
        // Check if product exists by ID
        const existingProduct = await Product.findById(product._id);
        
        if (existingProduct) {
          // Update existing product
          await Product.findByIdAndUpdate(product._id, product, { 
            runValidators: true 
          });
          updatedCount++;
        } else {
          // Create new product
          await Product.create({
            ...product,
            _id: product._id // Preserve original ID
          });
          restoredCount++;
        }
      } catch (err) {
        console.error(`Error processing product ${product._id || 'unknown'}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Count products after restoration
    const countAfter = await Product.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Products restored successfully',
      data: {
        totalProcessed: productsData.length,
        restoredCount,
        updatedCount,
        errorCount,
        countBefore,
        countAfter
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Error parsing backup file: ' + err.message, 400));
  }
});

/**
 * @desc    Restore users from backup file
 * @route   POST /api/backup/restore/users
 * @access  Private (Admin)
 */
exports.restoreUsers = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/json')) {
    return next(new ErrorResponse('Please upload a valid JSON backup file', 400));
  }

  try {
    // Parse the JSON data
    const usersData = JSON.parse(file.data.toString());
    
    // Validate backup data
    if (!Array.isArray(usersData)) {
      return next(new ErrorResponse('Invalid backup file format', 400));
    }

    // Count users before restoration
    const countBefore = await User.countDocuments();
    
    // Process each user
    let restoredCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const user of usersData) {
      try {
        // Check if user exists by ID or email
        const existingUser = await User.findOne({ 
          $or: [
            { _id: user._id },
            { email: user.email }
          ] 
        });
        
        if (existingUser) {
          // Update existing user
          // Note: Do not overwrite password or sensitive fields
          const updateData = {
            ...user,
            password: existingUser.password,
            resetPasswordToken: existingUser.resetPasswordToken,
            resetPasswordExpire: existingUser.resetPasswordExpire
          };
          
          await User.findByIdAndUpdate(existingUser._id, updateData, { 
            runValidators: true 
          });
          updatedCount++;
        } else {
          // For new users, we need to generate a random password
          // since backup files shouldn't contain real passwords
          const randomPassword = Math.random().toString(36).slice(-8);
          
          await User.create({
            ...user,
            _id: user._id, // Preserve original ID
            password: randomPassword,
            // Set password reset token so user must reset password on first login
            resetPasswordToken: crypto.randomBytes(20).toString('hex'),
            resetPasswordExpire: Date.now() + 24 * 60 * 60 * 1000
          });
          restoredCount++;
        }
      } catch (err) {
        console.error(`Error processing user ${user._id || user.email || 'unknown'}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Count users after restoration
    const countAfter = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Users restored successfully',
      data: {
        totalProcessed: usersData.length,
        restoredCount,
        updatedCount,
        errorCount,
        countBefore,
        countAfter
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Error parsing backup file: ' + err.message, 400));
  }
});

/**
 * @desc    Restore orders from backup file
 * @route   POST /api/backup/restore/orders
 * @access  Private (Admin)
 */
exports.restoreOrders = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/json')) {
    return next(new ErrorResponse('Please upload a valid JSON backup file', 400));
  }

  try {
    // Parse the JSON data
    const ordersData = JSON.parse(file.data.toString());
    
    // Validate backup data
    if (!Array.isArray(ordersData)) {
      return next(new ErrorResponse('Invalid backup file format', 400));
    }

    // Count orders before restoration
    const countBefore = await Order.countDocuments();
    
    // Process each order
    let restoredCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const order of ordersData) {
      try {
        // Check if order exists by ID or order number
        const existingOrder = await Order.findOne({ 
          $or: [
            { _id: order._id },
            { orderNumber: order.orderNumber }
          ] 
        });
        
        if (existingOrder) {
          // Update existing order
          await Order.findByIdAndUpdate(existingOrder._id, order, { 
            runValidators: true 
          });
          updatedCount++;
        } else {
          // Create new order
          await Order.create({
            ...order,
            _id: order._id // Preserve original ID
          });
          restoredCount++;
        }
      } catch (err) {
        console.error(`Error processing order ${order._id || order.orderNumber || 'unknown'}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Count orders after restoration
    const countAfter = await Order.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Orders restored successfully',
      data: {
        totalProcessed: ordersData.length,
        restoredCount,
        updatedCount,
        errorCount,
        countBefore,
        countAfter
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Error parsing backup file: ' + err.message, 400));
  }
});

/**
 * @desc    Restore categories from backup file
 * @route   POST /api/backup/restore/categories
 * @access  Private (Admin)
 */
exports.restoreCategories = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/json')) {
    return next(new ErrorResponse('Please upload a valid JSON backup file', 400));
  }

  try {
    // Parse the JSON data
    const categoriesData = JSON.parse(file.data.toString());
    
    // Validate backup data
    if (!Array.isArray(categoriesData)) {
      return next(new ErrorResponse('Invalid backup file format', 400));
    }

    // Count categories before restoration
    const countBefore = await Category.countDocuments();
    
    // Process each category
    let restoredCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const category of categoriesData) {
      try {
        // Check if category exists by ID or slug
        const existingCategory = await Category.findOne({ 
          $or: [
            { _id: category._id },
            { slug: category.slug }
          ] 
        });
        
        if (existingCategory) {
          // Update existing category
          await Category.findByIdAndUpdate(existingCategory._id, category, { 
            runValidators: true 
          });
          updatedCount++;
        } else {
          // Create new category
          await Category.create({
            ...category,
            _id: category._id // Preserve original ID
          });
          restoredCount++;
        }
      } catch (err) {
        console.error(`Error processing category ${category._id || category.name || 'unknown'}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Count categories after restoration
    const countAfter = await Category.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Categories restored successfully',
      data: {
        totalProcessed: categoriesData.length,
        restoredCount,
        updatedCount,
        errorCount,
        countBefore,
        countAfter
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Error parsing backup file: ' + err.message, 400));
  }
});

/**
 * @desc    Restore reviews from backup file
 * @route   POST /api/backup/restore/reviews
 * @access  Private (Admin)
 */
exports.restoreReviews = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/json')) {
    return next(new ErrorResponse('Please upload a valid JSON backup file', 400));
  }

  try {
    // Parse the JSON data
    const reviewsData = JSON.parse(file.data.toString());
    
    // Validate backup data
    if (!Array.isArray(reviewsData)) {
      return next(new ErrorResponse('Invalid backup file format', 400));
    }

    // Count reviews before restoration
    const countBefore = await Review.countDocuments();
    
    // Process each review
    let restoredCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const review of reviewsData) {
      try {
        // Check if review exists by ID
        const existingReview = await Review.findById(review._id);
        
        if (existingReview) {
          // Update existing review
          await Review.findByIdAndUpdate(review._id, review, { 
            runValidators: true 
          });
          updatedCount++;
        } else {
          // Create new review
          await Review.create({
            ...review,
            _id: review._id // Preserve original ID
          });
          restoredCount++;
        }
      } catch (err) {
        console.error(`Error processing review ${review._id || 'unknown'}: ${err.message}`);
        errorCount++;
      }
    }
    
    // Count reviews after restoration
    const countAfter = await Review.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Reviews restored successfully',
      data: {
        totalProcessed: reviewsData.length,
        restoredCount,
        updatedCount,
        errorCount,
        countBefore,
        countAfter
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Error parsing backup file: ' + err.message, 400));
  }
});

/**
 * @desc    Restore full backup from zip file
 * @route   POST /api/backup/restore/full
 * @access  Private (Admin)
 */
exports.restoreFullBackup = asyncHandler(async (req, res, next) => {
  // Check if file exists in request
  if (!req.files || !req.files.backup) {
    return next(new ErrorResponse('Please upload a backup zip file', 400));
  }

  const file = req.files.backup;

  // Check file type
  if (!file.mimetype.startsWith('application/zip')) {
    return next(new ErrorResponse('Please upload a valid ZIP backup file', 400));
  }

  // Create temporary directory for extraction
  const tempDir = path.join(__dirname, '../../public/backups/temp_restore_' + Date.now());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const zipPath = path.join(tempDir, 'backup.zip');
  
  try {
    // Save the zip file
    await file.mv(zipPath);
    
    // Extract the zip file
    const extract = require('extract-zip');
    await extract(zipPath, { dir: tempDir });
    
    // Check if required files exist
    const requiredFiles = ['products.json', 'users.json', 'orders.json', 'categories.json', 'reviews.json'];
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(tempDir, file))) {
        return next(new ErrorResponse(`Backup is missing required file: ${file}`, 400));
      }
    }
    
    // Create result object
    const result = {
      products: { totalProcessed: 0, restoredCount: 0, updatedCount: 0, errorCount: 0 },
      users: { totalProcessed: 0, restoredCount: 0, updatedCount: 0, errorCount: 0 },
      orders: { totalProcessed: 0, restoredCount: 0, updatedCount: 0, errorCount: 0 },
      categories: { totalProcessed: 0, restoredCount: 0, updatedCount: 0, errorCount: 0 },
      reviews: { totalProcessed: 0, restoredCount: 0, updatedCount: 0, errorCount: 0 }
    };
    
    // Restore categories first (needed for product relationships)
    const categoriesData = JSON.parse(fs.readFileSync(path.join(tempDir, 'categories.json'), 'utf8'));
    result.categories.totalProcessed = categoriesData.length;
    
    for (const category of categoriesData) {
      try {
        const existingCategory = await Category.findOne({ 
          $or: [{ _id: category._id }, { slug: category.slug }] 
        });
        
        if (existingCategory) {
          await Category.findByIdAndUpdate(existingCategory._id, category);
          result.categories.updatedCount++;
        } else {
          await Category.create({ ...category, _id: category._id });
          result.categories.restoredCount++;
        }
      } catch (err) {
        console.error(`Error restoring category: ${err.message}`);
        result.categories.errorCount++;
      }
    }
    
    // Restore users
    const usersData = JSON.parse(fs.readFileSync(path.join(tempDir, 'users.json'), 'utf8'));
    result.users.totalProcessed = usersData.length;
    
    for (const user of usersData) {
      try {
        const existingUser = await User.findOne({ 
          $or: [{ _id: user._id }, { email: user.email }] 
        });
        
        if (existingUser) {
          // Keep existing passwords and sensitive info
          const updateData = {
            ...user,
            password: existingUser.password,
            resetPasswordToken: existingUser.resetPasswordToken,
            resetPasswordExpire: existingUser.resetPasswordExpire
          };
          
          await User.findByIdAndUpdate(existingUser._id, updateData);
          result.users.updatedCount++;
        } else {
          // For new users, generate random password
          const randomPassword = Math.random().toString(36).slice(-8);
          await User.create({
            ...user,
            _id: user._id,
            password: randomPassword,
            resetPasswordToken: crypto.randomBytes(20).toString('hex'),
            resetPasswordExpire: Date.now() + 24 * 60 * 60 * 1000
          });
          result.users.restoredCount++;
        }
      } catch (err) {
        console.error(`Error restoring user: ${err.message}`);
        result.users.errorCount++;
      }
    }
    
    // Restore products
    const productsData = JSON.parse(fs.readFileSync(path.join(tempDir, 'products.json'), 'utf8'));
    result.products.totalProcessed = productsData.length;
    
    for (const product of productsData) {
      try {
        const existingProduct = await Product.findById(product._id);
        
        if (existingProduct) {
          await Product.findByIdAndUpdate(product._id, product);
          result.products.updatedCount++;
        } else {
          await Product.create({ ...product, _id: product._id });
          result.products.restoredCount++;
        }
      } catch (err) {
        console.error(`Error restoring product: ${err.message}`);
        result.products.errorCount++;
      }
    }
    
    // Restore orders
    const ordersData = JSON.parse(fs.readFileSync(path.join(tempDir, 'orders.json'), 'utf8'));
    result.orders.totalProcessed = ordersData.length;
    
    for (const order of ordersData) {
      try {
        const existingOrder = await Order.findOne({ 
          $or: [{ _id: order._id }, { orderNumber: order.orderNumber }] 
        });
        
        if (existingOrder) {
          await Order.findByIdAndUpdate(existingOrder._id, order);
          result.orders.updatedCount++;
        } else {
          await Order.create({ ...order, _id: order._id });
          result.orders.restoredCount++;
        }
      } catch (err) {
        console.error(`Error restoring order: ${err.message}`);
        result.orders.errorCount++;
      }
    }
    
    // Restore reviews
    const reviewsData = JSON.parse(fs.readFileSync(path.join(tempDir, 'reviews.json'), 'utf8'));
    result.reviews.totalProcessed = reviewsData.length;
    
    for (const review of reviewsData) {
      try {
        const existingReview = await Review.findById(review._id);
        
        if (existingReview) {
          await Review.findByIdAndUpdate(review._id, review);
          result.reviews.updatedCount++;
        } else {
          await Review.create({ ...review, _id: review._id });
          result.reviews.restoredCount++;
        }
      } catch (err) {
        console.error(`Error restoring review: ${err.message}`);
        result.reviews.errorCount++;
      }
    }
    
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    res.status(200).json({
      success: true,
      message: 'Full backup restored successfully',
      data: result
    });
  } catch (err) {
    // Clean up temporary files in case of error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    return next(new ErrorResponse('Error restoring backup: ' + err.message, 400));
  }
}); 