const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const Coupon = require('../models/coupon.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const HolooService = require('../utils/holooService');

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = asyncHandler(async (req, res, next) => {
  const { 
    shippingAddress, 
    paymentMethod, 
    shippingMethod = 'standard',
    description
  } = req.body;
  
  // Check shipping address
  if (!shippingAddress || !shippingAddress.address || !shippingAddress.postalCode) {
    return next(new ErrorResponse('آدرس و کد پستی الزامی است', 400));
  }
  
  // Get user cart
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  
  if (!cart || cart.items.length === 0) {
    return next(new ErrorResponse('سبد خرید شما خالی است', 400));
  }
  
  // Check if all products are in stock
  for (const item of cart.items) {
    if (!item.product.inStock) {
      return next(
        new ErrorResponse(`محصول ${item.product.name} در انبار موجود نیست`, 400)
      );
    }
    
    // Check if requested quantity is available (if inventory tracking is enabled)
    if (item.product.trackInventory && item.quantity > item.product.countInStock) {
      return next(
        new ErrorResponse(
          `تنها ${item.product.countInStock} عدد از محصول ${item.product.name} در انبار موجود است`, 
          400
        )
      );
    }
  }
  
  // Calculate prices
  let itemsPrice = 0;
  const orderItems = cart.items.map(item => {
    const price = item.product.discountPrice || item.product.price;
    itemsPrice += price * item.quantity;
    
    return {
      product: item.product._id,
      name: item.product.name,
      price,
      quantity: item.quantity,
      color: item.variant
    };
  });
  
  // Calculate shipping
  const shippingPrice = shippingMethod === 'express' ? 30000 : 15000; // Example shipping prices
  
  // Calculate tax (if applicable)
  const taxRate = 0.09; // 9% VAT in Iran
  const taxPrice = Math.round(itemsPrice * taxRate);
  
  // Apply coupon discount if available
  let discount = 0;
  let couponUsed = null;
  
  if (cart.coupon) {
    const coupon = await Coupon.findById(cart.coupon);
    
    if (coupon && coupon.isActive && new Date(coupon.expiresAt) > new Date()) {
      if (coupon.discountType === 'percentage') {
        discount = (itemsPrice * coupon.discountValue) / 100;
        
        // Apply max discount cap if it exists
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else { // fixed amount
        discount = coupon.discountValue;
      }
      
      // Save coupon details
      couponUsed = {
        code: coupon.code,
        discountAmount: discount,
        discountType: coupon.discountType
      };
      
      // Update coupon usage count
      coupon.usedCount += 1;
      
      // Add user to used by list if single-use
      if (coupon.isSingleUse) {
        coupon.usedBy.push({ user: req.user.id, usedAt: Date.now() });
      }
      
      await coupon.save();
    }
  }
  
  // Calculate total price
  const totalPrice = itemsPrice + shippingPrice + taxPrice - discount;
  
  // Create order
  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    shippingAddress: {
      fullName: shippingAddress.fullName || req.user.fullName,
      address: shippingAddress.address,
      postalCode: shippingAddress.postalCode,
      phone: shippingAddress.phone || req.user.phone
    },
    paymentMethod,
    shippingMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    discount,
    totalPrice,
    totalItems: cart.items.reduce((total, item) => total + item.quantity, 0),
    status: paymentMethod === 'cod' ? 'processing' : 'pendingPayment',
    couponUsed,
    notes: description
  });
  
  // Generate invoice number
  order.generateInvoiceNumber();
  await order.save();
  
  // If payment method is COD (cash on delivery), mark as processing
  if (paymentMethod === 'cod') {
    // Update product inventory
    for (const item of cart.items) {
      if (item.product.trackInventory) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { countInStock: -item.quantity, soldCount: item.quantity }
        });
      }
    }
    
    // Try to sync with Holoo (accounting software)
    try {
      const holooService = new HolooService();
      await holooService.createInvoice(order);
      
      // Mark as synced with Holoo
      await order.syncWithHoloo({
        status: 'success',
        invoiceId: `HOLOO-${order._id.toString().substr(-6)}`
      });
    } catch (error) {
      console.error('خطا در همگام‌سازی با هلو:', error.message);
      
      // Mark sync failure but don't block the order
      await order.syncWithHoloo({
        status: 'failed',
        errorMessage: error.message
      });
    }
  }
  
  // اگر پرداخت انجام شده است، سفارش را با هلو همگام‌سازی کنید
  if (order.isPaid) {
    try {
      const holooService = new HolooService();
      await holooService.createInvoice(order);
    } catch (error) {
      logger.error(`Failed to sync order with Holoo: ${error.message}`, {
        orderId: order._id,
        error: error.message
      });
      // ادامه دهید حتی اگر همگام‌سازی با هلو ناموفق بود
    }
  }
  
  // Clear cart after successful order
  cart.items = [];
  cart.coupon = undefined;
  await cart.save();
  
  res.status(201).json({
    success: true,
    message: 'سفارش با موفقیت ثبت شد',
    data: order
  });
});

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
exports.getOrders = asyncHandler(async (req, res) => {
  // Extract query parameters
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Prepare filter object
  let filter = {};
  
  // Handle status filter
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Handle payment status filter
  if (req.query.paymentStatus) {
    filter.paymentStatus = req.query.paymentStatus;
  }
  
  // Handle date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = endDate;
    }
  }
  
  // Handle customer search
  if (req.query.customer) {
    const customerSearch = req.query.customer;
    
    // Find users that match the search criteria
    const users = await User.find({
      $or: [
        { name: { $regex: customerSearch, $options: 'i' } },
        { email: { $regex: customerSearch, $options: 'i' } },
        { phone: { $regex: customerSearch, $options: 'i' } }
      ]
    }).select('_id');
    
    // Add user ids to filter
    if (users.length > 0) {
      const userIds = users.map(user => user._id);
      filter.user = { $in: userIds };
    } else {
      // If no users found, return empty result
      return res.status(200).json({
        success: true,
        count: 0,
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        },
        statusSummary: {
          pendingPayment: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          refunded: 0,
          returned: 0
        },
        data: []
      });
    }
  }

  // Get total count and summary for pagination
  const total = await Order.countDocuments(filter);
  
  // Get status summary counts
  const statusSummary = {
    pendingPayment: await Order.countDocuments({ ...filter, status: 'pendingPayment' }),
    processing: await Order.countDocuments({ ...filter, status: 'processing' }),
    shipped: await Order.countDocuments({ ...filter, status: 'shipped' }),
    delivered: await Order.countDocuments({ ...filter, status: 'delivered' }),
    cancelled: await Order.countDocuments({ ...filter, status: 'cancelled' }),
    refunded: await Order.countDocuments({ ...filter, status: 'refunded' }),
    returned: await Order.countDocuments({ ...filter, status: 'returned' })
  };
  
  // Get orders
  const orders = await Order.find(filter)
    .populate({
      path: 'user',
      select: 'name email phone'
    })
    .populate({
      path: 'items.product',
      select: 'name price images'
    })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  // Create pagination object
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
  
  res.status(200).json({
    success: true,
    count: orders.length,
    pagination,
    total,
    statusSummary,
    data: orders
  });
});

/**
 * @desc    Get current user's orders
 * @route   GET /api/orders/me
 * @access  Private
 */
exports.getMyOrders = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  // Build filter
  const filter = { user: req.user.id };
  
  // Filter by status
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Filter by payment status
  if (req.query.paymentStatus === 'paid') {
    filter.isPaid = true;
  } else if (req.query.paymentStatus === 'unpaid') {
    filter.isPaid = false;
  }
  
  // Count total documents
  const total = await Order.countDocuments(filter);
  
  // Get orders with pagination
  const orders = await Order.find(filter)
    .populate('items.product', 'name images price')
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
  
  // Group orders by status for summary
  const ordersByStatus = {
    pendingPayment: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0
  };
  
  // Get all user orders for status summary
  const allUserOrders = await Order.find({ user: req.user.id }, 'status');
  
  // Count orders by status
  allUserOrders.forEach(order => {
    if (ordersByStatus.hasOwnProperty(order.status)) {
      ordersByStatus[order.status]++;
    }
  });
  
  res.status(200).json({
    success: true,
    count: orders.length,
    pagination,
    total,
    statusSummary: ordersByStatus,
    data: orders
  });
});

/**
 * @desc    Get order by ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrderById = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'fullName phone email')
    .populate('items.product');
  
  if (!order) {
    return next(new ErrorResponse('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is order owner or an admin
  if (
    order.user._id.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  res.status(200).json({
    success: true,
    data: order
  });
});

/**
 * @desc    Update order status (admin)
 * @route   PUT /api/orders/:id
 * @access  Private/Admin
 */
exports.updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { status, trackingCode, paymentStatus, shippingMethod, estimatedDeliveryDate, notes } = req.body;
  
  const order = await Order.findById(req.params.id).populate('user', 'email phone');
  
  if (!order) {
    return next(new ErrorResponse('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Save previous status for notifications
  const previousStatus = order.status;
  
  // Update order status
  if (status) {
    // Check if status transition is valid
    if (!isValidStatusTransition(previousStatus, status)) {
      return next(new ErrorResponse(`تغییر وضعیت از ${previousStatus} به ${status} مجاز نیست`, 400));
    }
    
    order.status = status;
    
    // If marking as shipped, set shipping details
    if (status === 'shipped' && previousStatus !== 'shipped') {
      // If not already shipped, update shipped info
      order.isShipped = true;
      order.shippedAt = Date.now();
    }
    
    // If marking as delivered, update delivery status
    if (status === 'delivered' && !order.isDelivered) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }
    
    // If cancelling an order that was in process, restore inventory
    if (status === 'cancelled' && ['processing', 'pendingPayment'].includes(previousStatus)) {
      // Only restore inventory if order was paid or on COD
      if (order.isPaid || order.paymentMethod === 'cod') {
        await restoreInventory(order);
      }
    }
  }
  
  // Update tracking code
  if (trackingCode) {
    order.trackingCode = trackingCode;
  }
  
  // Update shipping method
  if (shippingMethod) {
    order.shippingMethod = shippingMethod;
  }
  
  // Update estimated delivery date
  if (estimatedDeliveryDate) {
    order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
  }
  
  // Update order notes
  if (notes) {
    order.notes = notes;
  }
  
  // Update payment status
  if (paymentStatus) {
    if (paymentStatus === 'paid' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      
      // If order was pending payment, update status to processing
      if (order.status === 'pendingPayment') {
        order.status = 'processing';
      }
      
      // Update product inventory if payment just completed
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        
        if (product) {
          // Reduce inventory
          product.inventory -= item.quantity;
          product.sold += item.quantity;
          await product.save();
        }
      }
      
      // Try to sync with Holoo if applicable
      if (typeof HolooService !== 'undefined') {
        try {
          const holooService = new HolooService();
          await holooService.createInvoice(order);
          
          // Mark as synced with Holoo
          await order.syncWithHoloo({
            status: 'success',
            invoiceId: `HOLOO-${order._id.toString().substr(-6)}`
          });
        } catch (error) {
          console.error('خطا در همگام‌سازی با هلو:', error.message);
          
          // Mark sync failure but don't block the order
          await order.syncWithHoloo({
            status: 'failed',
            errorMessage: error.message
          });
        }
      }
    } else if (paymentStatus === 'refunded') {
      order.status = 'refunded';
      order.refundInfo = {
        ...(order.refundInfo || {}),
        amount: order.totalPrice,
        status: 'refunded',
        date: Date.now(),
        reason: req.body.refundReason || 'استرداد توسط مدیر'
      };
      
      // Restore inventory for refunded orders
      await restoreInventory(order);
    }
  }
  
  // Save the updated order
  await order.save();
  
  // Send notification to customer about status change if applicable
  if (status && previousStatus !== status) {
    try {
      // This is where you would send SMS or Email notification
      // For example:
      // await notificationService.sendOrderStatusUpdate(order.user.email, order.user.phone, order);
      
      logger.info(`Order status change notification would be sent to user`, {
        orderId: order._id,
        previousStatus,
        newStatus: status,
        userEmail: order.user.email,
        userPhone: order.user.phone
      });
    } catch (error) {
      logger.error(`Failed to send status change notification`, {
        error: error.message,
        orderId: order._id
      });
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'سفارش با موفقیت به‌روزرسانی شد',
    data: order
  });
});

/**
 * Helper function to check if status transition is valid
 */
function isValidStatusTransition(fromStatus, toStatus) {
  // Define allowed transitions
  const allowedTransitions = {
    'pendingPayment': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled', 'refunded'],
    'shipped': ['delivered', 'returned', 'refunded'],
    'delivered': ['returned', 'refunded'],
    'cancelled': ['processing'], // Allow reactivating a cancelled order
    'refunded': ['processing'], // Allow reprocessing a refunded order if needed
    'returned': ['refunded', 'processing'] // Allow reprocessing or refunding a returned order
  };
  
  // Check if transition is allowed
  return allowedTransitions[fromStatus] && allowedTransitions[fromStatus].includes(toStatus);
}

/**
 * Helper function to restore inventory after cancellation or refund
 */
async function restoreInventory(order) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    
    if (product) {
      // Restore inventory
      product.inventory += item.quantity;
      product.sold -= item.quantity;
      
      // Ensure values don't go negative
      if (product.sold < 0) product.sold = 0;
      
      await product.save();
    }
  }
}

/**
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    return next(new ErrorResponse('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is order owner or an admin
  if (
    order.user.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Check if order can be cancelled
  if (['delivered', 'shipped'].includes(order.status)) {
    return next(
      new ErrorResponse('سفارش‌های ارسال شده یا تحویل داده شده قابل لغو نیستند', 400)
    );
  }
  
  try {
    await order.cancelOrder(reason || 'درخواست مشتری');
    
    // Return inventory to stock for paid orders
    if (order.isPaid) {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { countInStock: item.quantity, soldCount: -item.quantity }
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'سفارش با موفقیت لغو شد',
      data: order
    });
  } catch (error) {
    return next(new ErrorResponse(error.message, 400));
  }
});

/**
 * @desc    Get order statistics
 * @route   GET /api/orders/stats
 * @access  Private/Admin
 */
exports.getOrderStats = asyncHandler(async (req, res) => {
  // Get total sales
  const totalSales = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled', 'refunded'] } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);
  
  // Get total orders
  const totalOrders = await Order.countDocuments();
  
  // Get orders by status
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Get sales for last 7 days
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const salesLast7Days = await Order.aggregate([
    { 
      $match: { 
        createdAt: { $gte: last7Days },
        status: { $nin: ['cancelled', 'refunded'] }
      } 
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sales: { $sum: '$totalPrice' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  // Get monthly sales for current year
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  
  const monthlySales = await Order.aggregate([
    { 
      $match: { 
        createdAt: { $gte: startOfYear },
        status: { $nin: ['cancelled', 'refunded'] }
      } 
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        sales: { $sum: '$totalPrice' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    data: {
      totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
      totalOrders,
      ordersByStatus,
      salesLast7Days,
      monthlySales
    }
  });
});

/**
 * @desc    Get order invoice
 * @route   GET /api/orders/:id/invoice
 * @access  Private
 */
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'fullName phone email nationalCode')
    .populate('items.product');
  
  if (!order) {
    return next(new ErrorResponse('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is order owner or an admin
  if (
    order.user._id.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Check if invoice exists
  if (!order.invoice || !order.invoice.invoiceNumber) {
    // Generate invoice if not exists
    await order.generateInvoiceNumber();
    await order.save();
  }
  
  // Format invoice data for response
  const invoiceData = {
    invoiceNumber: order.invoice.invoiceNumber,
    invoiceDate: order.invoice.invoiceDate || order.createdAt,
    orderDate: order.createdAt,
    paidDate: order.paidAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.isPaid ? 'پرداخت شده' : 'پرداخت نشده',
    
    customer: {
      name: order.shippingAddress?.fullName || order.user.fullName,
      phone: order.shippingAddress?.phone || order.user.phone,
      email: order.user.email,
      address: order.shippingAddress?.address,
      postalCode: order.shippingAddress?.postalCode,
      nationalCode: order.user.nationalCode
    },
    
    items: order.items.map(item => ({
      product: item.product._id || item.product,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      totalPrice: item.price * item.quantity
    })),
    
    summary: {
      subtotal: order.itemsPrice,
      shipping: order.shippingPrice,
      tax: order.taxPrice,
      discount: order.discount,
      total: order.totalPrice
    },
    
    status: order.status,
    holooSync: order.invoice.holoSync || { status: 'pending' }
  };
  
  res.status(200).json({
    success: true,
    data: invoiceData
  });
});

/**
 * @desc    Generate and download invoice PDF
 * @route   GET /api/orders/:id/invoice/pdf
 * @access  Private
 */
exports.getInvoicePdf = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'fullName phone email nationalCode')
    .populate('items.product');
  
  if (!order) {
    return next(new ErrorResponse('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is order owner or an admin
  if (
    order.user._id.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Check if invoice exists
  if (!order.invoice || !order.invoice.invoiceNumber) {
    // Generate invoice if not exists
    await order.generateInvoiceNumber();
    await order.save();
  }
  
  try {
    // Import PDFKit dynamically
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');
    
    // Create a PDF document with RTL support
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      rtl: true // Enable right-to-left for Persian text
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.invoice.invoiceNumber}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Try to load Persian font if available
    const fontPath = path.join(__dirname, '../../public/fonts/Vazir.ttf');
    try {
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
      } else {
        console.warn('Persian font not found. Download Vazir.ttf and place it in public/fonts for proper Persian text rendering.');
      }
    } catch (fontError) {
      console.warn('Could not load Persian font:', fontError.message);
    }
    
    // Add company logo (if available)
    const logoPath = path.join(__dirname, '../../public/images/logo.png');
    try {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 100 });
      }
    } catch (logoError) {
      console.warn('Could not load logo:', logoError.message);
    }
    
    // Add title
    doc.fontSize(20).text('فاکتور فروش', { align: 'center' });
    doc.moveDown();
    
    // Add invoice info
    doc.fontSize(12);
    doc.text(`شماره فاکتور: ${order.invoice.invoiceNumber}`, { align: 'right' });
    doc.text(`تاریخ فاکتور: ${new Date(order.invoice.invoiceDate || order.createdAt).toLocaleDateString('fa-IR')}`, { align: 'right' });
    doc.text(`وضعیت پرداخت: ${order.isPaid ? 'پرداخت شده' : 'پرداخت نشده'}`, { align: 'right' });
    if (order.isPaid) {
      doc.text(`تاریخ پرداخت: ${new Date(order.paidAt).toLocaleDateString('fa-IR')}`, { align: 'right' });
    }
    doc.moveDown();
    
    // Add customer info
    doc.fontSize(14).text('اطلاعات مشتری', { align: 'right' });
    doc.fontSize(12);
    doc.text(`نام: ${order.shippingAddress?.fullName || order.user.fullName}`, { align: 'right' });
    doc.text(`شماره تماس: ${order.shippingAddress?.phone || order.user.phone}`, { align: 'right' });
    doc.text(`ایمیل: ${order.user.email}`, { align: 'right' });
    doc.text(`آدرس: ${order.shippingAddress?.address}`, { align: 'right' });
    doc.text(`کد پستی: ${order.shippingAddress?.postalCode}`, { align: 'right' });
    doc.moveDown();
    
    // Add items table
    doc.fontSize(14).text('اقلام سفارش', { align: 'right' });
    doc.moveDown();
    
    // Define table layout
    const tableTop = doc.y;
    const itemCodeX = 50;
    const descriptionX = 100;
    const quantityX = 350;
    const priceX = 400;
    const amountX = 450;
    
    // Add table headers
    doc.fontSize(12).text('کد', itemCodeX, tableTop, { width: 40, align: 'center' });
    doc.text('شرح', descriptionX, tableTop, { width: 250, align: 'right' });
    doc.text('تعداد', quantityX, tableTop, { width: 40, align: 'center' });
    doc.text('قیمت', priceX, tableTop, { width: 60, align: 'center' });
    doc.text('مبلغ کل', amountX, tableTop, { width: 70, align: 'center' });
    
    // Draw a line
    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();
    
    // Add table rows
    let tableRow = tableTop + 30;
    order.items.forEach((item, index) => {
      doc.fontSize(11);
      doc.text((index + 1).toString(), itemCodeX, tableRow, { width: 40, align: 'center' });
      doc.text(item.name, descriptionX, tableRow, { width: 250, align: 'right' });
      doc.text(item.quantity.toString(), quantityX, tableRow, { width: 40, align: 'center' });
      doc.text(item.price.toLocaleString('fa-IR'), priceX, tableRow, { width: 60, align: 'center' });
      doc.text((item.price * item.quantity).toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
      
      tableRow += 20;
      
      // Add a new page if needed
      if (tableRow > 700) {
        doc.addPage();
        tableRow = 50;
      }
    });
    
    // Draw a line
    doc.moveTo(50, tableRow).lineTo(550, tableRow).stroke();
    tableRow += 20;
    
    // Add summary
    doc.fontSize(12);
    doc.text('جمع کل:', 350, tableRow, { width: 100, align: 'right' });
    doc.text(order.itemsPrice.toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
    tableRow += 20;
    
    if (order.discount > 0) {
      doc.text('تخفیف:', 350, tableRow, { width: 100, align: 'right' });
      doc.text(order.discount.toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
      tableRow += 20;
    }
    
    doc.text('هزینه ارسال:', 350, tableRow, { width: 100, align: 'right' });
    doc.text(order.shippingPrice.toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
    tableRow += 20;
    
    doc.text('مالیات:', 350, tableRow, { width: 100, align: 'right' });
    doc.text(order.taxPrice.toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
    tableRow += 20;
    
    // Draw a line
    doc.moveTo(350, tableRow).lineTo(550, tableRow).stroke();
    tableRow += 20;
    
    doc.fontSize(14);
    doc.text('مبلغ قابل پرداخت:', 350, tableRow, { width: 100, align: 'right' });
    doc.text(order.totalPrice.toLocaleString('fa-IR'), amountX, tableRow, { width: 70, align: 'center' });
    
    // Add footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8);
      doc.text(
        `صفحه ${(i + 1)} از ${pageCount}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return next(new ErrorResponse('خطا در تولید فایل PDF', 500));
  }
});

/**
 * @desc    Send order to Holoo
 * @route   POST /api/orders/:id/sync-with-holoo
 * @access  Private (Admin)
 */
exports.syncOrderWithHoloo = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  try {
    // دریافت سفارش
    const order = await Order.findById(id)
      .populate({
        path: 'items.product',
        select: 'name holooErpCode holooCode syncedFromHoloo'
      });
    
    if (!order) {
      return next(new ErrorResponse('سفارش یافت نشد', 404));
    }
    
    // ایجاد سرویس هلو
    const holooService = new HolooService();
    
    // همگام‌سازی سفارش با هلو
    const result = await holooService.createInvoice(order);
    
    res.status(200).json({
      success: true,
      message: 'سفارش با موفقیت با هلو همگام‌سازی شد',
      data: {
        holoInvoiceId: result.holoInvoiceId,
        ...result
      }
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در همگام‌سازی سفارش با هلو: ${error.message}`, 500));
  }
});

/**
 * @desc    Get orders needing Holoo sync
 * @route   GET /api/orders/holoo/pending
 * @access  Private (Admin)
 */
exports.getPendingHolooOrders = asyncHandler(async (req, res, next) => {
  try {
    // یافتن سفارش‌های منتظر همگام‌سازی
    const pendingOrders = await Order.find({
      isPaid: true,
      syncedWithHoloo: false,
      'holooSyncDetails.retryCount': { $lt: 3 } // کمتر از 3 بار تلاش ناموفق
    })
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.status(200).json({
      success: true,
      count: pendingOrders.length,
      data: pendingOrders
    });
  } catch (error) {
    return next(new ErrorResponse(`خطا در دریافت سفارش‌های منتظر همگام‌سازی: ${error.message}`, 500));
  }
});

/**
 * @desc    Process Holoo webhook for stock update
 * @route   POST /api/orders/holoo/webhook
 * @access  Public (with API key)
 */
exports.holooWebhook = asyncHandler(async (req, res, next) => {
  // بررسی کلید API
  const apiKey = req.header('x-api-key');
  
  if (!apiKey || apiKey !== config.holoo.webhookApiKey) {
    return next(new ErrorResponse('دسترسی غیرمجاز', 401));
  }
  
  const { operation, Table, changedfields } = req.body;
  
  if (Table === 'product' && operation === 'UPDATE') {
    try {
      // پردازش تغییرات موجودی محصولات
      const changes = JSON.parse(changedfields);
      
      for (const change of changes) {
        if (change.ErpCode && (change.Few !== undefined || change.Few !== null)) {
          // یافتن محصول مرتبط
          const product = await Product.findOne({ holooErpCode: change.ErpCode });
          
          if (product) {
            // بروزرسانی موجودی
            product.stock = change.Few;
            product.lastHolooSync = new Date();
            await product.save();
            
            logger.info(`Updated product ${product.name} stock to ${change.Few} from Holoo webhook`);
          }
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'تغییرات موجودی اعمال شد'
      });
    } catch (error) {
      logger.error('Error processing Holoo webhook:', error);
      
      res.status(500).json({
        success: false,
        message: `خطا در پردازش وب‌هوک: ${error.message}`
      });
    }
  } else {
    // سایر عملیات هلو فعلاً پشتیبانی نمی‌شوند
    res.status(200).json({
      success: true,
      message: 'عملیات پشتیبانی نمی‌شود'
    });
  }
}); 