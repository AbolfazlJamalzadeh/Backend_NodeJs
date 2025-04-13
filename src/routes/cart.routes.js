const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} = require('../controllers/cart.controller');

const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

// Protect all routes in this router
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Shopping cart management
 */

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's cart retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get('/', getCart);

/**
 * @swagger
 * /api/cart:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID to add to cart
 *               quantity:
 *                 type: number
 *                 default: 1
 *                 description: Quantity of the product
 *               variant:
 *                 type: string
 *                 description: Variant identifier (if applicable)
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Invalid input or product not in stock
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Product not found
 */
router.post('/', addToCart);

/**
 * @swagger
 * /api/cart/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 description: New quantity for the item
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *       400:
 *         description: Invalid quantity
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Cart or item not found
 */
router.put('/:itemId', updateCartItem);

/**
 * @swagger
 * /api/cart/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         schema:
 *           type: string
 *         required: true
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Cart or item not found
 */
router.delete('/:itemId', removeCartItem);

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Cart not found
 */
router.delete('/', clearCart);

/**
 * @swagger
 * /api/cart/coupon:
 *   post:
 *     summary: Apply coupon to cart
 *     tags: [Cart]
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
 *             properties:
 *               code:
 *                 type: string
 *                 description: Coupon code to apply
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 *       400:
 *         description: Invalid coupon or coupon requirements not met
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Cart not found
 */
router.post('/coupon', applyCoupon);

/**
 * @swagger
 * /api/cart/coupon:
 *   delete:
 *     summary: Remove coupon from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon removed successfully
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Cart not found
 */
router.delete('/coupon', removeCoupon);

module.exports = router; 