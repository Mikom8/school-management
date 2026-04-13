const NodeCache = require("node-cache");

// default cache for 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Role-based caching: construct a key based on URL, query, and user role
    // We add user.role so admin dashboard cache doesn't serve to teacher, etc.
    const key = `__express__${req.originalUrl || req.url}_${req.user?.role || "public"}`;
    
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log(`🟢 CACHE HIT for key: ${key}`);
      return res.json(JSON.parse(cachedResponse));
    } else {
      console.log(`🔴 CACHE MISS for key: ${key}`);
      
      // Hijack the res.json method to intercept the response
      const originalJson = res.json;
      res.json = (body) => {
        // Only cache successful requests
        if (res.statusCode >= 200 && res.statusCode < 300) {
           cache.set(key, JSON.stringify(body), duration);
        }
        originalJson.call(res, body);
      };
      
      next();
    }
  };
};

module.exports = { cacheMiddleware, cache };
