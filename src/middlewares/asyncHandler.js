/**
 * میدلور بررسی خطاهای async/await در کنترلرها
 * @param {Function} fn - تابع کنترلر async
 * @returns {Function} میدلور اکسپرس
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler; 