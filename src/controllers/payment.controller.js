const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const paymentService = require('../utils/paymentService');
const asyncHandler = require('../utils/asyncHandler');
const ErrorHandler = require('../utils/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Create payment request for an order
 * @route   POST /api/payment/create/:orderId
 * @access  Private
 */
exports.createPayment = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  
  // Find order
  const order = await Order.findById(orderId).populate('user', 'email phone');
  
  if (!order) {
    return next(new ErrorHandler('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Check if order belongs to user
  if (order.user._id.toString() !== req.user.id.toString()) {
    return next(new ErrorHandler('شما مجاز به پرداخت این سفارش نیستید', 403));
  }
  
  // Check if order is already paid
  if (order.isPaid) {
    return next(new ErrorHandler('این سفارش قبلاً پرداخت شده است', 400));
  }
  
  // Check if order status is pendingPayment
  if (order.status !== 'pendingPayment') {
    return next(new ErrorHandler('این سفارش در وضعیت قابل پرداخت نیست', 400));
  }
  
  try {
    // Create description
    const description = `پرداخت سفارش ${order.invoice?.invoiceNumber || orderId}`;
    
    // Create payment request
    const paymentResult = await paymentService.createPaymentRequest(
      order.totalPrice,
      description,
      order.user.email || '',
      order.user.phone || '',
      orderId
    );
    
    // Update order with payment info
    order.paymentInfo = {
      ...order.paymentInfo,
      authority: paymentResult.authority
    };
    await order.save();
    
    // Log payment request
    logger.info(`Payment request created for order ${orderId}`, {
      user: req.user.id,
      order: orderId,
      paymentMethod: order.paymentMethod,
      amount: order.totalPrice,
      authority: paymentResult.authority
    });
    
    res.status(200).json({
      success: true,
      gatewayUrl: paymentResult.gatewayUrl,
      authority: paymentResult.authority
    });
  } catch (error) {
    // Log payment request error
    logger.error(`Payment request creation failed for order ${orderId}`, {
      user: req.user.id,
      order: orderId,
      error: error.message
    });
    
    throw error;
  }
});

/**
 * @desc    Verify payment
 * @route   GET /api/payment/verify/:orderId
 * @access  Public
 */
exports.verifyPayment = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { Authority: authority, Status: status } = req.query;
  
  // Find order
  const order = await Order.findById(orderId);
  
  if (!order) {
    return next(new ErrorHandler('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Check if payment is already processed
  if (order.isPaid) {
    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
  }
  
  // Check if payment was cancelled by user
  if (status !== 'OK') {
    logger.info(`Payment cancelled by user for order ${orderId}`, {
      order: orderId,
      authority
    });
    
    return res.redirect(`${process.env.FRONTEND_URL}/payment/cancel?orderId=${orderId}`);
  }
  
  try {
    // Verify payment with ZarinPal
    const verificationResult = await paymentService.verifyPayment(authority, order.totalPrice);
    
    if (verificationResult.success) {
      // Update user if exists
      const user = await User.findById(order.user);
      
      if (user) {
        // Add transaction to user's wallet
        user.wallet.transactions.push({
          amount: -order.totalPrice,
          type: 'purchase',
          description: `پرداخت سفارش ${order.invoice?.invoiceNumber || orderId}`
        });
        
        // Add loyalty points (1 point per 10,000 Tomans)
        const pointsToAdd = Math.floor(order.totalPrice / 10000);
        user.loyaltyPoints += pointsToAdd;
        
        // Clear the user's cart after successful payment
        const Cart = require('../models/cart.model');
        await Cart.findOneAndUpdate(
          { user: user._id },
          { items: [], totalItems: 0, totalPrice: 0 },
          { new: true }
        );
        
        await user.save();
        
        // Send order confirmation email or SMS
        try {
          // This can be implemented when email/SMS service is available
          // For example: await emailService.sendOrderConfirmation(user.email, order);
          logger.info(`Order confirmation notification would be sent to user ${user._id}`, {
            order: orderId,
            email: user.email,
            phone: user.phone
          });
        } catch (notificationError) {
          logger.error(`Failed to send order confirmation notification`, {
            error: notificationError.message,
            user: user._id,
            order: orderId
          });
        }
      }
      
      // Update product inventory
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        
        if (product) {
          // Reduce inventory
          product.inventory -= item.quantity;
          product.sold += item.quantity;
          
          // Check if low stock notification needed
          if (product.inventory <= product.lowStockThreshold) {
            // Logic for low stock notification could be implemented here
            logger.warn(`Low stock alert for product ${product.name}`, {
              product: product._id,
              inventory: product.inventory,
              threshold: product.lowStockThreshold
            });
          }
          
          await product.save();
        }
      }
      
      // Update order with payment info
      const paymentInfo = {
        authority,
        refId: verificationResult.refId,
        transactionId: verificationResult.refId,
        paymentDate: new Date()
      };
      
      await order.markAsPaid(paymentInfo);
      
      // Log successful payment
      logger.info(`Payment verified successfully for order ${orderId}`, {
        order: orderId,
        refId: verificationResult.refId,
        paymentMethod: order.paymentMethod,
        amount: order.totalPrice
      });
      
      // Redirect to success page
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&refId=${verificationResult.refId}`);
    } else {
      throw new Error('تأیید پرداخت ناموفق بود');
    }
  } catch (error) {
    // Log payment verification error
    logger.error(`Payment verification failed for order ${orderId}`, {
      order: orderId,
      authority,
      error: error.message
    });
    
    // Redirect to failed payment page
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${orderId}&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @desc    Get payment status
 * @route   GET /api/payment/status/:orderId
 * @access  Private
 */
exports.getPaymentStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  
  // Find order
  const order = await Order.findById(orderId);
  
  if (!order) {
    return next(new ErrorHandler('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Check if order belongs to user
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'manager') {
    return next(new ErrorHandler('شما مجاز به دسترسی به این سفارش نیستید', 403));
  }
  
  res.status(200).json({
    success: true,
    data: {
      orderId: order._id,
      isPaid: order.isPaid,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentInfo: order.paymentInfo,
      paidAt: order.paidAt
    }
  });
});

/**
 * @desc    Get unverified transactions (admin only)
 * @route   GET /api/payment/unverified
 * @access  Private/Admin
 */
exports.getUnverifiedTransactions = asyncHandler(async (req, res, next) => {
  try {
    // Get unverified transactions from ZarinPal
    const result = await paymentService.getUnverifiedTransactions();
    
    res.status(200).json({
      success: true,
      count: result.transactions.length,
      data: result.transactions
    });
  } catch (error) {
    logger.error('Error fetching unverified transactions', {
      error: error.message
    });
    
    throw error;
  }
});

/**
 * @desc    Process refund
 * @route   POST /api/payment/refund/:orderId
 * @access  Private/Admin
 */
exports.processRefund = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason, amount } = req.body;
  
  // Find order
  const order = await Order.findById(orderId);
  
  if (!order) {
    return next(new ErrorHandler('سفارش مورد نظر یافت نشد', 404));
  }
  
  // Check if order is paid
  if (!order.isPaid) {
    return next(new ErrorHandler('این سفارش پرداخت نشده است و قابل استرداد نیست', 400));
  }
  
  // Check if refund is already processed
  if (order.refundInfo && ['refunded', 'approved'].includes(order.refundInfo.status)) {
    return next(new ErrorHandler('استرداد وجه برای این سفارش قبلاً انجام شده است', 400));
  }
  
  // Calculate refund amount if not provided
  const refundAmount = amount || order.calculateRefundAmount();
  
  try {
    // Process refund with ZarinPal
    const refundResult = await paymentService.refundPayment(
      order.paymentInfo.authority,
      refundAmount
    );
    
    if (refundResult.success) {
      // Update order with refund info
      order.status = 'refunded';
      order.refundInfo = {
        reason: reason || 'استرداد توسط مدیر',
        amount: refundAmount,
        status: 'refunded',
        date: new Date()
      };
      
      await order.save();
      
      // Update user's wallet if needed
      const user = await User.findById(order.user);
      
      if (user) {
        // Add transaction to user's wallet
        user.wallet.transactions.push({
          amount: refundAmount,
          type: 'refund',
          description: `استرداد وجه سفارش ${order.invoice?.invoiceNumber || orderId}`
        });
        
        await user.save();
      }
      
      // Log refund
      logger.info(`Refund processed successfully for order ${orderId}`, {
        user: req.user.id,
        order: orderId,
        refId: refundResult.refId,
        amount: refundAmount,
        reason
      });
      
      res.status(200).json({
        success: true,
        message: 'استرداد وجه با موفقیت انجام شد',
        data: {
          refId: refundResult.refId,
          amount: refundAmount,
          date: new Date()
        }
      });
    } else {
      throw new Error('استرداد وجه ناموفق بود');
    }
  } catch (error) {
    // Log refund error
    logger.error(`Refund processing failed for order ${orderId}`, {
      user: req.user.id,
      order: orderId,
      amount: refundAmount,
      error: error.message
    });
    
    throw error;
  }
});

/**
 * @desc    Get all transactions with filters
 * @route   GET /api/payment/transactions
 * @access  Private/Admin
 */
exports.getTransactions = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Build query
  const query = {};
  
  // Filter by orderId
  if (req.query.orderId) {
    query['paymentInfo.orderId'] = req.query.orderId;
  }
  
  // Filter by payment status
  if (req.query.status) {
    if (req.query.status === 'paid') {
      query.isPaid = true;
    } else if (req.query.status === 'unpaid') {
      query.isPaid = false;
    } else if (req.query.status === 'refunded') {
      query.status = 'refunded';
    }
  }
  
  // Filter by payment method
  if (req.query.paymentMethod) {
    query.paymentMethod = req.query.paymentMethod;
  }
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    query.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  } else if (req.query.startDate) {
    query.createdAt = { $gte: new Date(req.query.startDate) };
  } else if (req.query.endDate) {
    query.createdAt = { $lte: new Date(req.query.endDate) };
  }
  
  // Filter by user
  if (req.query.userId) {
    query.user = req.query.userId;
  }
  
  // Filter by refId or transactionId
  if (req.query.refId) {
    query['paymentInfo.refId'] = req.query.refId;
  }
  
  if (req.query.transactionId) {
    query['paymentInfo.transactionId'] = req.query.transactionId;
  }
  
  // Filter by minimum amount
  if (req.query.minAmount) {
    query.totalPrice = { $gte: Number(req.query.minAmount) };
  }
  
  // Filter by maximum amount
  if (req.query.maxAmount) {
    query.totalPrice = { 
      ...query.totalPrice || {},
      $lte: Number(req.query.maxAmount) 
    };
  }
  
  // Count documents
  const total = await Order.countDocuments(query);
  
  // Add sorting
  const sortOptions = {};
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    sortOptions[sortBy] = req.query.order === 'asc' ? 1 : -1;
  } else {
    sortOptions.createdAt = -1; // Default sort by date descending
  }
  
  // Execute query
  const orders = await Order.find(query)
    .select('paymentMethod paymentInfo isPaid paidAt totalPrice status user createdAt refundInfo')
    .populate('user', 'fullName email phone')
    .sort(sortOptions)
    .skip(startIndex)
    .limit(limit);
  
  // Generate transaction records
  const transactions = orders.map(order => {
    return {
      _id: order._id,
      userId: order.user._id,
      userName: order.user.fullName,
      userEmail: order.user.email,
      userPhone: order.user.phone,
      orderId: order._id,
      amount: order.totalPrice,
      paymentMethod: order.paymentMethod,
      status: order.isPaid 
        ? (order.status === 'refunded' ? 'refunded' : 'paid') 
        : 'unpaid',
      refId: order.paymentInfo?.refId || null,
      transactionId: order.paymentInfo?.transactionId || null,
      authority: order.paymentInfo?.authority || null,
      date: order.isPaid ? order.paidAt : order.createdAt,
      refundInfo: order.refundInfo || null
    };
  });
  
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
  
  // Calculate total amount for paid transactions
  const paidTransactions = transactions.filter(t => t.status === 'paid');
  const totalPaidAmount = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate total amount for refunded transactions
  const refundedTransactions = transactions.filter(t => t.status === 'refunded');
  const totalRefundedAmount = refundedTransactions.reduce((sum, t) => sum + (t.refundInfo?.amount || 0), 0);
  
  res.status(200).json({
    success: true,
    count: transactions.length,
    pagination,
    total,
    summary: {
      totalPaidAmount,
      totalRefundedAmount,
      netAmount: totalPaidAmount - totalRefundedAmount
    },
    data: transactions
  });
});

/**
 * @desc    Export transactions as CSV
 * @route   GET /api/payment/transactions/export
 * @access  Private/Admin
 */
exports.exportTransactions = asyncHandler(async (req, res) => {
  // Build query (same as getTransactions)
  const query = {};
  
  // Filter by orderId
  if (req.query.orderId) {
    query['paymentInfo.orderId'] = req.query.orderId;
  }
  
  // Filter by payment status
  if (req.query.status) {
    if (req.query.status === 'paid') {
      query.isPaid = true;
    } else if (req.query.status === 'unpaid') {
      query.isPaid = false;
    } else if (req.query.status === 'refunded') {
      query.status = 'refunded';
    }
  }
  
  // Filter by payment method
  if (req.query.paymentMethod) {
    query.paymentMethod = req.query.paymentMethod;
  }
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    query.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  } else if (req.query.startDate) {
    query.createdAt = { $gte: new Date(req.query.startDate) };
  } else if (req.query.endDate) {
    query.createdAt = { $lte: new Date(req.query.endDate) };
  }
  
  // Filter by user
  if (req.query.userId) {
    query.user = req.query.userId;
  }
  
  // Filter by refId or transactionId
  if (req.query.refId) {
    query['paymentInfo.refId'] = req.query.refId;
  }
  
  if (req.query.transactionId) {
    query['paymentInfo.transactionId'] = req.query.transactionId;
  }
  
  // Filter by minimum amount
  if (req.query.minAmount) {
    query.totalPrice = { $gte: Number(req.query.minAmount) };
  }
  
  // Filter by maximum amount
  if (req.query.maxAmount) {
    query.totalPrice = { 
      ...query.totalPrice || {},
      $lte: Number(req.query.maxAmount) 
    };
  }
  
  // Add sorting
  const sortOptions = {};
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    sortOptions[sortBy] = req.query.order === 'asc' ? 1 : -1;
  } else {
    sortOptions.createdAt = -1; // Default sort by date descending
  }
  
  // Execute query (no pagination for export)
  const orders = await Order.find(query)
    .select('paymentMethod paymentInfo isPaid paidAt totalPrice status user createdAt refundInfo invoice')
    .populate('user', 'fullName email phone')
    .sort(sortOptions);
  
  // Convert orders to CSV format
  let csv = 'شناسه سفارش,شماره فاکتور,نام کاربر,ایمیل,شماره تماس,مبلغ,روش پرداخت,وضعیت,کد پیگیری,شناسه تراکنش,تاریخ\n';
  
  for (const order of orders) {
    const status = order.isPaid 
      ? (order.status === 'refunded' ? 'مسترد شده' : 'پرداخت شده') 
      : 'پرداخت نشده';
    
    const date = order.isPaid 
      ? new Date(order.paidAt).toLocaleString('fa-IR') 
      : new Date(order.createdAt).toLocaleString('fa-IR');
    
    const invoiceNumber = order.invoice?.invoiceNumber || '-';
    
    csv += `${order._id},${invoiceNumber},${order.user.fullName || '-'},${order.user.email || '-'},${order.user.phone || '-'},${order.totalPrice},${order.paymentMethod},${status},${order.paymentInfo?.refId || '-'},${order.paymentInfo?.transactionId || '-'},${date}\n`;
  }
  
  // Set headers for CSV download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
  
  // Send CSV
  res.send(csv);
});

/**
 * @desc    Get user wallet transactions
 * @route   GET /api/payment/wallet
 * @access  Private
 */
exports.getWalletTransactions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('wallet');
  
  if (!user) {
    return next(new ErrorHandler('کاربر یافت نشد', 404));
  }
  
  // Apply filters if needed
  let transactions = [...user.wallet.transactions];
  
  // Filter by transaction type
  if (req.query.type) {
    transactions = transactions.filter(t => t.type === req.query.type);
  }
  
  // Filter by date range
  if (req.query.startDate) {
    const startDate = new Date(req.query.startDate);
    transactions = transactions.filter(t => new Date(t.date) >= startDate);
  }
  
  if (req.query.endDate) {
    const endDate = new Date(req.query.endDate);
    transactions = transactions.filter(t => new Date(t.date) <= endDate);
  }
  
  // Sort by date (newest first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = transactions.length;
  
  // Calculate balance
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' || t.type === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' || t.type === 'purchase')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  // Create pagination result
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
  
  // Return paginated results
  const paginatedTransactions = transactions.slice(startIndex, endIndex);
  
  res.status(200).json({
    success: true,
    count: paginatedTransactions.length,
    pagination,
    total,
    balance: user.wallet.balance,
    summary: {
      totalDeposits,
      totalWithdrawals
    },
    data: paginatedTransactions
  });
}); 