const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getFeaturedProducts,
  getRecentProducts,
  getPopularProducts,
  updateProductInventory,
  // Holoo integration endpoints
  syncProductsFromHoloo,
  previewHolooProducts,
  importSingleProduct,
  startHolooPeriodicSync,
  stopHolooPeriodicSync,
  getHolooSyncStatus
} = require('../controllers/product.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

// Re-route into review router
const reviewRouter = require('./review.routes');
router.use('/:id/reviews', reviewRouter);

// Re-route into question router
const questionRouter = require('./question.routes');
router.use('/:id/questions', questionRouter);

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, description or SKU
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter by in stock status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price-asc, price-desc, popular, rating]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', getProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               featured:
 *                 type: boolean
 *               specifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     value:
 *                       type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 */
router.post('/', protect, authorize('admin', 'manager'), createProduct);

/**
 * @swagger
 * /api/products/featured:
 *   get:
 *     summary: Get featured products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of featured products
 */
router.get('/featured', getFeaturedProducts);

/**
 * @swagger
 * /api/products/recent:
 *   get:
 *     summary: Get recently added products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of recent products
 */
router.get('/recent', getRecentProducts);

/**
 * @swagger
 * /api/products/popular:
 *   get:
 *     summary: Get popular products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of popular products
 */
router.get('/popular', getPopularProducts);

/**
 * @swagger
 * /api/products/slug/{slug}:
 *   get:
 *     summary: Get product by slug
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Product slug
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/slug/:slug', getProductBySlug);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               salePrice:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               brand:
 *                 type: string
 *               countInStock:
 *                 type: number
 *               featured:
 *                 type: boolean
 *               specifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     value:
 *                       type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Product not found
 */
router.put('/:id', protect, authorize('admin', 'manager'), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Product not found
 */
router.delete('/:id', protect, authorize('admin', 'manager'), deleteProduct);

/**
 * @swagger
 * /api/products/{id}/inventory:
 *   put:
 *     summary: Update product inventory
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countInStock:
 *                 type: number
 *               trackInventory:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Product not found
 */
router.put('/:id/inventory', protect, authorize('admin', 'manager'), updateProductInventory);

/**
 * @swagger
 * /api/products/holoo/sync:
 *   post:
 *     summary: Synchronize products from Holoo
 *     description: Synchronizes products and categories from Holoo ERP system to the website
 *     tags: [Holoo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for paginated synchronization
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products per page
 *       - in: query
 *         name: updateAll
 *         schema:
 *           type: boolean
 *         description: Whether to update all products or only those that have changed
 *     responses:
 *       200:
 *         description: Synchronization completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/holoo/sync')
  .post(protect, authorize('admin'), syncProductsFromHoloo);

/**
 * @swagger
 * /api/products/holoo/preview:
 *   get:
 *     summary: Preview Holoo products without importing
 *     description: Shows the list of products available in Holoo without synchronizing them
 *     tags: [Holoo]
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
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/holoo/preview')
  .get(protect, authorize('admin'), previewHolooProducts);

/**
 * @swagger
 * /api/products/holoo/import/{erpCode}:
 *   post:
 *     summary: Import a specific product from Holoo
 *     description: Imports a specific product with ErpCode from Holoo
 *     tags: [Holoo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: erpCode
 *         required: true
 *         schema:
 *           type: string
 *         description: ErpCode of the product in Holoo
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found in Holoo
 *       500:
 *         description: Server error
 */
router.route('/holoo/import/:erpCode')
  .post(protect, authorize('admin'), importSingleProduct);

/**
 * @swagger
 * /api/products/holoo/start-periodic-sync:
 *   post:
 *     summary: Start periodic synchronization with Holoo
 *     description: Starts the periodic synchronization process with Holoo
 *     tags: [Holoo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: interval
 *         schema:
 *           type: integer
 *         description: Synchronization interval in minutes
 *     responses:
 *       200:
 *         description: Periodic synchronization started
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/holoo/start-periodic-sync')
  .post(protect, authorize('admin'), startHolooPeriodicSync);

/**
 * @swagger
 * /api/products/holoo/stop-periodic-sync:
 *   post:
 *     summary: Stop periodic synchronization with Holoo
 *     description: Stops the periodic synchronization process with Holoo
 *     tags: [Holoo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Periodic synchronization stopped
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/holoo/stop-periodic-sync')
  .post(protect, authorize('admin'), stopHolooPeriodicSync);

/**
 * @swagger
 * /api/products/holoo/status:
 *   get:
 *     summary: Get Holoo synchronization status
 *     description: Shows the current status of Holoo synchronization
 *     tags: [Holoo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status information retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/holoo/status')
  .get(protect, authorize('admin'), getHolooSyncStatus);

module.exports = router; 