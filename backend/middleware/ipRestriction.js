/**
 * IP Restriction Middleware
 * 
 * Provides workspace-level IP whitelisting and geo-blocking capabilities.
 * Validates incoming requests against configured IP rules.
 */

const Workspace = require('../models/Workspace');
const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');

/**
 * Check if IP matches whitelist/blacklist patterns
 */
const matchesIPPattern = (ip, pattern) => {
  // Exact match
  if (pattern === ip) return true;
  
  // CIDR notation (e.g., 192.168.1.0/24)
  if (pattern.includes('/')) {
    return matchesCIDR(ip, pattern);
  }
  
  // Wildcard pattern (e.g., 192.168.*.*)
  if (pattern.includes('*')) {
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '\\d+') + '$');
    return regex.test(ip);
  }
  
  // Range pattern (e.g., 192.168.1.1-192.168.1.100)
  if (pattern.includes('-')) {
    return matchesIPRange(ip, pattern);
  }
  
  return false;
};

/**
 * Check if IP matches CIDR notation
 */
const matchesCIDR = (ip, cidr) => {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  
  return (ipNum & mask) === (rangeNum & mask);
};

/**
 * Check if IP is within range
 */
const matchesIPRange = (ip, range) => {
  const [start, end] = range.split('-').map(s => s.trim());
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(start);
  const endNum = ipToNumber(end);
  
  return ipNum >= startNum && ipNum <= endNum;
};

/**
 * Convert IP address to number for comparison
 */
const ipToNumber = (ip) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
const getClientIP = (req) => {
  // Check X-Forwarded-For header (proxies, load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take first IP in comma-separated list
    return forwardedFor.split(',')[0].trim();
  }
  
  // Check X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP.trim();
  }
  
  // Fallback to socket address
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
};

/**
 * Get geographic location from IP
 */
const getIPLocation = (ip) => {
  // Skip localhost/private IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'LOCAL',
      region: 'LOCAL',
      city: 'LOCAL',
      timezone: 'LOCAL',
    };
  }
  
  const geo = geoip.lookup(ip);
  if (!geo) {
    return {
      country: 'UNKNOWN',
      region: 'UNKNOWN',
      city: 'UNKNOWN',
      timezone: 'UNKNOWN',
    };
  }
  
  return {
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    coordinates: geo.ll,
  };
};

/**
 * Main IP restriction middleware
 */
const checkIPRestriction = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    
    // Skip if no workspace specified (public routes)
    if (!workspaceId) {
      return next();
    }
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    // Skip if IP restrictions not configured
    if (!workspace.security.ipRestrictions || !workspace.security.ipRestrictions.enabled) {
      return next();
    }
    
    const clientIP = getClientIP(req);
    const location = getIPLocation(clientIP);
    const restrictions = workspace.security.ipRestrictions;
    
    // Attach IP info to request
    req.clientIP = clientIP;
    req.ipLocation = location;
    
    // Check geo-blocking (country blacklist)
    if (restrictions.blockedCountries && restrictions.blockedCountries.length > 0) {
      if (restrictions.blockedCountries.includes(location.country)) {
        await AuditLog.log({
          workspace: workspaceId,
          user: req.user?.id,
          action: 'ip_restriction_blocked',
          resourceType: 'Workspace',
          metadata: {
            ip: clientIP,
            location,
            reason: 'Country blocked',
          },
          severity: 'warning',
          tags: ['security', 'geo-blocking'],
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your location is not permitted to access this workspace',
          code: 'GEO_BLOCKED',
        });
      }
    }
    
    // Check geo-allowlist (country whitelist)
    if (restrictions.allowedCountries && restrictions.allowedCountries.length > 0) {
      if (!restrictions.allowedCountries.includes(location.country) && location.country !== 'LOCAL') {
        await AuditLog.log({
          workspace: workspaceId,
          user: req.user?.id,
          action: 'ip_restriction_blocked',
          resourceType: 'Workspace',
          metadata: {
            ip: clientIP,
            location,
            reason: 'Country not in allowlist',
          },
          severity: 'warning',
          tags: ['security', 'geo-blocking'],
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your location is not permitted to access this workspace',
          code: 'GEO_NOT_ALLOWED',
        });
      }
    }
    
    // Check IP blacklist
    if (restrictions.blacklist && restrictions.blacklist.length > 0) {
      const isBlacklisted = restrictions.blacklist.some(pattern => 
        matchesIPPattern(clientIP, pattern)
      );
      
      if (isBlacklisted) {
        await AuditLog.log({
          workspace: workspaceId,
          user: req.user?.id,
          action: 'ip_restriction_blocked',
          resourceType: 'Workspace',
          metadata: {
            ip: clientIP,
            location,
            reason: 'IP blacklisted',
          },
          severity: 'warning',
          tags: ['security', 'ip-blocking'],
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is blocked',
          code: 'IP_BLACKLISTED',
        });
      }
    }
    
    // Check IP whitelist (if enforced)
    if (restrictions.whitelist && restrictions.whitelist.length > 0) {
      const isWhitelisted = restrictions.whitelist.some(pattern => 
        matchesIPPattern(clientIP, pattern)
      );
      
      // Allow localhost/private IPs for development
      const isLocal = clientIP === '127.0.0.1' || clientIP === '::1' || 
                      clientIP.startsWith('192.168.') || clientIP.startsWith('10.');
      
      if (!isWhitelisted && !isLocal) {
        await AuditLog.log({
          workspace: workspaceId,
          user: req.user?.id,
          action: 'ip_restriction_blocked',
          resourceType: 'Workspace',
          metadata: {
            ip: clientIP,
            location,
            reason: 'IP not in whitelist',
          },
          severity: 'warning',
          tags: ['security', 'ip-blocking'],
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not authorized to access this workspace',
          code: 'IP_NOT_WHITELISTED',
        });
      }
    }
    
    // Access granted - log successful access
    await AuditLog.log({
      workspace: workspaceId,
      user: req.user?.id,
      action: 'ip_restriction_passed',
      resourceType: 'Workspace',
      metadata: {
        ip: clientIP,
        location,
      },
      severity: 'info',
      tags: ['security', 'ip-validation'],
    });
    
    next();
  } catch (error) {
    console.error('IP restriction check error:', error);
    // Fail open (allow access) on errors to avoid service disruption
    next();
  }
};

/**
 * Middleware to require IP restrictions to be configured
 */
const requireIPRestrictions = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (!workspace.security.ipRestrictions || !workspace.security.ipRestrictions.enabled) {
      return res.status(400).json({
        error: 'IP restrictions not enabled',
        message: 'This workspace does not have IP restrictions configured',
      });
    }
    
    next();
  } catch (error) {
    console.error('IP restriction requirement check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current IP information (for testing/debugging)
 */
const getIPInfo = (req, res) => {
  const clientIP = getClientIP(req);
  const location = getIPLocation(clientIP);
  
  res.json({
    ip: clientIP,
    location,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
    },
  });
};

module.exports = {
  checkIPRestriction,
  requireIPRestrictions,
  getIPInfo,
  getClientIP,
  getIPLocation,
  matchesIPPattern,
};
