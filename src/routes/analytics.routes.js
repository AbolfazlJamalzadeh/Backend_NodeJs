const express = require('express');
const { 
  getDashboardSummary,
  getSalesAnalytics,
  getTopProducts,
  getProductViewsAnalytics,
  getUserGrowthAnalytics,
  getTopCategories,
  getProfitabilityAnalytics
} = require('../controllers/analytics.controller');

const router = express.Router();

// محافظت از مسیرها با middleware احراز هویت و بررسی نقش
const { protect, authorize } = require('../middlewares/auth.middleware');

// همه مسیرها فقط برای ادمین و مدیر قابل دسترسی هستند
router.use(protect);
router.use(authorize('admin', 'manager'));

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics dashboard
 */

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard summary
 *     description: Get summary statistics for the admin dashboard
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
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
 *                     totalStats:
 *                       type: object
 *                       description: Overall store statistics
 *                     currentMonthStats:
 *                       type: object
 *                       description: Current month statistics
 *                     inventoryStats:
 *                       type: object
 *                       description: Inventory statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', getDashboardSummary);

/**
 * @swagger
 * /api/analytics/sales:
 *   get:
 *     summary: Get sales analytics
 *     description: Get sales data and statistics over time periods
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         default: monthly
 *         description: Time period for analysis (daily, weekly, monthly)
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         description: Time period
 *                       totalSales:
 *                         type: number
 *                         description: Total sales amount
 *                       ordersCount:
 *                         type: number
 *                         description: Number of orders
 *                       avgOrderValue:
 *                         type: number
 *                         description: Average order value
 *                       itemsSold:
 *                         type: number
 *                         description: Number of items sold
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/sales', getSalesAnalytics);

/**
 * @swagger
 * /api/analytics/profitability:
 *   get:
 *     summary: Get profitability analytics
 *     description: Get profitability data and statistics over time periods
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         default: monthly
 *         description: Time period for analysis (daily, weekly, monthly)
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 36
 *         default: 12
 *         description: Number of past months to analyze
 *     responses:
 *       200:
 *         description: Success
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
 *                   description: Number of records
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         description: Time period
 *                       revenue:
 *                         type: number
 *                         description: Revenue
 *                       ordersCount:
 *                         type: number
 *                         description: Number of orders
 *                       estimatedProfit:
 *                         type: number
 *                         description: Estimated profit
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/profitability', getProfitabilityAnalytics);

/**
 * @swagger
 * /api/analytics/products/top:
 *   get:
 *     summary: Get top selling products
 *     description: Get list of top selling products based on sales volume
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: Number of products to return
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         default: 30
 *         description: Number of past days to analyze
 *     responses:
 *       200:
 *         description: Success
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
 *                   description: Number of products
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Product ID
 *                       productName:
 *                         type: string
 *                         description: Product name
 *                       totalQuantity:
 *                         type: number
 *                         description: Total quantity sold
 *                       totalRevenue:
 *                         type: number
 *                         description: Total revenue
 *                       ordersCount:
 *                         type: number
 *                         description: Number of orders
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/products/top', getTopProducts);

/**
 * @swagger
 * /api/analytics/products/views:
 *   get:
 *     summary: Get product views analytics
 *     description: Get product information based on view count
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: Success
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
 *                   description: Number of products
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Product ID
 *                       name:
 *                         type: string
 *                         description: Product name
 *                       clickCount:
 *                         type: number
 *                         description: View count
 *                       conversionRate:
 *                         type: number
 *                         description: Conversion rate (percent)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/products/views', getProductViewsAnalytics);

/**
 * @swagger
 * /api/analytics/users/growth:
 *   get:
 *     summary: Get user growth analytics
 *     description: Get user growth information over time periods
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *         default: monthly
 *         description: Time period for analysis (daily, weekly, monthly)
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 36
 *         default: 12
 *         description: Number of past months to analyze
 *     responses:
 *       200:
 *         description: Success
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
 *                   description: Number of records
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       period:
 *                         type: string
 *                         description: Time period
 *                       newUsers:
 *                         type: number
 *                         description: New users
 *                       cumulativeUsers:
 *                         type: number
 *                         description: Total users up to this period
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/users/growth', getUserGrowthAnalytics);

/**
 * @swagger
 * /api/analytics/categories/top:
 *   get:
 *     summary: Get top selling categories
 *     description: Get category information based on sales volume
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *         default: 30
 *         description: Number of past days to analyze
 *     responses:
 *       200:
 *         description: Success
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
 *                   description: Number of categories
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Category ID
 *                       categoryName:
 *                         type: string
 *                         description: Category name
 *                       totalRevenue:
 *                         type: number
 *                         description: Total revenue
 *                       totalQuantity:
 *                         type: number
 *                         description: Total quantity sold
 *                       ordersCount:
 *                         type: number
 *                         description: Number of orders
 *                       percentageOfSales:
 *                         type: number
 *                         description: Percentage of total sales
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/categories/top', getTopCategories);

module.exports = router; 