const analyticsService = require('../services/analytics.service');
const ErrorHandler = require('../utils/errorHandler');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    دریافت خلاصه داشبورد
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getDashboardSummary();
  res.status(200).json({
    success: true,
    data: summary
  });
});

/**
 * @desc    دریافت آنالیز فروش
 * @route   GET /api/analytics/sales
 * @access  Private/Admin
 */
exports.getSalesAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'monthly' } = req.query;
  
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return next(new ErrorHandler('دوره زمانی نامعتبر است', 400));
  }
  
  const salesData = await analyticsService.getSalesAnalytics(period);
  res.status(200).json({
    success: true,
    data: salesData
  });
});

/**
 * @desc    دریافت محصولات پرفروش
 * @route   GET /api/analytics/products/top
 * @access  Private/Admin
 */
exports.getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 10, period = 30 } = req.query;
  
  const topProducts = await analyticsService.getTopProducts(
    parseInt(limit, 10),
    parseInt(period, 10)
  );
  
  res.status(200).json({
    success: true,
    count: topProducts.length,
    data: topProducts
  });
});

/**
 * @desc    دریافت آنالیز بازدید محصولات
 * @route   GET /api/analytics/products/views
 * @access  Private/Admin
 */
exports.getProductViewsAnalytics = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const viewsData = await analyticsService.getProductViewsAnalytics(parseInt(limit, 10));
  
  res.status(200).json({
    success: true,
    count: viewsData.length,
    data: viewsData
  });
});

/**
 * @desc    دریافت آنالیز رشد کاربران
 * @route   GET /api/analytics/users/growth
 * @access  Private/Admin
 */
exports.getUserGrowthAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'monthly', months = 12 } = req.query;
  
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return next(new ErrorHandler('دوره زمانی نامعتبر است', 400));
  }
  
  const userGrowthData = await analyticsService.getUserGrowthAnalytics(
    period,
    parseInt(months, 10)
  );
  
  res.status(200).json({
    success: true,
    count: userGrowthData.length,
    data: userGrowthData
  });
});

/**
 * @desc    دریافت دسته‌بندی‌های پرفروش
 * @route   GET /api/analytics/categories/top
 * @access  Private/Admin
 */
exports.getTopCategories = asyncHandler(async (req, res) => {
  const { period = 30 } = req.query;
  
  const topCategories = await analyticsService.getTopCategories(parseInt(period, 10));
  
  res.status(200).json({
    success: true,
    count: topCategories.length,
    data: topCategories
  });
});

/**
 * @desc    دریافت آنالیز سودآوری
 * @route   GET /api/analytics/profitability
 * @access  Private/Admin
 */
exports.getProfitabilityAnalytics = asyncHandler(async (req, res, next) => {
  const { period = 'monthly', months = 12 } = req.query;
  
  if (!['daily', 'weekly', 'monthly'].includes(period)) {
    return next(new ErrorHandler('دوره زمانی نامعتبر است', 400));
  }
  
  const profitData = await analyticsService.getProfitabilityAnalytics(
    period,
    parseInt(months, 10)
  );
  
  res.status(200).json({
    success: true,
    count: profitData.length,
    data: profitData
  });
}); 