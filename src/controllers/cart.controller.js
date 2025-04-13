const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const Coupon = require('../models/coupon.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      select: 'name price discountPrice images inStock slug sku',
    });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  res.status(200).json({
    success: true,
    message: 'سبد خرید با موفقیت دریافت شد',
    data: cart,
  });
});

/**
 * @desc    Add item to cart
 * @route   POST /api/cart
 * @access  Private
 */
exports.addToCart = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { productId, quantity = 1, variant } = req.body;

  if (!productId) {
    return next(new ErrorResponse('شناسه محصول الزامی است', 400));
  }

  // Find product to check availability
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorResponse('محصول مورد نظر یافت نشد', 404));
  }

  // Check if product is in stock
  if (!product.inStock) {
    return next(new ErrorResponse('محصول مورد نظر موجود نیست', 400));
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ 
      user: userId, 
      items: [{ 
        product: productId, 
        quantity, 
        variant,
        price: product.discountPrice || product.price
      }] 
    });
  } else {
    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && 
        (variant ? item.variant === variant : !item.variant)
    );

    if (existingItemIndex > -1) {
      // Update quantity of existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = product.discountPrice || product.price;
    } else {
      // Add new item to cart
      cart.items.push({ 
        product: productId, 
        quantity, 
        variant,
        price: product.discountPrice || product.price
      });
    }
    await cart.save();
  }

  // Populate product details before returning
  cart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price discountPrice images inStock slug sku',
  });

  res.status(200).json({
    success: true,
    message: 'محصول با موفقیت به سبد خرید اضافه شد',
    data: cart,
  });
});

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/:itemId
 * @access  Private
 */
exports.updateCartItem = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return next(new ErrorResponse('مقدار نامعتبر است', 400));
  }

  const cart = await Cart.findOne({ user: userId });
  
  if (!cart) {
    return next(new ErrorResponse('سبد خرید یافت نشد', 404));
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
  
  if (itemIndex === -1) {
    return next(new ErrorResponse('محصول در سبد خرید یافت نشد', 404));
  }

  // Update item quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  // Populate product details before returning
  const updatedCart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price discountPrice images inStock slug sku',
  });

  res.status(200).json({
    success: true,
    message: 'سبد خرید با موفقیت به‌روزرسانی شد',
    data: updatedCart,
  });
});

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/:itemId
 * @access  Private
 */
exports.removeCartItem = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: userId });
  
  if (!cart) {
    return next(new ErrorResponse('سبد خرید یافت نشد', 404));
  }

  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
  
  if (itemIndex === -1) {
    return next(new ErrorResponse('محصول در سبد خرید یافت نشد', 404));
  }

  // Remove item from cart
  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Populate product details before returning
  const updatedCart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price discountPrice images inStock slug sku',
  });

  res.status(200).json({
    success: true,
    message: 'محصول با موفقیت از سبد خرید حذف شد',
    data: updatedCart,
  });
});

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
exports.clearCart = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ user: userId });
  
  if (!cart) {
    return next(new ErrorResponse('سبد خرید یافت نشد', 404));
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'سبد خرید با موفقیت خالی شد',
    data: cart,
  });
});

/**
 * @desc    Apply coupon to cart
 * @route   POST /api/cart/coupon
 * @access  Private
 */
exports.applyCoupon = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { code } = req.body;

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
      u => u.user.toString() === userId
    );
    
    if (hasUsed) {
      return next(new ErrorResponse('شما قبلاً از این کد تخفیف استفاده کرده‌اید', 400));
    }
  }

  // Find cart
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return next(new ErrorResponse('سبد خرید یافت نشد', 404));
  }

  // Check minimum purchase requirement
  if (coupon.minPurchase && cart.totalPrice < coupon.minPurchase) {
    return next(
      new ErrorResponse(
        `حداقل مبلغ خرید برای این کد تخفیف ${coupon.minPurchase.toLocaleString()} تومان است`, 
        400
      )
    );
  }

  // Apply the coupon to the cart
  cart.coupon = coupon._id;
  await cart.save();

  // Return updated cart with applied coupon
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price discountPrice images inStock slug sku',
    })
    .populate('coupon');

  res.status(200).json({
    success: true,
    message: 'کد تخفیف با موفقیت اعمال شد',
    data: updatedCart,
  });
});

/**
 * @desc    Remove coupon from cart
 * @route   DELETE /api/cart/coupon
 * @access  Private
 */
exports.removeCoupon = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const cart = await Cart.findOne({ user: userId });
  
  if (!cart) {
    return next(new ErrorResponse('سبد خرید یافت نشد', 404));
  }

  cart.coupon = undefined;
  await cart.save();

  // Return updated cart
  const updatedCart = await Cart.findById(cart._id).populate({
    path: 'items.product',
    select: 'name price discountPrice images inStock slug sku',
  });

  res.status(200).json({
    success: true,
    message: 'کد تخفیف با موفقیت حذف شد',
    data: updatedCart,
  });
}); 