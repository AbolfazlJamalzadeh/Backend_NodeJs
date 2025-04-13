const axios = require('axios');
const config = require('../config/config');
const logger = require('../config/logger');

class HolooService {
  constructor() {
    this.baseUrl = config.holoo.apiUrl;
    this.apiKey = config.holoo.apiKey;
    this.enabled = config.holoo.enabled;
  }

  /**
   * ایجاد فاکتور در هلو
   * @param {Object} order - سفارش 
   * @returns {Promise} - نتیجه درخواست
   */
  async createInvoice(order) {
    // اگر هلو غیرفعال است، درخواست را شبیه‌سازی کنید
    if (!this.enabled) {
      logger.info(`Holoo integration is disabled, simulating invoice creation for order ${order._id}`);
      return {
        success: true,
        holoInvoiceId: `HOLO-SIM-${order._id.toString().substr(-6)}`,
        message: 'Holoo integration is in simulation mode'
      };
    }

    try {
      // اطمینان از وجود شماره فاکتور
      if (!order.invoice || !order.invoice.invoiceNumber) {
        if (typeof order.generateInvoiceNumber === 'function') {
          await order.generateInvoiceNumber();
        } else {
          throw new Error('فاکتور برای سفارش وجود ندارد');
        }
      }

      // ساختن مشتری هلو اگر از قبل وجود ندارد
      await this.createOrUpdateCustomer(order);

      // آماده‌سازی داده‌های فاکتور
      const invoiceData = this._prepareInvoiceData(order);

      // ارسال درخواست به API هلو
      const response = await axios.post(`${this.baseUrl}/invoices`, invoiceData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        logger.info(`Invoice created in Holoo for order ${order._id}`, {
          orderId: order._id,
          holoInvoiceId: response.data.invoiceId
        });

        return {
          success: true,
          holoInvoiceId: response.data.invoiceId,
          message: response.data.message
        };
      } else {
        throw new Error(response.data?.message || 'خطا در ایجاد فاکتور در هلو');
      }
    } catch (error) {
      logger.error(`Failed to create invoice in Holoo for order ${order._id}`, {
        orderId: order._id,
        error: error.message,
        stack: error.stack
      });

      throw new Error(`خطا در ارسال فاکتور به هلو: ${error.message}`);
    }
  }

  /**
   * ایجاد یا به‌روزرسانی مشتری در هلو
   * @param {Object} order - سفارش 
   * @returns {Promise} - نتیجه درخواست
   */
  async createOrUpdateCustomer(order) {
    try {
      // دریافت اطلاعات کاربر
      const user = await order.populate('user');
      const userData = user.user || {};

      // آماده‌سازی داده‌های مشتری
      const customerData = {
        name: userData.fullName || order.shippingAddress?.fullName || 'مشتری',
        phone: userData.phone || order.shippingAddress?.phone || '',
        email: userData.email || '',
        address: order.shippingAddress?.address || '',
        postalCode: order.shippingAddress?.postalCode || '',
        nationalCode: userData.nationalCode || '',
        economicCode: userData.economicCode || ''
      };

      // ارسال درخواست به API هلو
      const response = await axios.post(`${this.baseUrl}/customers`, customerData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to create/update customer in Holoo for order ${order._id}`, {
        orderId: order._id,
        error: error.message
      });

      // خطا را نادیده بگیرید و به ایجاد فاکتور ادامه دهید
      return null;
    }
  }

  /**
   * آماده‌سازی داده‌های فاکتور برای ارسال به هلو
   * @param {Object} order - سفارش
   * @returns {Object} - داده‌های آماده برای ارسال
   */
  _prepareInvoiceData(order) {
    // محاسبه مالیات
    const taxRate = order.invoice?.taxDetails?.taxRate || 0.09;
    const taxAmount = order.invoice?.taxDetails?.taxAmount || Math.round(order.totalPrice * taxRate / (1 + taxRate));

    // آماده‌سازی آیتم‌ها
    const items = order.items.map(item => ({
      productCode: item.product.toString(), // کد محصول
      productName: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      discount: 0,
      tax: item.tax || Math.round(item.price * item.quantity * taxRate / (1 + taxRate)),
      description: ''
    }));

    // آماده‌سازی داده‌های فاکتور
    return {
      invoiceNumber: order.invoice.invoiceNumber,
      invoiceDate: order.invoice.invoiceDate || order.createdAt,
      customerId: order.user.toString(),
      customerName: order.shippingAddress?.fullName || 'مشتری',
      totalPrice: order.totalPrice,
      discount: order.discount || 0,
      tax: taxAmount,
      description: order.notes || '',
      paymentMethod: order.paymentMethod,
      paidAmount: order.isPaid ? order.totalPrice : 0,
      items: items,
      shippingAddress: {
        address: order.shippingAddress?.address || '',
        postalCode: order.shippingAddress?.postalCode || '',
        phone: order.shippingAddress?.phone || ''
      }
    };
  }

  /**
   * استعلام وضعیت فاکتور در هلو
   * @param {String} invoiceId - شناسه فاکتور در هلو
   * @returns {Promise} - نتیجه درخواست
   */
  async getInvoiceStatus(invoiceId) {
    if (!this.enabled) {
      return {
        success: true,
        status: 'simulated',
        message: 'Holoo integration is in simulation mode'
      };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to get invoice status from Holoo`, {
        invoiceId,
        error: error.message
      });

      throw new Error(`خطا در دریافت وضعیت فاکتور از هلو: ${error.message}`);
    }
  }

  /**
   * همگام‌سازی مجدد فاکتور با هلو
   * @param {Object} order - سفارش
   * @returns {Promise} - نتیجه درخواست
   */
  async resyncInvoice(order) {
    try {
      const result = await this.createInvoice(order);
      
      // بروزرسانی وضعیت همگام‌سازی در سفارش
      if (typeof order.syncWithHoloo === 'function') {
        await order.syncWithHoloo({
          status: 'success',
          invoiceId: result.holoInvoiceId
        });
      }

      return result;
    } catch (error) {
      // بروزرسانی وضعیت همگام‌سازی در سفارش
      if (typeof order.syncWithHoloo === 'function') {
        await order.syncWithHoloo({
          status: 'failed',
          errorMessage: error.message
        });
      }

      throw error;
    }
  }
}

module.exports = HolooService; 