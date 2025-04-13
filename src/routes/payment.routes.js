const express = require('express');
const {
  createPayment,
  verifyPayment,
  getPaymentStatus,
  getUnverifiedTransactions,
  processRefund,
  getTransactions,
  exportTransactions,
  getWalletTransactions
} = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment and transaction management
 */

/**
 * @swagger
 * /api/payment/create/{orderId}:
 *   post:
 *     summary: Create payment request for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 gatewayUrl:
 *                   type: string
 *                   example: https://www.zarinpal.com/pg/StartPay/000000000000000000000000000000123456
 *                 authority:
 *                   type: string
 *                   example: 000000000000000000000000000000123456
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.post('/create/:orderId', protect, createPayment);

/**
 * @swagger
 * /api/payment/verify/{orderId}:
 *   get:
 *     summary: Verify payment (callback from payment gateway)
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *       - in: query
 *         name: Authority
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment authority code
 *       - in: query
 *         name: Status
 *         schema:
 *           type: string
 *         required: true
 *         description: Payment status (OK or NOK)
 *     responses:
 *       302:
 *         description: Redirects to frontend success or failure page
 */
router.get('/verify/:orderId', verifyPayment);

/**
 * @swagger
 * /api/payment/status/{orderId}:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment status
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
 *                     orderId:
 *                       type: string
 *                     isPaid:
 *                       type: boolean
 *                     status:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     paymentInfo:
 *                       type: object
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.get('/status/:orderId', protect, getPaymentStatus);

/**
 * @swagger
 * /api/payment/unverified:
 *   get:
 *     summary: Get unverified transactions (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unverified transactions
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Forbidden
 */
router.get('/unverified', protect, authorize('admin', 'manager'), getUnverifiedTransactions);

/**
 * @swagger
 * /api/payment/refund/{orderId}:
 *   post:
 *     summary: Process refund for an order (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               reason:
 *                 type: string
 *                 example: درخواست مشتری
 *               amount:
 *                 type: number
 *                 description: مبلغ استرداد (اختیاری - در صورت عدم ارسال، کل مبلغ سفارش مسترد می‌شود)
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     refId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     date:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Order not found
 */
router.post('/refund/:orderId', protect, authorize('admin', 'manager'), processRefund);

/**
 * @swagger
 * /api/payment/transactions:
 *   get:
 *     summary: Get all transactions with filters (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Filter by order ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, unpaid, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [zarinpal, idpay, wallet, cod]
 *         description: Filter by payment method
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
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: refId
 *         schema:
 *           type: string
 *         description: Filter by payment reference ID
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         description: Filter by transaction ID
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Filter by minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Filter by maximum amount
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (e.g. createdAt, totalPrice)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (default is desc)
 *     responses:
 *       200:
 *         description: List of transactions
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
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalPaidAmount:
 *                       type: number
 *                     totalRefundedAmount:
 *                       type: number
 *                     netAmount:
 *                       type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/transactions', protect, authorize('admin', 'manager'), getTransactions);

/**
 * @swagger
 * /api/payment/transactions/export:
 *   get:
 *     summary: Export transactions as CSV (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, unpaid, refunded]
 *         description: Filter by payment status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [zarinpal, idpay, wallet, cod]
 *         description: Filter by payment method
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
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 */
router.get('/transactions/export', protect, authorize('admin', 'manager'), exportTransactions);

/**
 * @swagger
 * /api/payment/wallet:
 *   get:
 *     summary: Get user wallet transactions with filters
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, purchase, refund]
 *         description: Filter by transaction type
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
 *     responses:
 *       200:
 *         description: User wallet transactions
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
 *                 balance:
 *                   type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalDeposits:
 *                       type: number
 *                     totalWithdrawals:
 *                       type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
router.get('/wallet', protect, getWalletTransactions);

module.exports = router; 