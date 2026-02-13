const jwt = require('jsonwebtoken');

const JWT_SECRET = 'cok-gizli-anahtarim';

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).send({ error: 'Lütfen kimlik doğrulaması yapın.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Geçersiz token.' });
    }
};

const checkRole = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).send({ error: 'Bu işlemi yapmaya yetkiniz yok.' });
        }
        next();
    };
};

const permissionMiddleware = (permission) => {
    return (req, res, next) => {
        if (!req.user || !req.user.permissions || !req.user.permissions[permission]) {
            return res.status(403).send({ error: 'Bu işlemi yapmaya yetkiniz yok.' });
        }
        next();
    };
};

module.exports = { authMiddleware, checkRole, permissionMiddleware };