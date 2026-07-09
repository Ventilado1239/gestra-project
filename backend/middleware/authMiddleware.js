// Middleware de Autenticação e Autorização por Perfil
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'rt5-recovery-secret-key-2026';

function authenticateToken(req, res, next) {
    // Tenta pegar o token do cookie ou do header de autorização
    let token = req.cookies?.token;
    
    const authHeader = req.headers['authorization'];
    if (!token && authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, nome, email, perfil }
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
}

function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Usuário não autenticado.' });
        }
        
        if (!allowedRoles.includes(req.user.perfil)) {
            return res.status(403).json({ 
                message: `Acesso negado. Perfil '${req.user.perfil}' não tem permissão para esta ação.` 
            });
        }
        
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole,
    JWT_SECRET
};
