const securityLogger = require('../services/securityLogger.service');
const ErrorHandler = require('../utils/errorHandler');

/**
 * IP Blocker Middleware
 * Blocks requests from blacklisted IPs and detects suspicious patterns
 */
module.exports = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Check if IP is blacklisted
  if (securityLogger.isBlacklisted(clientIP)) {
    // Log the blocked attempt
    securityLogger.logSecurityEvent('warn', 'Request blocked from blacklisted IP', {
      ip: clientIP,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'] || 'Unknown'
    });
    
    // Return 403 Forbidden
    return next(new ErrorHandler('Access denied', 403));
  }
  
  // Check for known attack patterns in requests
  const url = req.originalUrl || req.url;
  const userAgent = req.headers['user-agent'] || '';
  
  // Array of suspicious patterns to check for
  const suspiciousPatterns = [
    // SQL injection attempts
    /'.*;--/i, /'.*OR 1=1/i, /UNION\s+SELECT/i, /SLEEP\([0-9]+\)/i,
    // Common exploits and scanning tools
    /\.\.\//g, /\\x[0-9a-f]{2}/i, /etc\/passwd/i, /wp-admin/i,
    // Common vulnerability scanners
    /acunetix/i, /nessus/i, /nikto/i, /nmap/i, /ZAP/i,
    // Suspicious user agents
    /sqlmap/i, /netsparker/i, /dirbuster/i, /gobuster/i, /masscan/i
  ];
  
  // Check URL and user agent against suspicious patterns
  const isSuspicious = suspiciousPatterns.some(pattern => {
    return pattern.test(url) || pattern.test(userAgent) || 
           (req.body && typeof req.body === 'string' && pattern.test(req.body));
  });
  
  if (isSuspicious) {
    // Log suspicious activity
    securityLogger.logSecurityEvent('warn', 'Suspicious request pattern detected', {
      ip: clientIP,
      method: req.method,
      path: req.path,
      userAgent,
      body: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body
    });
    
    // Track this IP for potential future blacklisting
    securityLogger.trackSuspiciousIP(clientIP, req.user ? req.user.id : 'anonymous');
  }
  
  // Additional checks for request anomalies
  
  // Check for unusual header count (possible scanning)
  if (Object.keys(req.headers).length > 30) {
    securityLogger.logSecurityEvent('warn', 'Unusual header count detected', {
      ip: clientIP,
      headerCount: Object.keys(req.headers).length
    });
  }
  
  // Check for unusual HTTP method
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  if (!validMethods.includes(req.method)) {
    securityLogger.logSecurityEvent('warn', 'Unusual HTTP method detected', {
      ip: clientIP,
      method: req.method
    });
    return next(new ErrorHandler('Method not allowed', 405));
  }
  
  // Continue processing the request if no issues found
  next();
}; 