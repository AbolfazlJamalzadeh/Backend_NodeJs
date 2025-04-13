const Ghasedak = require('ghasedaksms');
const ErrorHandler = require('./errorHandler');

// Ghasedak SMS Service
class SMSService {
  constructor() {
    this.apiKey = process.env.GHASEDAK_API_KEY;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.mockMode = process.env.MOCK_SMS === 'true' || this.isDevelopment;
    
    if (!this.mockMode) {
      this.ghasedak = new Ghasedak(this.apiKey);
    } else {
      console.log('SMS Service running in mock mode - no real SMS will be sent');
    }
  }

  // Send verification OTP
  async sendOTP(receptor, otp) {
    try {
      // Use mock service in development
      if (this.mockMode) {
        console.log(`[MOCK SMS] Sending OTP ${otp} to ${receptor}`);
        return {
          success: true,
          message: 'OTP sent successfully (mock)',
          data: { result: { code: 200 } }
        };
      }

      const otpSmsCommand = {
        receptors: [{
          mobile: receptor,
          clientReferenceId: `otp_${Date.now()}`
        }],
        templateName: 'otpTemplate',
        inputs: [{
          param: 'Code',
          value: otp
        },
        {
          param: 'StoreName',
          value: 'دنیای نور گلدانی'
        }]
      };

      const response = await this.ghasedak.sendOtpSms(otpSmsCommand);
      
      if (response && response.result && response.result.code === 200) {
        return {
          success: true,
          message: 'OTP sent successfully',
          data: response
        };
      } else {
        throw new ErrorHandler(
          `خطا در ارسال رمز یکبار مصرف: ${response?.result?.message || 'خطای نامشخص'}`,
          500
        );
      }
    } catch (error) {
      if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler(
          `خطا در ارسال رمز یکبار مصرف: ${error.message || 'خطای سرور'}`,
          500
        );
      }
    }
  }

  // Send order confirmation message
  async sendOrderConfirmation(receptor, orderNumber, amount) {
    try {
      // Use mock service in development
      if (this.mockMode) {
        console.log(`[MOCK SMS] Sending order confirmation for order #${orderNumber} (${amount} تومان) to ${receptor}`);
        return {
          success: true,
          message: 'Order confirmation sent successfully (mock)',
          data: { result: { code: 200 } }
        };
      }

      const simpleSmsCommand = {
        message: `سفارش شما با شماره ${orderNumber} به مبلغ ${amount} تومان با موفقیت ثبت شد.`,
        receptor: receptor,
        linenumber: process.env.GHASEDAK_LINE_NUMBER || '3000'
      };

      const response = await this.ghasedak.sendSimpleSms(simpleSmsCommand);
      
      if (response && response.result && response.result.code === 200) {
        return {
          success: true,
          message: 'Order confirmation sent successfully',
          data: response
        };
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک تایید سفارش: ${response?.result?.message || 'خطای نامشخص'}`,
          500
        );
      }
    } catch (error) {
      if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک تایید سفارش: ${error.message || 'خطای سرور'}`,
          500
        );
      }
    }
  }

  // Send shipping notification
  async sendShippingNotification(receptor, orderNumber, trackingCode) {
    try {
      // Use mock service in development
      if (this.mockMode) {
        console.log(`[MOCK SMS] Sending shipping notification for order #${orderNumber} (tracking: ${trackingCode}) to ${receptor}`);
        return {
          success: true,
          message: 'Shipping notification sent successfully (mock)',
          data: { result: { code: 200 } }
        };
      }

      const simpleSmsCommand = {
        message: `سفارش شما با شماره ${orderNumber} ارسال شد. کد رهگیری: ${trackingCode}`,
        receptor: receptor,
        linenumber: process.env.GHASEDAK_LINE_NUMBER || '3000'
      };

      const response = await this.ghasedak.sendSimpleSms(simpleSmsCommand);
      
      if (response && response.result && response.result.code === 200) {
        return {
          success: true,
          message: 'Shipping notification sent successfully',
          data: response
        };
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک اطلاع رسانی ارسال: ${response?.result?.message || 'خطای نامشخص'}`,
          500
        );
      }
    } catch (error) {
      if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک اطلاع رسانی ارسال: ${error.message || 'خطای سرور'}`,
          500
        );
      }
    }
  }

  // Send abandoned cart reminder
  async sendCartReminder(receptor, productName) {
    try {
      // Use mock service in development
      if (this.mockMode) {
        console.log(`[MOCK SMS] Sending cart reminder for product "${productName}" to ${receptor}`);
        return {
          success: true,
          message: 'Cart reminder sent successfully (mock)',
          data: { result: { code: 200 } }
        };
      }

      const simpleSmsCommand = {
        message: `محصول ${productName} هنوز در سبد خرید شما منتظر شماست. خرید خود را تکمیل کنید.`,
        receptor: receptor,
        linenumber: process.env.GHASEDAK_LINE_NUMBER || '3000'
      };

      const response = await this.ghasedak.sendSimpleSms(simpleSmsCommand);
      
      if (response && response.result && response.result.code === 200) {
        return {
          success: true,
          message: 'Cart reminder sent successfully',
          data: response
        };
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک یادآوری سبد خرید: ${response?.result?.message || 'خطای نامشخص'}`,
          500
        );
      }
    } catch (error) {
      if (error.isOperational) {
        throw error;
      } else {
        throw new ErrorHandler(
          `خطا در ارسال پیامک یادآوری سبد خرید: ${error.message || 'خطای سرور'}`,
          500
        );
      }
    }
  }
}

module.exports = new SMSService();