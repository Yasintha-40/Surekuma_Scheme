// Per-process IP protection supplements persistent per-account limits in users.
// Keep Express trust proxy disabled unless a trusted reverse proxy is configured.
function rateLimit({ limit, windowMs, maxKeys = 10000, now = Date.now }) {
  const buckets = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, bucket] of buckets) if (bucket.until <= time) buckets.delete(key);
    const key = req.ip || req.socket.remoteAddress;
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxKeys) return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      bucket = { count: 0, until: time + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) {
      const retryAfter = Math.ceil((bucket.until - time) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests. Please try again later.', retryAfter });
    }
    next();
  };
}
module.exports = { rateLimit };
