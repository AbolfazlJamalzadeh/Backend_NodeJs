const User = require('../models/user.model');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Ticket = require('../models/ticket.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getUsers = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Build filter
  const filter = {};
  
  // Filter by role
  if (req.query.role) {
    filter.role = req.query.role;
  }
  
  // Search by name, email or phone
  if (req.query.search) {
    filter.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { phone: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await User.countDocuments(filter);
  
  const users = await User.find(filter)
    .select('-password -otpCode -otpExpire')
    .sort({ createdAt: -1 })
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
    count: users.length,
    pagination,
    total,
    data: users
  });
});

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -otpCode -otpExpire');
  
  if (!user) {
    return next(new ErrorResponse('کاربر مورد نظر یافت نشد', 404));
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Update user (admin only)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
exports.updateUser = asyncHandler(async (req, res, next) => {
  const { fullName, email, role, isActive } = req.body;
  
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse('کاربر مورد نظر یافت نشد', 404));
  }
  
  // Update fields
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'اطلاعات کاربر با موفقیت به‌روزرسانی شد',
    data: user
  });
});

/**
 * @desc    Delete user (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse('کاربر مورد نظر یافت نشد', 404));
  }
  
  // Check if user has orders
  const hasOrders = await Order.countDocuments({ user: req.params.id });
  
  if (hasOrders > 0) {
    return next(
      new ErrorResponse(
        'این کاربر دارای سفارش است و نمی‌تواند حذف شود. می‌توانید آن را غیرفعال کنید',
        400
      )
    );
  }
  
  await user.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'کاربر با موفقیت حذف شد',
    data: {}
  });
});

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -otpCode -otpExpire');
  
  // Check if profile is complete
  const profileStatus = user.checkProfileCompletion();
  
  res.status(200).json({
    success: true,
    data: user,
    profileStatus
  });
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, email, nationalCode } = req.body;
  
  const user = await User.findById(req.user.id);
  
  // Update fields
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (nationalCode !== undefined) user.nationalCode = nationalCode;
  
  // Check if profile is complete
  const profileStatus = user.checkProfileCompletion();
  user.isProfileCompleted = profileStatus.isComplete;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'پروفایل با موفقیت به‌روزرسانی شد',
    data: user,
    profileStatus
  });
});

/**
 * @desc    Update user password
 * @route   PUT /api/users/password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('لطفا رمز عبور فعلی و رمز عبور جدید را وارد کنید', 400));
  }
  
  const user = await User.findById(req.user.id).select('+password');
  
  // Check current password
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('رمز عبور فعلی نادرست است', 401));
  }
  
  // Set new password
  user.password = newPassword;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'رمز عبور با موفقیت به‌روزرسانی شد'
  });
});

/**
 * @desc    Get user addresses
 * @route   GET /api/users/addresses
 * @access  Private
 */
exports.getUserAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('addresses');
  
  res.status(200).json({
    success: true,
    count: user.addresses.length,
    data: user.addresses
  });
});

/**
 * @desc    Add address to user
 * @route   POST /api/users/addresses
 * @access  Private
 */
exports.createUserAddress = asyncHandler(async (req, res, next) => {
  const { title, province, city, address, postalCode, recipientName, recipientPhone, isDefault } = req.body;
  
  // Validate required fields
  if (!province || !city || !address || !postalCode) {
    return next(new ErrorResponse('لطفا تمام فیلدهای ضروری را پر کنید', 400));
  }
  
  const user = await User.findById(req.user.id);
  
  // Create address object
  const newAddress = {
    title: title || 'آدرس جدید',
    province,
    city,
    address,
    postalCode,
    recipientName: recipientName || user.fullName,
    recipientPhone: recipientPhone || user.phone
  };
  
  // If this is the first address or isDefault is true, set as default
  if (user.addresses.length === 0 || isDefault) {
    // Reset all other addresses to non-default
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    
    newAddress.isDefault = true;
  }
  
  // Add the new address
  user.addresses.push(newAddress);
  await user.save();
  
  res.status(201).json({
    success: true,
    message: 'آدرس با موفقیت اضافه شد',
    data: user.addresses
  });
});

/**
 * @desc    Update user address
 * @route   PUT /api/users/addresses/:id
 * @access  Private
 */
exports.updateUserAddress = asyncHandler(async (req, res, next) => {
  const { title, province, city, address, postalCode, recipientName, recipientPhone, isDefault } = req.body;
  
  const user = await User.findById(req.user.id);
  
  // Find the address to update
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === req.params.id
  );
  
  if (addressIndex === -1) {
    return next(new ErrorResponse('آدرس مورد نظر یافت نشد', 404));
  }
  
  // Update fields
  if (title !== undefined) user.addresses[addressIndex].title = title;
  if (province !== undefined) user.addresses[addressIndex].province = province;
  if (city !== undefined) user.addresses[addressIndex].city = city;
  if (address !== undefined) user.addresses[addressIndex].address = address;
  if (postalCode !== undefined) user.addresses[addressIndex].postalCode = postalCode;
  if (recipientName !== undefined) user.addresses[addressIndex].recipientName = recipientName;
  if (recipientPhone !== undefined) user.addresses[addressIndex].recipientPhone = recipientPhone;
  
  // Handle default address setting
  if (isDefault) {
    // Reset all addresses to non-default
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    
    // Set the current address as default
    user.addresses[addressIndex].isDefault = true;
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'آدرس با موفقیت به‌روزرسانی شد',
    data: user.addresses
  });
});

/**
 * @desc    Delete user address
 * @route   DELETE /api/users/addresses/:id
 * @access  Private
 */
exports.deleteUserAddress = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  // Find the address to delete
  const addressIndex = user.addresses.findIndex(
    addr => addr._id.toString() === req.params.id
  );
  
  if (addressIndex === -1) {
    return next(new ErrorResponse('آدرس مورد نظر یافت نشد', 404));
  }
  
  // Check if it's the default address
  const isDefault = user.addresses[addressIndex].isDefault;
  
  // Remove the address
  user.addresses.splice(addressIndex, 1);
  
  // If it was the default address and there are other addresses, set the first one as default
  if (isDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'آدرس با موفقیت حذف شد',
    data: user.addresses
  });
});

/**
 * @desc    Get admin stats
 * @route   GET /api/users/stats
 * @access  Private/Admin
 */
exports.getAdminStats = asyncHandler(async (req, res) => {
  // Get total users
  const totalUsers = await User.countDocuments();
  
  // Get new users in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const newUsers = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });
  
  // Get users by role
  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);
  
  // Get total products
  const totalProducts = await Product.countDocuments();
  
  // Get total orders
  const totalOrders = await Order.countDocuments();
  
  // Get open tickets
  const openTickets = await Ticket.countDocuments({ status: 'open' });
  
  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        new: newUsers,
        byRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      totalProducts,
      totalOrders,
      openTickets
    }
  });
}); 