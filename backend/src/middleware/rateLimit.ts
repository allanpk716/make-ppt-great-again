import rateLimit from 'express-rate-limit';

/**
 * 通用 API 限流器
 * 限制每个 IP 在 15 分钟内最多 100 个请求
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 认证端点限流器
 * 限制登录/注册请求，防止暴力破解
 * 限制每个 IP 在 15 分钟内最多 5 个请求
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5, // 认证端点更严格的限制
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 严格限流器
 * 用于敏感操作，限制每个 IP 在 15 分钟内最多 3 个请求
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 3, // 更严格的限制
  message: {
    error: 'Rate limit exceeded for this operation'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
