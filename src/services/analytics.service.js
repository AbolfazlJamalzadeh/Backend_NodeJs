const Order = require('../models/order.model');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

class AnalyticsService {
  // آنالیز فروش
  async getSalesAnalytics(period = 'monthly') {
    try {
      let groupBy;
      let dateFormat;
      
      // تعیین دوره زمانی برای گروه‌بندی
      switch (period) {
        case 'daily':
          groupBy = { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'weekly':
          groupBy = { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $concat: [{ $toString: { $year: '$createdAt' } }, '-W', { $toString: { $week: '$createdAt' } }] };
          break;
        case 'monthly':
        default:
          groupBy = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      }

      // انجام عملیات خلاصه‌سازی فروش‌ها
      const salesData = await Order.aggregate([
        { $match: { isPaid: true } },
        {
          $group: {
            _id: groupBy,
            period: { $first: dateFormat },
            totalSales: { $sum: '$totalPrice' },
            ordersCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalPrice' },
            itemsSold: { $sum: '$totalItems' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            period: 1,
            totalSales: 1,
            ordersCount: 1,
            avgOrderValue: { $round: ['$avgOrderValue', 0] },
            itemsSold: 1
          }
        }
      ]);

      return salesData;
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیز فروش: ${error.message}`);
    }
  }

  // آنالیز محصولات پرفروش
  async getTopProducts(limit = 10, period = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const topProducts = await Order.aggregate([
        { 
          $match: { 
            isPaid: true,
            createdAt: { $gte: startDate } 
          } 
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.name' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            ordersCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            productName: 1,
            totalQuantity: 1,
            totalRevenue: 1,
            ordersCount: 1,
            category: '$productDetails.category',
            currentStock: '$productDetails.stock',
            image: { $arrayElemAt: ['$productDetails.images', 0] }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit }
      ]);

      return topProducts;
    } catch (error) {
      throw new Error(`خطا در دریافت محصولات پرفروش: ${error.message}`);
    }
  }

  // آنالیز بازدید محصولات
  async getProductViewsAnalytics(limit = 10) {
    try {
      const mostViewedProducts = await Product.aggregate([
        { $sort: { clickCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        { $unwind: { path: '$categoryDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            clickCount: 1,
            price: 1,
            stock: 1,
            sold: 1,
            image: { $arrayElemAt: ['$images', 0] },
            categoryName: '$categoryDetails.name',
            conversionRate: { 
              $cond: [
                { $eq: ['$clickCount', 0] },
                0,
                { $multiply: [{ $divide: ['$sold', '$clickCount'] }, 100] }
              ] 
            }
          }
        }
      ]);

      return mostViewedProducts;
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیز بازدید محصولات: ${error.message}`);
    }
  }

  // آنالیز رشد کاربران
  async getUserGrowthAnalytics(period = 'monthly', months = 12) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let groupBy;
      let dateFormat;
      
      switch (period) {
        case 'daily':
          groupBy = { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'weekly':
          groupBy = { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $concat: [{ $toString: { $year: '$createdAt' } }, '-W', { $toString: { $week: '$createdAt' } }] };
          break;
        case 'monthly':
        default:
          groupBy = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      }

      const userGrowth = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: groupBy,
            period: { $first: dateFormat },
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
        { $project: { _id: 0, period: 1, newUsers: 1 } }
      ]);

      // محاسبه کاربران تجمعی
      let cumulativeUsers = 0;
      const userGrowthWithCumulative = userGrowth.map(item => {
        cumulativeUsers += item.newUsers;
        return {
          ...item,
          cumulativeUsers
        };
      });

      return userGrowthWithCumulative;
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیز رشد کاربران: ${error.message}`);
    }
  }

  // آنالیز دسته‌بندی‌های پرفروش
  async getTopCategories(period = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const topCategories = await Order.aggregate([
        { 
          $match: { 
            isPaid: true,
            createdAt: { $gte: startDate } 
          } 
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        { $unwind: '$productDetails' },
        {
          $group: {
            _id: '$productDetails.category',
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            totalQuantity: { $sum: '$items.quantity' },
            ordersCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        { $unwind: '$categoryDetails' },
        {
          $project: {
            _id: 1,
            categoryName: '$categoryDetails.name',
            totalRevenue: 1,
            totalQuantity: 1,
            ordersCount: 1,
            percentageOfSales: 1
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);

      // محاسبه کل فروش برای محاسبه درصد فروش هر دسته‌بندی
      const totalSales = topCategories.reduce((sum, category) => sum + category.totalRevenue, 0);
      
      return topCategories.map(category => ({
        ...category,
        percentageOfSales: totalSales ? parseFloat(((category.totalRevenue / totalSales) * 100).toFixed(2)) : 0
      }));
    } catch (error) {
      throw new Error(`خطا در دریافت دسته‌بندی‌های پرفروش: ${error.message}`);
    }
  }

  // آنالیز سودآوری
  async getProfitabilityAnalytics(period = 'monthly', months = 12) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      let groupBy;
      let dateFormat;
      
      switch (period) {
        case 'daily':
          groupBy = { day: { $dayOfMonth: '$createdAt' }, month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'weekly':
          groupBy = { week: { $week: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $concat: [{ $toString: { $year: '$createdAt' } }, '-W', { $toString: { $week: '$createdAt' } }] };
          break;
        case 'monthly':
        default:
          groupBy = { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } };
          dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      }

      // فرض می‌کنیم که 30% از مبلغ فروش، سود خالص است
      // برای محاسبه دقیق‌تر باید اطلاعات هزینه‌ها را هم داشته باشیم
      const profitData = await Order.aggregate([
        { 
          $match: { 
            isPaid: true,
            createdAt: { $gte: startDate } 
          } 
        },
        {
          $group: {
            _id: groupBy,
            period: { $first: dateFormat },
            revenue: { $sum: '$totalPrice' },
            ordersCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } },
        {
          $project: {
            _id: 0,
            period: 1,
            revenue: 1,
            ordersCount: 1,
            // فرض 30% سود خالص
            estimatedProfit: { $multiply: ['$revenue', 0.3] }
          }
        }
      ]);

      return profitData;
    } catch (error) {
      throw new Error(`خطا در دریافت آنالیز سودآوری: ${error.message}`);
    }
  }

  // داشبورد خلاصه آمار
  async getDashboardSummary() {
    try {
      // محاسبه آمار کلی
      const totalOrders = await Order.countDocuments({ isPaid: true });
      const totalRevenue = await Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);
      const totalUsers = await User.countDocuments();
      const totalProducts = await Product.countDocuments();

      // محاسبه آمار ماه جاری
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const currentMonthOrders = await Order.countDocuments({ 
        isPaid: true,
        createdAt: { $gte: firstDayOfMonth }
      });
      
      const currentMonthRevenue = await Order.aggregate([
        { 
          $match: { 
            isPaid: true,
            createdAt: { $gte: firstDayOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
      ]);

      const currentMonthUsers = await User.countDocuments({ 
        createdAt: { $gte: firstDayOfMonth }
      });

      // محاسبه محصولات کم‌موجود
      const lowStockProducts = await Product.countDocuments({
        $expr: { $lte: ['$stock', '$lowStockAlert'] },
        stock: { $gt: 0 }
      });

      // محاسبه محصولات ناموجود
      const outOfStockProducts = await Product.countDocuments({ stock: 0 });

      return {
        totalStats: {
          totalOrders,
          totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
          totalUsers,
          totalProducts
        },
        currentMonthStats: {
          orders: currentMonthOrders,
          revenue: currentMonthRevenue.length > 0 ? currentMonthRevenue[0].total : 0,
          newUsers: currentMonthUsers
        },
        inventoryStats: {
          lowStockProducts,
          outOfStockProducts
        }
      };
    } catch (error) {
      throw new Error(`خطا در دریافت خلاصه داشبورد: ${error.message}`);
    }
  }
}

module.exports = new AnalyticsService(); 