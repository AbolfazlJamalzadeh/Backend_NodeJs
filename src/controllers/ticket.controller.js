const Ticket = require('../models/ticket.model');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Create a new support ticket
 * @route   POST /api/tickets
 * @access  Private
 */
exports.createTicket = asyncHandler(async (req, res, next) => {
  const { subject, message, department, priority, orderId } = req.body;
  
  // Validate required fields
  if (!subject || !message) {
    return next(new ErrorResponse('موضوع و پیام الزامی است', 400));
  }
  
  // Create ticket
  const ticket = await Ticket.create({
    subject,
    user: req.user.id,
    department: department || 'general',
    priority: priority || 'medium',
    status: 'open',
    messages: [
      {
        message,
        sender: req.user.id,
        senderType: 'user'
      }
    ],
    order: orderId,
    ticketNumber: Date.now().toString().substring(4) // Simple ticket number generation
  });
  
  res.status(201).json({
    success: true,
    message: 'تیکت پشتیبانی با موفقیت ثبت شد',
    data: ticket
  });
});

/**
 * @desc    Get all tickets (admin)
 * @route   GET /api/tickets
 * @access  Private/Admin
 */
exports.getTickets = asyncHandler(async (req, res) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Build filter
  const filter = {};
  
  // Filter by status
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  // Filter by priority
  if (req.query.priority) {
    filter.priority = req.query.priority;
  }
  
  // Filter by department
  if (req.query.department) {
    filter.department = req.query.department;
  }
  
  // Search by subject or ticketNumber
  if (req.query.search) {
    filter.$or = [
      { subject: { $regex: req.query.search, $options: 'i' } },
      { ticketNumber: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  
  const total = await Ticket.countDocuments(filter);
  
  const tickets = await Ticket.find(filter)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name')
    .populate('order', 'orderNumber totalPrice')
    .sort({ updatedAt: -1 })
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
    count: tickets.length,
    pagination,
    total,
    data: tickets
  });
});

/**
 * @desc    Get current user's tickets
 * @route   GET /api/tickets/me
 * @access  Private
 */
exports.getMyTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ user: req.user.id })
    .sort({ updatedAt: -1 });
  
  res.status(200).json({
    success: true,
    count: tickets.length,
    data: tickets
  });
});

/**
 * @desc    Get a single ticket
 * @route   GET /api/tickets/:id
 * @access  Private
 */
exports.getTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name')
    .populate('order', 'orderNumber totalPrice status')
    .populate('messages.sender', 'name role');
  
  if (!ticket) {
    return next(new ErrorResponse('تیکت مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is ticket owner or an admin/manager
  if (
    ticket.user._id.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  res.status(200).json({
    success: true,
    data: ticket
  });
});

/**
 * @desc    Update ticket (admin)
 * @route   PUT /api/tickets/:id
 * @access  Private/Admin
 */
exports.updateTicket = asyncHandler(async (req, res, next) => {
  const { status, priority, assignedTo } = req.body;
  
  let ticket = await Ticket.findById(req.params.id);
  
  if (!ticket) {
    return next(new ErrorResponse('تیکت مورد نظر یافت نشد', 404));
  }
  
  // Update fields
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (assignedTo) ticket.assignedTo = assignedTo;
  
  await ticket.save();
  
  // Return updated ticket with populated fields
  ticket = await Ticket.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name')
    .populate('order', 'orderNumber totalPrice status')
    .populate('messages.sender', 'name role');
  
  res.status(200).json({
    success: true,
    message: 'تیکت با موفقیت به‌روزرسانی شد',
    data: ticket
  });
});

/**
 * @desc    Add reply to ticket
 * @route   POST /api/tickets/:id/reply
 * @access  Private
 */
exports.addReply = asyncHandler(async (req, res, next) => {
  const { message } = req.body;
  
  if (!message) {
    return next(new ErrorResponse('پیام الزامی است', 400));
  }
  
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', 'name email')
    .populate('assignedTo', 'name');
  
  if (!ticket) {
    return next(new ErrorResponse('تیکت مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is ticket owner or an admin/manager
  if (
    ticket.user._id.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // If ticket is closed, prevent reply from non-admin users
  if (ticket.status === 'closed' && req.user.role === 'user') {
    return next(new ErrorResponse('این تیکت بسته شده است و امکان پاسخ وجود ندارد', 400));
  }
  
  // Add reply to ticket
  ticket.messages.push({
    message,
    sender: req.user.id,
    senderType: req.user.role === 'user' ? 'user' : 'staff'
  });
  
  // If ticket was closed and user replies, reopen it
  if (ticket.status === 'closed' && req.user.role === 'user') {
    ticket.status = 'open';
  }
  
  // Update ticket
  ticket.updatedAt = Date.now();
  await ticket.save();
  
  // Return updated ticket with populated messages
  const updatedTicket = await Ticket.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('assignedTo', 'name')
    .populate('messages.sender', 'name role');
  
  res.status(200).json({
    success: true,
    message: 'پاسخ با موفقیت ثبت شد',
    data: updatedTicket
  });
});

/**
 * @desc    Close ticket
 * @route   PUT /api/tickets/:id/close
 * @access  Private
 */
exports.closeTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);
  
  if (!ticket) {
    return next(new ErrorResponse('تیکت مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is ticket owner or an admin/manager
  if (
    ticket.user.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Update ticket status
  ticket.status = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = req.user.id;
  
  await ticket.save();
  
  res.status(200).json({
    success: true,
    message: 'تیکت با موفقیت بسته شد',
    data: ticket
  });
});

/**
 * @desc    Reopen ticket
 * @route   PUT /api/tickets/:id/reopen
 * @access  Private
 */
exports.reopenTicket = asyncHandler(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id);
  
  if (!ticket) {
    return next(new ErrorResponse('تیکت مورد نظر یافت نشد', 404));
  }
  
  // Make sure user is ticket owner or an admin/manager
  if (
    ticket.user.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'manager'
  ) {
    return next(new ErrorResponse('دسترسی غیر مجاز', 403));
  }
  
  // Check if ticket is already open
  if (ticket.status === 'open') {
    return next(new ErrorResponse('تیکت در حال حاضر باز است', 400));
  }
  
  // Update ticket status
  ticket.status = 'open';
  ticket.closedAt = undefined;
  ticket.closedBy = undefined;
  
  await ticket.save();
  
  res.status(200).json({
    success: true,
    message: 'تیکت با موفقیت مجدداً باز شد',
    data: ticket
  });
}); 