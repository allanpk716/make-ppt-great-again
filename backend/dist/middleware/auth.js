import { TokenManager } from '../services/tokenManager.js';
const tokenManager = new TokenManager(process.env.JWT_SECRET || 'default-secret-change-in-production');
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ error: 'Access token required' });
        return;
    }
    try {
        const user = tokenManager.verifyToken(token);
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
}
export function generateAuthToken(payload) {
    return tokenManager.generateToken(payload);
}
export { TokenManager };
