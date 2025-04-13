const axios = require('axios');
const ErrorHandler = require('./errorHandler');

class PaymentService {
  constructor() {
    this.merchantId = process.env.ZARINPAL_MERCHANT_ID;
    this.callbackUrl = process.env.ZARINPAL_CALLBACK_URL;
    this.sandbox = process.env.NODE_ENV !== 'production';
    this.baseUrl = this.sandbox 
      ? 'https://sandbox.zarinpal.com/pg/rest/WebGate'
      : 'https://api.zarinpal.com/pg/rest/WebGate';
  }

  // Create payment request
  async createPaymentRequest(amount, description, email, phone, orderId) {
    try {
      const response = await axios.post(`${this.baseUrl}/PaymentRequest.json`, {
        MerchantID: this.merchantId,
        Amount: amount,
        Description: description,
        Email: email,
        Mobile: phone,
        CallbackURL: `${this.callbackUrl}/${orderId}`,
      });

      if (response.data.Status === 100) {
        return {
          success: true,
          authority: response.data.Authority,
          gatewayUrl: this.sandbox
            ? `https://sandbox.zarinpal.com/pg/StartPay/${response.data.Authority}`
            : `https://www.zarinpal.com/pg/StartPay/${response.data.Authority}`,
        };
      } else {
        throw new ErrorHandler(
          `خطا در ایجاد درخواست پرداخت: ${this.getErrorMessage(response.data.Status)}`,
          400
        );
      }
    } catch (error) {
      if (error.response) {
        throw new ErrorHandler(
          `خطا در ایجاد درخواست پرداخت: ${error.response.data.message || 'خطای سرور'}`,
          error.response.status
        );
      } else if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler('خطا در ایجاد درخواست پرداخت', 500);
      }
    }
  }

  // Verify payment
  async verifyPayment(authority, amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/PaymentVerification.json`, {
        MerchantID: this.merchantId,
        Authority: authority,
        Amount: amount,
      });

      if (response.data.Status === 100 || response.data.Status === 101) {
        return {
          success: true,
          refId: response.data.RefID,
          status: response.data.Status,
        };
      } else {
        throw new ErrorHandler(
          `خطا در تایید پرداخت: ${this.getErrorMessage(response.data.Status)}`,
          400
        );
      }
    } catch (error) {
      if (error.response) {
        throw new ErrorHandler(
          `خطا در تایید پرداخت: ${error.response.data.message || 'خطای سرور'}`,
          error.response.status
        );
      } else if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler('خطا در تایید پرداخت', 500);
      }
    }
  }

  // Get transaction details
  async getUnverifiedTransactions() {
    try {
      const response = await axios.post(`${this.baseUrl}/UnverifiedTransactions.json`, {
        MerchantID: this.merchantId,
      });

      if (response.data.Status === 100) {
        return {
          success: true,
          transactions: response.data.Authorities,
        };
      } else {
        throw new ErrorHandler(
          `خطا در دریافت تراکنش‌های تایید نشده: ${this.getErrorMessage(response.data.Status)}`,
          400
        );
      }
    } catch (error) {
      if (error.response) {
        throw new ErrorHandler(
          `خطا در دریافت تراکنش‌های تایید نشده: ${error.response.data.message || 'خطای سرور'}`,
          error.response.status
        );
      } else if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler('خطا در دریافت تراکنش‌های تایید نشده', 500);
      }
    }
  }

  // Process refund
  async refundPayment(authority, amount) {
    try {
      const response = await axios.post(`${this.baseUrl}/RefundPayment.json`, {
        MerchantID: this.merchantId,
        Authority: authority,
        Amount: amount,
      });

      if (response.data.Status === 100) {
        return {
          success: true,
          refId: response.data.RefID,
        };
      } else {
        throw new ErrorHandler(
          `خطا در استرداد وجه: ${this.getErrorMessage(response.data.Status)}`,
          400
        );
      }
    } catch (error) {
      if (error.response) {
        throw new ErrorHandler(
          `خطا در استرداد وجه: ${error.response.data.message || 'خطای سرور'}`,
          error.response.status
        );
      } else if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler('خطا در استرداد وجه', 500);
      }
    }
  }

  // Get ZarinPal error message from status code
  getErrorMessage(statusCode) {
    const errorMessages = {
      '-1': 'اطلاعات ارسال شده ناقص است',
      '-2': 'IP و یا مرچنت کد پذیرنده صحیح نیست',
      '-3': 'با توجه به محدودیت‌های شاپرک امکان پرداخت با رقم درخواست شده میسر نمی‌باشد',
      '-4': 'سطح تایید پذیرنده پایین‌تر از سطح نقره‌ای است',
      '-11': 'درخواست مورد نظر یافت نشد',
      '-12': 'امکان ویرایش درخواست میسر نمی‌باشد',
      '-21': 'هیچ نوع عملیات مالی برای این تراکنش یافت نشد',
      '-22': 'تراکنش ناموفق می‌باشد',
      '-33': 'رقم تراکنش با رقم پرداخت شده مطابقت ندارد',
      '-34': 'سقف تقسیم تراکنش از لحاظ تعداد یا رقم عبور نموده است',
      '-40': 'اجازه دسترسی به متد مربوطه وجود ندارد',
      '-41': 'اطلاعات ارسال شده مربوط به AdditionalData غیرمعتبر می‌باشد',
      '-42': 'مدت زمان معتبر طول عمر شناسه پرداخت باید بین 30 دقیقه تا 45 روز می‌باشد',
      '-54': 'درخواست مورد نظر آرشیو شده است',
      '101': 'عملیات پرداخت موفق بوده و قبلا PaymentVerification تراکنش انجام شده است',
    };

    return errorMessages[statusCode] || 'خطای ناشناخته';
  }
}

module.exports = new PaymentService(); 