const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');
const Product = require('../models/product.model');
const Category = require('../models/category.model');

class HolooService {
  constructor() {
    this.baseUrl = config.holoo.apiUrl || '';
    this.token = null;
    this.tokenExpireTime = null;
    this.enabled = config.holoo.active || false;
    this.syncInterval = config.holoo.syncInterval || 60 * 60 * 1000; // Default: 1 hour
    this.credentials = {
      username: config.holoo.username || '',
      userpass: config.holoo.password || '',
      dbname: config.holoo.dbname || ''
    };
    
    // توکن به مدت 30 دقیقه معتبر است (با کمی حاشیه امنیت)
    this.tokenLifespan = 25 * 60 * 1000; // 25 دقیقه به میلی‌ثانیه
  }

  /**
   * ورود به سیستم هلو و دریافت توکن
   * @returns {Promise<string>} توکن دسترسی
   */
  async login() {
    if (!this.enabled) {
      logger.info('Holoo integration is disabled, simulating login');
      this.token = 'mock-token';
      this.tokenExpireTime = Date.now() + this.tokenLifespan;
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/Login`, {
        userinfo: {
          username: this.credentials.username,
          userpass: this.credentials.userpass,
          dbname: this.credentials.dbname
        }
      });

      if (response.data && response.data.State && response.data.Token) {
        this.token = response.data.Token;
        this.tokenExpireTime = Date.now() + this.tokenLifespan;
        logger.info('Successfully logged in to Holoo');
        return this.token;
      } else {
        throw new Error(response.data?.Error || 'خطا در ورود به سیستم هلو');
      }
    } catch (error) {
      logger.error('Failed to login to Holoo', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`خطا در ورود به سیستم هلو: ${error.message}`);
    }
  }

  /**
   * بررسی اعتبار توکن و لاگین مجدد در صورت نیاز
   * @returns {Promise<string>} توکن معتبر
   */
  async ensureAuthenticated() {
    // اگر توکن وجود ندارد یا منقضی شده است، لاگین مجدد انجام می‌شود
    if (!this.token || !this.tokenExpireTime || Date.now() >= this.tokenExpireTime) {
      return await this.login();
    }
    return this.token;
  }

  /**
   * اجرای درخواست با مدیریت خودکار توکن
   * @param {string} method متد HTTP
   * @param {string} endpoint نقطه پایانی API
   * @param {Object} data داده‌های ارسالی
   * @returns {Promise<Object>} پاسخ درخواست
   */
  async makeRequest(method, endpoint, data = null) {
    if (!this.enabled) {
      logger.info(`Holoo integration is disabled, simulating ${method} request to ${endpoint}`);
      return { success: true, data: [] };
    }

    try {
      // اطمینان از معتبر بودن توکن
      const token = await this.ensureAuthenticated();
      
      const config = {
        method,
        url: `${this.baseUrl}/${endpoint}`,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json'
        }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // اگر خطای 401 دریافت شد، لاگین مجدد و تلاش دوباره
      if (error.response && error.response.status === 401) {
        logger.warn('Token expired, trying to login again');
        this.token = null;
        await this.login();
        
        // تلاش مجدد پس از لاگین
        return this.makeRequest(method, endpoint, data);
      }
      
      logger.error(`Failed to make ${method} request to ${endpoint}`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * دریافت لیست کالاها از هلو
   * @param {number} page شماره صفحه
   * @param {number} limit تعداد آیتم‌ها در هر صفحه
   * @returns {Promise<Array>} لیست کالاها
   */
  async getProducts(page = 1, limit = 50) {
    try {
      const response = await this.makeRequest('get', `Product/${page}/${limit}`);
      return response;
    } catch (error) {
      logger.error('Failed to fetch products from Holoo', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`خطا در دریافت لیست کالاها از هلو: ${error.message}`);
    }
  }

  /**
   * دریافت گروه‌های اصلی کالا از هلو
   * @returns {Promise<Array>} لیست گروه‌های اصلی
   */
  async getMainGroups() {
    try {
      const response = await this.makeRequest('get', 'MainGroup');
      return response;
    } catch (error) {
      logger.error('Failed to fetch main groups from Holoo', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`خطا در دریافت گروه‌های اصلی از هلو: ${error.message}`);
    }
  }

  /**
   * دریافت گروه‌های فرعی کالا از هلو
   * @returns {Promise<Array>} لیست گروه‌های فرعی
   */
  async getSideGroups() {
    try {
      const response = await this.makeRequest('get', 'SideGroup');
      return response;
    } catch (error) {
      logger.error('Failed to fetch side groups from Holoo', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`خطا در دریافت گروه‌های فرعی از هلو: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی گروه‌های کالا از هلو به سایت
   * @returns {Promise<Object>} نتیجه همگام‌سازی
   */
  async syncCategories() {
    try {
      // دریافت گروه‌های اصلی و فرعی از هلو
      const mainGroupsData = await this.getMainGroups();
      const sideGroupsData = await this.getSideGroups();
      
      const mainGroups = mainGroupsData.maingroup || [];
      const sideGroups = sideGroupsData.sidegroup || [];
      
      // همگام‌سازی گروه‌های اصلی
      for (const group of mainGroups) {
        await Category.findOneAndUpdate(
          { holooErpCode: group.ErpCode },
          { 
            name: group.Name,
            holooErpCode: group.ErpCode,
            isMainCategory: true,
            syncedFromHoloo: true,
            lastHolooSync: new Date()
          },
          { upsert: true, new: true }
        );
      }
      
      // همگام‌سازی گروه‌های فرعی
      for (const group of sideGroups) {
        // یافتن دسته‌بندی والد
        const parentCategory = await Category.findOne({ 
          holooErpCode: group.MainErpCode 
        });
        
        if (parentCategory) {
          await Category.findOneAndUpdate(
            { holooErpCode: group.ErpCode },
            { 
              name: group.Name,
              holooErpCode: group.ErpCode,
              isMainCategory: false,
              parent: parentCategory._id,
              syncedFromHoloo: true,
              lastHolooSync: new Date()
            },
            { upsert: true, new: true }
          );
        }
      }
      
      logger.info('Categories synchronized from Holoo');
      
      return {
        success: true,
        mainGroupsCount: mainGroups.length,
        sideGroupsCount: sideGroups.length
      };
    } catch (error) {
      logger.error('Failed to sync categories from Holoo', {
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`خطا در همگام‌سازی دسته‌بندی‌ها از هلو: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی محصولات از هلو به سایت
   * @param {Object} options گزینه‌های همگام‌سازی
   * @returns {Promise<Object>} نتیجه همگام‌سازی
   */
  async syncProducts(options = {}) {
    const { page = 1, limit = 100, updateAll = false } = options;
    
    try {
      // دریافت محصولات از هلو
      const productsData = await this.getProducts(page, limit);
      const products = productsData.product || [];
      
      let created = 0;
      let updated = 0;
      let skipped = 0;
      
      // ابتدا دسته‌بندی‌ها را همگام‌سازی کنید
      await this.syncCategories();
      
      // پردازش هر محصول
      for (const holooProduct of products) {
        try {
          // یافتن دسته‌بندی متناظر
          let category = null;
          
          if (holooProduct.SideGroupErpCode) {
            category = await Category.findOne({ holooErpCode: holooProduct.SideGroupErpCode });
          }
          
          if (!category && holooProduct.MainGroupErpCode) {
            category = await Category.findOne({ holooErpCode: holooProduct.MainGroupErpCode });
          }
          
          // اگر دسته‌بندی پیدا نشد، از دسته‌بندی پیش‌فرض استفاده کنید
          if (!category) {
            category = await Category.findOne({ name: 'متفرقه' });
            
            // ایجاد دسته‌بندی پیش‌فرض اگر وجود ندارد
            if (!category) {
              category = await Category.create({
                name: 'متفرقه',
                slug: 'miscellaneous',
                isMainCategory: true
              });
            }
          }
          
          // تبدیل داده‌های هلو به فرمت مورد نیاز سایت
          const productData = {
            name: holooProduct.Name,
            description: `محصول ${holooProduct.Name} از هلو همگام‌سازی شده است.`,
            price: holooProduct.SellPrice || 0,
            comparePrice: holooProduct.SellPrice2 || 0,
            category: category._id,
            stock: holooProduct.Few || 0,
            holooErpCode: holooProduct.ErpCode,
            holooCode: holooProduct.Code,
            specifications: [
              { title: 'کد محصول', value: holooProduct.Code },
              { title: 'واحد', value: holooProduct.unitTitle || 'عدد' }
            ],
            isActive: true,
            syncedFromHoloo: true,
            lastHolooSync: new Date(),
            holooSyncDetails: {
              unitTitle: holooProduct.unitTitle,
              mainGroupErpCode: holooProduct.MainGroupErpCode,
              sideGroupErpCode: holooProduct.SideGroupErpCode
            }
          };
          
          // افزودن قیمت‌های بیشتر به مشخصات
          if (holooProduct.SellPrice3) {
            productData.specifications.push({ title: 'قیمت ۳', value: holooProduct.SellPrice3.toString() });
          }
          
          if (holooProduct.SellPrice4) {
            productData.specifications.push({ title: 'قیمت ۴', value: holooProduct.SellPrice4.toString() });
          }
          
          if (holooProduct.SellPrice5) {
            productData.specifications.push({ title: 'قیمت ۵', value: holooProduct.SellPrice5.toString() });
          }
          
          // جستجوی محصول موجود با کد ErpCode هلو
          const existingProduct = await Product.findOne({ holooErpCode: holooProduct.ErpCode });
          
          if (existingProduct) {
            // بروزرسانی فقط در صورتی که updateAll فعال باشد یا تغییری وجود داشته باشد
            const stockChanged = existingProduct.stock !== productData.stock;
            const priceChanged = existingProduct.price !== productData.price;
            
            if (updateAll || stockChanged || priceChanged) {
              // فقط فیلدهای مورد نظر را بروزرسانی کنید (نه همه فیلدها)
              existingProduct.stock = productData.stock;
              existingProduct.price = productData.price;
              existingProduct.comparePrice = productData.comparePrice;
              existingProduct.lastHolooSync = new Date();
              
              await existingProduct.save();
              updated++;
              
              logger.info(`Updated product from Holoo: ${holooProduct.Name}`);
            } else {
              skipped++;
            }
          } else {
            // ایجاد محصول جدید
            await Product.create(productData);
            created++;
            
            logger.info(`Created new product from Holoo: ${holooProduct.Name}`);
          }
        } catch (productError) {
          logger.error(`Error processing Holoo product ${holooProduct.Name}`, {
            productErpCode: holooProduct.ErpCode,
            error: productError.message
          });
          skipped++;
        }
      }
      
      return {
        success: true,
        total: products.length,
        created,
        updated,
        skipped
      };
    } catch (error) {
      logger.error('Failed to sync products from Holoo', {
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`خطا در همگام‌سازی محصولات از هلو: ${error.message}`);
    }
  }

  /**
   * به‌روزرسانی موجودی کالا در هلو
   * @param {string} productId شناسه محصول در سایت
   * @param {number} quantity مقدار تغییر موجودی
   * @param {string} operation نوع عملیات (increase یا decrease)
   * @returns {Promise<Object>} نتیجه به‌روزرسانی
   */
  async updateInventory(productId, quantity, operation = 'decrease') {
    try {
      // دریافت محصول از پایگاه داده
      const product = await Product.findById(productId);
      
      if (!product || !product.holooErpCode) {
        throw new Error('محصول یافت نشد یا با هلو همگام‌سازی نشده است');
      }
      
      // فقط موجودی را در هلو به‌روزرسانی می‌کنیم
      // بقیه اطلاعات محصول در هلو تغییر نمی‌کند
      const requestData = {
        ErpCode: product.holooErpCode,
        Few: quantity
      };
      
      const response = await this.makeRequest('put', 'Product', requestData);
      
      if (response && response.ErpCode) {
        logger.info(`Updated inventory in Holoo for product ${product.name}`, {
          productId,
          quantity,
          operation
        });
        
        return {
          success: true,
          message: `موجودی محصول ${product.name} در هلو به‌روز شد`
        };
      } else {
        throw new Error(response?.ErrorMessage || 'خطا در به‌روزرسانی موجودی در هلو');
      }
    } catch (error) {
      logger.error(`Failed to update inventory in Holoo for product ${productId}`, {
        productId,
        quantity,
        operation,
        error: error.message,
        stack: error.stack
      });
      
      throw new Error(`خطا در به‌روزرسانی موجودی در هلو: ${error.message}`);
    }
  }

  /**
   * ایجاد فاکتور در هلو
   * @param {Object} order - سفارش 
   * @returns {Promise} - نتیجه درخواست
   */
  async createInvoice(order) {
    try {
      // اطمینان از وجود شماره فاکتور
      if (!order.invoice || !order.invoice.invoiceNumber) {
        if (typeof order.generateInvoiceNumber === 'function') {
          await order.generateInvoiceNumber();
          await order.save();
        } else {
          throw new Error('فاکتور برای سفارش وجود ندارد');
        }
      }

      // آماده‌سازی داده‌های فاکتور
      const invoiceData = this._prepareInvoiceData(order);

      // ارسال درخواست به API هلو
      const response = await this.makeRequest('post', 'Invoice', invoiceData);

      if (response && response.ErpCode) {
        logger.info(`Invoice created in Holoo for order ${order._id}`, {
          orderId: order._id,
          holoInvoiceId: response.ErpCode
        });

        // بروزرسانی اطلاعات همگام‌سازی در سفارش
        order.syncedWithHoloo = true;
        order.holooSyncDetails = {
          syncedAt: new Date(),
          invoiceId: response.ErpCode,
          status: 'success'
        };
        await order.save();

        return {
          success: true,
          holoInvoiceId: response.ErpCode,
          message: 'فاکتور با موفقیت در هلو ثبت شد'
        };
      } else {
        throw new Error(response?.Error || 'خطا در ایجاد فاکتور در هلو');
      }
    } catch (error) {
      logger.error(`Failed to create invoice in Holoo for order ${order._id}`, {
        orderId: order._id,
        error: error.message,
        stack: error.stack
      });

      // بروزرسانی اطلاعات همگام‌سازی در سفارش
      if (order) {
        order.holooSyncDetails = {
          syncedAt: new Date(),
          status: 'failed',
          errorMessage: error.message
        };
        await order.save();
      }

      throw new Error(`خطا در ارسال فاکتور به هلو: ${error.message}`);
    }
  }

  /**
   * آماده‌سازی داده‌های فاکتور برای ارسال به هلو
   * @param {Object} order - سفارش
   * @returns {Object} - داده‌های آماده برای ارسال
   */
  _prepareInvoiceData(order) {
    // آماده‌سازی آیتم‌ها
    const items = order.items.map((item, index) => ({
      Row: index + 1,
      ProductCode: item.product.holooCode || '',
      ProductName: item.name,
      ProductErpCode: item.product.holooErpCode || '',
      Few: item.quantity,
      Karton: 0,
      Price: item.price,
      comment: '',
      SumPrice: item.price * item.quantity,
      Levy: 0,
      Scot: 0,
      PersentDiscount: 0,
      Discount: 0
    }));

    // آماده‌سازی داده‌های فاکتور
    return {
      Type: 2, // فاکتور فروش
      CustomerName: order.shippingAddress?.fullName || 'مشتری',
      Date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      Time: new Date().toTimeString().split(' ')[0],
      SumNaghd: order.isPaid ? order.totalPrice : 0,
      SumCard: 0,
      SumNesiyeh: order.isPaid ? 0 : order.totalPrice,
      SumDiscount: order.discount || 0,
      SumCheck: 0,
      SumLevy: 0,
      SumScot: 0,
      SumPrice: order.totalPrice,
      TypeName: 'فروش',
      Detail: items
    };
  }

  /**
   * شروع فرآیند همگام‌سازی دوره‌ای با هلو
   */
  startPeriodicSync() {
    if (!this.enabled) {
      logger.info('Holoo integration is disabled, not starting periodic sync');
      return;
    }

    logger.info(`Starting periodic sync with Holoo every ${this.syncInterval / (60 * 1000)} minutes`);
    
    // تنظیم همگام‌سازی دوره‌ای
    this.syncIntervalId = setInterval(async () => {
      try {
        logger.info('Starting scheduled sync with Holoo');
        
        // همگام‌سازی دسته‌بندی‌ها و محصولات
        await this.syncCategories();
        await this.syncProducts({ updateAll: true });
        
        logger.info('Completed scheduled sync with Holoo');
      } catch (error) {
        logger.error('Error during scheduled Holoo sync', {
          error: error.message,
          stack: error.stack
        });
      }
    }, this.syncInterval);
  }

  /**
   * توقف فرآیند همگام‌سازی دوره‌ای
   */
  stopPeriodicSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      logger.info('Stopped periodic sync with Holoo');
    }
  }
}

module.exports = HolooService; 