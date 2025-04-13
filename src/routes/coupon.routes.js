const express = require('express');
const {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} = require('../controllers/coupon.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management
 */

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Create a new coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 description: Unique coupon code
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 description: Type of discount
 *               discountValue:
 *                 type: number
 *                 description: Value of discount (percentage or fixed amount)
 *               maxDiscount:
 *                 type: number
 *                 description: Maximum discount amount (for percentage discounts)
 *               minPurchase:
 *                 type: number
 *                 description: Minimum purchase amount required to use the coupon
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Expiration date of the coupon
 *               maxUsageCount:
 *                 type: number
 *                 description: Maximum number of times the coupon can be used
 *               isSingleUse:
 *                 type: boolean
 *                 description: Whether the coupon can be used only once per user
 *               isActive:
 *                 type: boolean
 *                 description: Whether the coupon is active
 *               description:
 *                 type: string
 *                 description: Description of the coupon
 *               productRestrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs this coupon is restricted to
 *               categoryRestrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of category IDs this coupon is restricted to
 *     responses:
 *       201:
 *         description: Coupon created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.post('/', protect, authorize('admin', 'manager'), createCoupon);

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Get all coupons
 *     tags: [Coupons]
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
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: expired
 *         schema:
 *           type: boolean
 *         description: Filter by expiry status
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Search by coupon code
 *     responses:
 *       200:
 *         description: List of coupons
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.get('/', protect, authorize('admin', 'manager'), getCoupons);

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon code
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - cartTotal
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code to validate
 *               cartTotal:
 *                 type: number
 *                 description: Total amount of cart for validation
 *     responses:
 *       200:
 *         description: Coupon is valid
 *       400:
 *         description: Invalid coupon
 *       401:
 *         description: Not authorized
 */
router.post('/validate', protect, validateCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Get coupon by ID
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon details
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Coupon not found
 */
router.get('/:id', protect, authorize('admin', 'manager'), getCouponById);

/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Update a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Coupon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               discountValue:
 *                 type: number
 *               maxDiscount:
 *                 type: number
 *               minPurchase:
 *                 type: number
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               maxUsageCount:
 *                 type: number
 *               isSingleUse:
 *                 type: boolean
 *               isActive:
 *                 type: boolean
 *               description:
 *                 type: string
 *               productRestrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *               categoryRestrictions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Coupon not found
 */
router.put('/:id', protect, authorize('admin', 'manager'), updateCoupon);

/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Delete a coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Coupon ID
 *     responses:
 *       200:
 *         description: Coupon deleted successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Coupon not found
 */
router.delete('/:id', protect, authorize('admin', 'manager'), deleteCoupon);

module.exports = router; 