const express = require('express');
const {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  answerQuestion,
  approveQuestion,
  reportQuestion,
  likeQuestion,
  getMyQuestions,
  getProductQuestions
} = require('../controllers/question.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Product Q&A management
 */

/**
 * @swagger
 * /api/questions:
 *   get:
 *     summary: Get all questions
 *     tags: [Questions]
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
 *         name: product
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: approved
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by approval status (admin only)
 *       - in: query
 *         name: answered
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by answer status
 *     responses:
 *       200:
 *         description: List of questions
 *   post:
 *     summary: Create new question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product
 *               - question
 *             properties:
 *               product:
 *                 type: string
 *                 description: Product ID
 *               question:
 *                 type: string
 *                 description: Question text
 *               isPrivate:
 *                 type: boolean
 *                 description: Is question private
 *     responses:
 *       201:
 *         description: Question created successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Product not found
 */
router.route('/')
  .get(getQuestions)
  .post(protect, createQuestion);

/**
 * @swagger
 * /api/questions/me:
 *   get:
 *     summary: Get my questions
 *     tags: [Questions]
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
 *         name: answered
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by answer status
 *     responses:
 *       200:
 *         description: List of my questions
 */
router.route('/me').get(protect, getMyQuestions);

/**
 * @swagger
 * /api/questions/{id}:
 *   get:
 *     summary: Get question by ID
 *     tags: [Questions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question details
 *       404:
 *         description: Question not found
 *   put:
 *     summary: Update question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 description: Question text
 *               isPrivate:
 *                 type: boolean
 *                 description: Is question private
 *               isApproved:
 *                 type: boolean
 *                 description: Approval status (admin only)
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Question not found
 *   delete:
 *     summary: Delete question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Question not found
 */
router.route('/:id')
  .get(getQuestionById)
  .put(protect, updateQuestion)
  .delete(protect, deleteQuestion);

/**
 * @swagger
 * /api/questions/{id}/answer:
 *   put:
 *     summary: Answer a question (admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Answer text
 *     responses:
 *       200:
 *         description: Answer submitted successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Question not found
 */
router.route('/:id/answer').put(protect, authorize('admin', 'manager'), answerQuestion);

/**
 * @swagger
 * /api/questions/{id}/approve:
 *   put:
 *     summary: Approve question (admin only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question approved successfully
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Question not found
 */
router.route('/:id/approve').put(protect, authorize('admin', 'manager'), approveQuestion);

/**
 * @swagger
 * /api/questions/{id}/report:
 *   put:
 *     summary: Report inappropriate question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Report reason
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Question not found
 */
router.route('/:id/report').put(protect, reportQuestion);

/**
 * @swagger
 * /api/questions/{id}/like:
 *   put:
 *     summary: Like question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Like submitted successfully
 *       404:
 *         description: Question not found
 */
router.route('/:id/like').put(protect, likeQuestion);

module.exports = router; 