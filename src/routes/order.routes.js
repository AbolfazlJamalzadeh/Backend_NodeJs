const express = require('express');
const {
  createOrder,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getInvoice,
  getInvoicePdf
} = require('../controllers/order.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all routes in this router
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *               - paymentMethod
 *               - shippingMethod
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 required:
 *                   - address
 *                   - city
 *                   - postalCode
 *                   - province
 *                 properties:
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   postalCode:
 *                     type: string
 *                   province:
 *                     type: string
 *                   recipientName:
 *                     type: string
 *                   recipientPhone:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [online, card, cod]
 *               shippingMethod:
 *                 type: string
 *                 enum: [standard, express]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input or empty cart
 *       401:
 *         description: Not authorized
 */
router.post('/', createOrder);

/**
 * @swagger
 * /api/orders/me:
 *   get:
 *     summary: Get current user's orders with filters
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of items per page (default: 10)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendingPayment, processing, shipped, delivered, cancelled, refunded, returned]
 *         description: Filter by order status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, unpaid]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: List of user's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 total:
 *                   type: integer
 *                 statusSummary:
 *                   type: object
 *                   properties:
 *                     pendingPayment:
 *                       type: integer
 *                     processing:
 *                       type: integer
 *                     shipped:
 *                       type: integer
 *                     delivered:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                     refunded:
 *                       type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authorized
 */
router.get('/me', getMyOrders);

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.get('/stats', authorize('admin', 'manager'), getOrderStats);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with filters (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of items per page (default: 10)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pendingPayment, processing, shipped, delivered, cancelled, refunded, returned]
 *         description: Filter by order status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, unpaid]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD)
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Search by customer name, email or phone
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/', authorize('admin', 'manager'), getOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.get('/:id', getOrderById);

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update order status (admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, shipped, delivered, cancelled]
 *               trackingCode:
 *                 type: string
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded]
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Order not found
 */
router.put('/:id', authorize('admin', 'manager'), updateOrderStatus);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Order not found
 */
router.put('/:id/cancel', cancelOrder);

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Get order invoice
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     invoiceNumber:
 *                       type: string
 *                     invoiceDate:
 *                       type: string
 *                       format: date-time
 *                     orderDate:
 *                       type: string
 *                       format: date-time
 *                     paidDate:
 *                       type: string
 *                       format: date-time
 *                     paymentMethod:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     customer:
 *                       type: object
 *                     items:
 *                       type: array
 *                     summary:
 *                       type: object
 *                     status:
 *                       type: string
 *                     holooSync:
 *                       type: object
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.get('/:id/invoice', getInvoice);

/**
 * @swagger
 * /api/orders/{id}/invoice/pdf:
 *   get:
 *     summary: Generate and download invoice PDF
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: PDF Invoice
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.get('/:id/invoice/pdf', getInvoicePdf);

module.exports = router; 