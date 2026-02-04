/**
 * Middleware de autenticación para endpoints protegidos
 * Versión LOCAL sin base de datos
 */

const { verifyMockToken, MOCK_USERS } = require('../routes/auth');

/**
 * Middleware para verificar autenticación (versión local)
 */
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "No autorizado",
                message: "Token de autenticación requerido",
            });
        }

        const token = authHeader.substring(7);
        const payload = verifyMockToken(token);

        if (!payload) {
            return res.status(401).json({
                error: "Token inválido",
                message: "El token de autenticación no es válido o ha expirado",
            });
        }

        // Buscar usuario
        const user = Object.values(MOCK_USERS).find(u => u.email === payload.email);

        if (!user) {
            return res.status(403).json({
                error: "Usuario no encontrado",
                message: "No se encontró un perfil para este usuario",
            });
        }

        // Agregar al request
        req.user = {
            id: user.auth_user_id,
            email: user.email,
            role: user.role
        };
        
        req.photographer = user;

        next();

    } catch (error) {
        console.error("Error en middleware de autenticación:", error);
        return res.status(500).json({
            error: "Error de autenticación",
            message: "Ocurrió un error al verificar la autenticación",
        });
    }
}

/**
 * Middleware opcional - permite acceso sin auth
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.substring(7);
        const payload = verifyMockToken(token);

        if (payload) {
            const user = Object.values(MOCK_USERS).find(u => u.email === payload.email);
            if (user) {
                req.user = {
                    id: user.auth_user_id,
                    email: user.email,
                    role: user.role
                };
                req.photographer = user;
            }
        }

        next();
    } catch (error) {
        next();
    }
}

module.exports = {
    requireAuth,
    optionalAuth,
};
