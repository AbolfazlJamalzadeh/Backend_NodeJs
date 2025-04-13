const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { format } = require('date-fns');

class SecurityLoggerService {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.securityLogPath = path.join(this.logDir, 'security.log');
    this.auditLogPath = path.join(this.logDir, 'audit.log');
    this.errorThreshold = 5; // Number of suspicious activities before alert
    this.suspiciousIPs = new Map(); // Track suspicious IPs
    this.blacklistedIPs = new Set(); // Blacklisted IPs
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create write streams
    this.securityStream = createWriteStream(this.securityLogPath, { flags: 'a' });
    this.auditStream = createWriteStream(this.auditLogPath, { flags: 'a' });
    
    // Load blacklisted IPs from file if exists
    this.loadBlacklistedIPs();
    
    // Cleanup suspicious IPs every hour
    setInterval(() => this.cleanupSuspiciousIPs(), 60 * 60 * 1000);
  }
  
  /**
   * Log security event
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  logSecurityEvent(level, message, data = {}) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };
    
    // Write to security log
    this.securityStream.write(`${JSON.stringify(logEntry)}\n`);
    
    // If error, track the IP for potential blacklisting
    if (level === 'error' && data.ip) {
      this.trackSuspiciousIP(data.ip, data.userId || 'anonymous');
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console[level](`SECURITY: ${message}`, data);
    }
  }
  
  /**
   * Log audit event for sensitive operations
   * @param {string} action - Action performed
   * @param {string} userId - User ID
   * @param {Object} details - Action details
   * @param {string} ip - User's IP address
   */
  logAuditEvent(action, userId, details = {}, ip) {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const logEntry = {
      timestamp,
      action,
      userId,
      ip,
      details
    };
    
    // Write to audit log
    this.auditStream.write(`${JSON.stringify(logEntry)}\n`);
  }
  
  /**
   * Track suspicious IP and potentially blacklist it
   * @param {string} ip - IP address
   * @param {string} userId - User ID associated with the request
   */
  trackSuspiciousIP(ip, userId) {
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, {
        count: 1,
        lastActivity: Date.now(),
        users: new Set([userId])
      });
    } else {
      const data = this.suspiciousIPs.get(ip);
      data.count += 1;
      data.lastActivity = Date.now();
      data.users.add(userId);
      
      // Check if this IP should be blacklisted
      if (data.count >= this.errorThreshold) {
        this.blacklistIP(ip, data);
      }
    }
  }
  
  /**
   * Blacklist an IP address
   * @param {string} ip - IP address to blacklist
   * @param {Object} data - Data about the suspicious activity
   */
  blacklistIP(ip, data) {
    if (!this.blacklistedIPs.has(ip)) {
      this.blacklistedIPs.add(ip);
      
      // Log blacklisting event
      this.logSecurityEvent('error', `IP blacklisted due to suspicious activity`, {
        ip,
        suspiciousCount: data.count,
        users: Array.from(data.users),
        blacklistedAt: new Date().toISOString()
      });
      
      // Save updated blacklist
      this.saveBlacklistedIPs();
    }
  }
  
  /**
   * Check if an IP is blacklisted
   * @param {string} ip - IP address to check
   * @returns {boolean} - True if blacklisted
   */
  isBlacklisted(ip) {
    return this.blacklistedIPs.has(ip);
  }
  
  /**
   * Clean up old suspicious IP entries
   */
  cleanupSuspiciousIPs() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    this.suspiciousIPs.forEach((data, ip) => {
      if (now - data.lastActivity > oneHour) {
        this.suspiciousIPs.delete(ip);
      }
    });
  }
  
  /**
   * Save blacklisted IPs to file
   */
  saveBlacklistedIPs() {
    const blacklistPath = path.join(this.logDir, 'blacklisted_ips.json');
    fs.writeFileSync(
      blacklistPath,
      JSON.stringify(Array.from(this.blacklistedIPs)),
      'utf8'
    );
  }
  
  /**
   * Load blacklisted IPs from file
   */
  loadBlacklistedIPs() {
    const blacklistPath = path.join(this.logDir, 'blacklisted_ips.json');
    try {
      if (fs.existsSync(blacklistPath)) {
        const ips = JSON.parse(fs.readFileSync(blacklistPath, 'utf8'));
        this.blacklistedIPs = new Set(ips);
      }
    } catch (error) {
      console.error('Error loading blacklisted IPs:', error);
    }
  }
}

module.exports = new SecurityLoggerService(); 