import { verifyToken } from '../routes/auth.js';
export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const user = verifyToken(token);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    req.user = user;
    next();
}
