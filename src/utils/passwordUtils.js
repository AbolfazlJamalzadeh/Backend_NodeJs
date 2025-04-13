const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const zxcvbn = require('zxcvbn');

/**
 * Password utilities with enhanced security features
 */
class PasswordUtils {
  constructor() {
    this.saltRounds = 12; // Higher is more secure but slower
    this.pepper = process.env.PASSWORD_PEPPER || crypto.randomBytes(32).toString('hex');
    this.minimumScore = 3; // Minimum zxcvbn strength score (0-4)
    
    // Show warning if default pepper is used
    if (!process.env.PASSWORD_PEPPER) {
      console.warn('WARNING: Using auto-generated password pepper. This will change on server restart!');
      console.warn('Set PASSWORD_PEPPER in environment variables for persistent password verification.');
    }
  }
  
  /**
   * Hash a password with bcrypt and add pepper
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hash(password) {
    // Apply pepper before hashing (pepper is a server-side secret)
    const pepperedPassword = this.applyPepper(password);
    
    // Generate salt and hash
    const salt = await bcrypt.genSalt(this.saltRounds);
    const hash = await bcrypt.hash(pepperedPassword, salt);
    
    return hash;
  }
  
  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password to verify
   * @param {string} hash - Stored hash to compare against
   * @returns {Promise<boolean>} - True if password matches
   */
  async verify(password, hash) {
    // Apply pepper before verification
    const pepperedPassword = this.applyPepper(password);
    
    // Compare passwords
    return await bcrypt.compare(pepperedPassword, hash);
  }
  
  /**
   * Check password strength using zxcvbn
   * @param {string} password - Password to check
   * @param {Array<string>} userInputs - User-specific inputs to check against (email, name, etc.)
   * @returns {Object} - Password strength analysis
   */
  checkStrength(password, userInputs = []) {
    const result = zxcvbn(password, userInputs);
    
    return {
      score: result.score, // 0-4 (0 = weak, 4 = strong)
      isStrong: result.score >= this.minimumScore,
      feedback: result.feedback,
      crackTimeSeconds: result.crack_times_seconds.offline_fast_hashing_1e10_per_second,
      warning: result.feedback.warning,
      suggestions: result.feedback.suggestions
    };
  }
  
  /**
   * Validate password meets requirements
   * @param {string} password - Password to validate
   * @param {Array<string>} userInputs - User-specific inputs to check against
   * @returns {Object} - Validation result with success flag and error message
   */
  validatePassword(password, userInputs = []) {
    // Check minimum length
    if (!password || password.length < 8) {
      return { 
        isValid: false, 
        message: 'Password must be at least 8 characters long' 
      };
    }
    
    // Check for common patterns
    if (/^123456|password|qwerty|111111$/i.test(password)) {
      return { 
        isValid: false, 
        message: 'Password is too common or easily guessable' 
      };
    }
    
    // Check for character variety
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    if (!(hasLetter && (hasNumber || hasSpecial))) {
      return { 
        isValid: false, 
        message: 'Password must contain letters and at least one number or special character' 
      };
    }
    
    // Check strength with zxcvbn
    const strength = this.checkStrength(password, userInputs);
    
    if (!strength.isStrong) {
      return { 
        isValid: false, 
        message: strength.warning || 'Password is not strong enough',
        suggestions: strength.suggestions
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Generate a cryptographically secure random password
   * @param {number} length - Password length
   * @param {boolean} includeSpecial - Include special characters
   * @returns {string} - Generated password
   */
  generateStrongPassword(length = 16, includeSpecial = true) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
    
    let chars = lowercase + uppercase + numbers;
    if (includeSpecial) chars += special;
    
    // Ensure minimum requirements are met
    let password = this.getRandomChar(lowercase); // At least one lowercase
    password += this.getRandomChar(uppercase);    // At least one uppercase
    password += this.getRandomChar(numbers);      // At least one number
    
    if (includeSpecial) {
      password += this.getRandomChar(special);    // At least one special
    }
    
    // Fill the rest randomly
    while (password.length < length) {
      password += this.getRandomChar(chars);
    }
    
    // Shuffle the password characters
    return this.shuffleString(password);
  }
  
  /**
   * Apply pepper to password
   * @param {string} password - Password to pepper
   * @returns {string} - Peppered password
   * @private
   */
  applyPepper(password) {
    // Create HMAC using the pepper as a key
    const hmac = crypto.createHmac('sha256', this.pepper);
    hmac.update(password);
    return hmac.digest('hex');
  }
  
  /**
   * Get a random character from a string
   * @param {string} characters - String of characters to choose from
   * @returns {string} - A single random character
   * @private
   */
  getRandomChar(characters) {
    const randomIndex = crypto.randomInt(0, characters.length);
    return characters.charAt(randomIndex);
  }
  
  /**
   * Shuffle a string
   * @param {string} string - String to shuffle
   * @returns {string} - Shuffled string
   * @private
   */
  shuffleString(string) {
    const array = string.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }
}

// Create a singleton instance
const passwordUtils = new PasswordUtils();
module.exports = passwordUtils; 