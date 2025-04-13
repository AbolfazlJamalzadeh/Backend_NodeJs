const Chat = require('../models/chat.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Start a new chat session
 * @route   POST /api/chat/start
 * @access  Private
 */

exports.startChat = asyncHandler(async (req, res, next) => {
  const { currentPage, browser, os } = req.body;
  
  // Check if user has an active chat
  const existingChat = await Chat.findOne({
    user: req.user.id,
    status: { $ne: 'closed' }
  });
  
  if (existingChat) {
    return res.status(200).json({
      success: true,
      message: 'گفتگوی فعال یافت شد',
      data: existingChat
    });
  }
  
  // Get user's order info
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  const totalSpent = orders.reduce((sum, order) => {
    if (order.paymentStatus === 'paid') {
      return sum + order.totalPrice;
    }
    return sum;
  }, 0);
  
  // Create new chat
  const chat = await Chat.create({
    user: req.user.id,
    userName: req.user.fullName,
    userEmail: req.user.email,
    userAvatar: req.user.avatar,
    userInfo: {
      browser,
      os,
      ip: req.ip,
      lastOrderId: orders.length > 0 ? orders[0]._id : null,
      totalOrders: orders.length,
      totalSpent,
      registeredSince: req.user.createdAt,
      currentPage
    },
    messages: [
      {
        sender: 'system',
        content: 'گفتگوی پشتیبانی شروع شد. لطفا چند لحظه منتظر بمانید تا یکی از همکاران ما به شما پاسخ دهد.',
        timestamp: Date.now()
      }
    ]
  });
  
  res.status(201).json({
    success: true,
    message: 'گفتگو با موفقیت آغاز شد',
    data: chat
  });
});

/**
 * @desc    Get active chat session for current user
 * @route   GET /api/chat/current
 * @access  Private
 */
exports.getCurrentChat = asyncHandler(async (req, res, next) => {
  const chat = await Chat.findOne({
    user: req.user.id,
    status: { $ne: 'closed' }
  }).sort({ createdAt: -1 });
  
  if (!chat) {
    return res.status(404).json({
      success: false,
      message: 'گفتگوی فعالی یافت نشد'
    });
  }
  
  // Mark agent messages as read
  await chat.markMessagesAsRead('user');
  
  res.status(200).json({
    success: true,
    data: chat
  });
});

/**
 * @desc    Get user's chat history
 * @route   GET /api/chat/history
 * @access  Private
 */
exports.getChatHistory = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  const chats = await Chat.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit);
  
  const total = await Chat.countDocuments({ user: req.user.id });
  
  res.status(200).json({
    success: true,
    count: chats.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: chats
  });
});

/**
 * @desc    Send message in a chat
 * @route   POST /api/chat/:id/messages
 * @access  Private
 */
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { content, attachments } = req.body;
  
  if (!content && (!attachments || attachments.length === 0)) {
    return next(new ErrorResponse('پیام نمی‌تواند خالی باشد', 400));
  }
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  // Check if user is authorized to send message in this chat
  if (
    chat.user.toString() !== req.user.id && 
    (!chat.agent || chat.agent.toString() !== req.user.id) &&
    !['admin', 'manager'].includes(req.user.role)
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Check if chat is closed
  if (chat.status === 'closed') {
    return next(new ErrorResponse('گفتگو بسته شده است', 400));
  }
  
  // Create message object
  const message = {
    sender: chat.user.toString() === req.user.id ? 'user' : 'agent',
    senderId: req.user.id,
    senderName: req.user.fullName,
    content,
    timestamp: Date.now(),
    attachments: attachments || []
  };
  
  // Add message to chat
  await chat.addMessage(message);
  
  // If the agent is replying and hasn't been assigned yet, assign them
  if (
    message.sender === 'agent' && 
    (!chat.agent || chat.agent.toString() !== req.user.id)
  ) {
    await chat.assignAgent(req.user.id, req.user.fullName);
  }
  
  res.status(201).json({
    success: true,
    message: 'پیام با موفقیت ارسال شد',
    data: message
  });
});

/**
 * @desc    Get all active chats (admin)
 * @route   GET /api/chat/active
 * @access  Private/Admin
 */
exports.getActiveChats = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Build filter
  const filter = {
    status: { $ne: 'closed' }
  };
  
  // Filter by agent
  if (req.query.agent === 'unassigned') {
    filter.agent = null;
  } else if (req.query.agent) {
    filter.agent = req.query.agent;
  }
  
  // Filter by status
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Filter by user search
  if (req.query.search) {
    filter.$or = [
      { userName: { $regex: req.query.search, $options: 'i' } },
      { userEmail: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await Chat.countDocuments(filter);
  
  const chats = await Chat.find(filter)
    .populate('user', 'fullName email phone avatar')
    .populate('agent', 'fullName')
    .populate('userInfo.lastOrderId', 'orderNumber totalPrice')
    .sort({ lastUserActivity: -1 })
    .skip(startIndex)
    .limit(limit);
  
  res.status(200).json({
    success: true,
    count: chats.length,
    total,
    pagination: {
      page,
      limit,
      pages: Math.ceil(total / limit)
    },
    data: chats
  });
});

/**
 * @desc    Get a specific chat by ID (admin)
 * @route   GET /api/chat/:id
 * @access  Private/Admin
 */
exports.getChatById = asyncHandler(async (req, res, next) => {
  const chat = await Chat.findById(req.params.id)
    .populate('user', 'fullName email phone avatar createdAt orders')
    .populate('agent', 'fullName')
    .populate('userInfo.lastOrderId', 'orderNumber totalPrice status');
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  // Check permissions
  if (
    chat.user._id.toString() !== req.user.id && 
    (!chat.agent || chat.agent._id.toString() !== req.user.id) &&
    !['admin', 'manager'].includes(req.user.role)
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // If admin/agent is viewing, mark user messages as read
  if (req.user.role === 'admin' || req.user.role === 'manager' || 
      (chat.agent && chat.agent._id.toString() === req.user.id)) {
    await chat.markMessagesAsRead('agent');
  } else {
    // User is viewing, mark agent messages as read
    await chat.markMessagesAsRead('user');
  }
  
  res.status(200).json({
    success: true,
    data: chat
  });
});

/**
 * @desc    Assign chat to an agent
 * @route   PUT /api/chat/:id/assign
 * @access  Private/Admin
 */
exports.assignChat = asyncHandler(async (req, res, next) => {
  const { agentId } = req.body;
  
  if (!agentId) {
    return next(new ErrorResponse('شناسه پشتیبان الزامی است', 400));
  }
  
  // Find agent
  const agent = await User.findById(agentId);
  
  if (!agent || !['admin', 'manager', 'support'].includes(agent.role)) {
    return next(new ErrorResponse('پشتیبان یافت نشد', 404));
  }
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  if (chat.status === 'closed') {
    return next(new ErrorResponse('گفتگو بسته شده است', 400));
  }
  
  await chat.assignAgent(agent._id, agent.fullName);
  
  res.status(200).json({
    success: true,
    message: 'پشتیبان با موفقیت اختصاص داده شد',
    data: chat
  });
});

/**
 * @desc    Close a chat
 * @route   PUT /api/chat/:id/close
 * @access  Private
 */
exports.closeChat = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  // Check if user is authorized to close this chat
  if (
    chat.user.toString() !== req.user.id && 
    (!chat.agent || chat.agent.toString() !== req.user.id) &&
    !['admin', 'manager'].includes(req.user.role)
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  if (chat.status === 'closed') {
    return next(new ErrorResponse('گفتگو قبلاً بسته شده است', 400));
  }
  
  await chat.endChat(reason);
  
  res.status(200).json({
    success: true,
    message: 'گفتگو با موفقیت بسته شد',
    data: chat
  });
});

/**
 * @desc    Add rating to a chat
 * @route   PUT /api/chat/:id/rate
 * @access  Private
 */
exports.rateChat = asyncHandler(async (req, res, next) => {
  const { score, feedback } = req.body;
  
  if (!score || score < 1 || score > 5) {
    return next(new ErrorResponse('امتیاز معتبر (1-5) الزامی است', 400));
  }
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  // Only the user can rate the chat
  if (chat.user.toString() !== req.user.id) {
    return next(new ErrorResponse('فقط کاربر می‌تواند گفتگو را ارزیابی کند', 403));
  }
  
  await chat.addRating(score, feedback);
  
  res.status(200).json({
    success: true,
    message: 'ارزیابی با موفقیت ثبت شد',
    data: chat.rating
  });
});

/**
 * @desc    Get chat statistics
 * @route   GET /api/chat/stats
 * @access  Private/Admin
 */
exports.getChatStats = asyncHandler(async (req, res, next) => {
  // Get total chats grouped by status
  const totalByStatus = await Chat.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get average response time for the first reply
  const averageResponseTime = await Chat.aggregate([
    { $match: { status: { $ne: 'pending' } } },
    {
      $project: {
        responseTime: {
          $divide: [
            { $subtract: ['$lastAgentActivity', '$startedAt'] },
            1000 * 60 // Convert to minutes
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgTime: { $avg: '$responseTime' }
      }
    }
  ]);
  
  // Get average chat duration for closed chats
  const averageChatDuration = await Chat.aggregate([
    { $match: { status: 'closed' } },
    {
      $project: {
        duration: {
          $divide: [
            { $subtract: ['$endedAt', '$startedAt'] },
            1000 * 60 // Convert to minutes
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' }
      }
    }
  ]);
  
  // Get average rating
  const averageRating = await Chat.aggregate([
    { $match: { 'rating.score': { $exists: true } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating.score' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
  
  // Get top agents by number of chats
  const topAgents = await Chat.aggregate([
    { $match: { agent: { $ne: null } } },
    {
      $group: {
        _id: '$agent',
        agentName: { $first: '$agentName' },
        totalChats: { $sum: 1 },
        avgRating: { $avg: { $ifNull: ['$rating.score', 0] } }
      }
    },
    { $sort: { totalChats: -1 } },
    { $limit: 5 }
  ]);
  
  // Prepare the response
  const stats = {
    totalChats: await Chat.countDocuments(),
    activeChats: await Chat.countDocuments({ status: 'active' }),
    pendingChats: await Chat.countDocuments({ status: 'pending' }),
    closedChats: await Chat.countDocuments({ status: 'closed' }),
    statusBreakdown: totalByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    averageResponseTime: averageResponseTime.length > 0 ? Math.round(averageResponseTime[0].avgTime) : 0,
    averageChatDuration: averageChatDuration.length > 0 ? Math.round(averageChatDuration[0].avgDuration) : 0,
    averageRating: averageRating.length > 0 ? 
      { score: averageRating[0].avgRating.toFixed(1), totalRatings: averageRating[0].totalRatings } : 
      { score: 0, totalRatings: 0 },
    topAgents
  };
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Add note to a chat
 * @route   PUT /api/chat/:id/note
 * @access  Private/Admin
 */
exports.addNote = asyncHandler(async (req, res, next) => {
  const { note } = req.body;
  
  if (!note) {
    return next(new ErrorResponse('متن یادداشت الزامی است', 400));
  }
  
  const chat = await Chat.findById(req.params.id);
  
  if (!chat) {
    return next(new ErrorResponse('گفتگو یافت نشد', 404));
  }
  
  // Only admin, manager, or assigned agent can add notes
  if (
    !['admin', 'manager'].includes(req.user.role) && 
    (!chat.agent || chat.agent.toString() !== req.user.id)
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  chat.notes = note;
  await chat.save();
  
  res.status(200).json({
    success: true,
    message: 'یادداشت با موفقیت اضافه شد',
    data: chat
  });
}); 