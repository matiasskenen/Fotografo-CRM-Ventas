// src/routes/auth.js - VERSIÓN LOCAL SIN BASE DE DATOS
const express = require('express');
const router = express.Router();

// ========================================
// USUARIOS HARDCODEADOS PARA DESARROLLO LOCAL
// ========================================
const MOCK_USERS = {
    'admin@test.com': {
        id: 'photographer-1',
        email: 'admin@test.com',
        password: 'admin123', // En producción NUNCA hacer esto
        auth_user_id: 'auth-user-1',
        business_name: 'Fotografía Test',
        display_name: 'Admin Demo',
        slug: 'admin-demo',
        plan_type: 'pro',
        subscription_status: 'active',
        role: 'photographer',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
    },
    'foto@test.com': {
        id: 'photographer-2',
        email: 'foto@test.com',
        password: '12345678',
        auth_user_id: 'auth-user-2',
        business_name: 'Estudio Fotográfico',
        display_name: 'Fotógrafo Pro',
        slug: 'fotografo-pro',
        plan_type: 'pro',
        subscription_status: 'active',
        role: 'photographer',
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
    }
};

// Token simple para desarrollo local (NO usar en producción)
function generateMockToken(user) {
    const payload = {
        userId: user.auth_user_id,
        email: user.email,
        photographerId: user.id,
        timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyMockToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        return payload;
    } catch {
        return null;
    }
}

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// POST /auth/register - Registro (simulado)
router.post('/register', async (req, res) => {
    try {
        const { email, password, businessName, displayName, phone } = req.body;

        if (!email || !password || !businessName || !displayName) {
            return res.status(400).json({ 
                error: 'Email, contraseña, nombre del negocio y nombre para mostrar son requeridos' 
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'La contraseña debe tener al menos 8 caracteres' 
            });
        }

        // Verificar si el usuario ya existe
        if (MOCK_USERS[email.toLowerCase()]) {
            return res.status(400).json({ 
                error: 'El email ya está registrado' 
            });
        }

        // Simular creación de usuario
        const newUser = {
            id: `photographer-${Date.now()}`,
            email: email.toLowerCase(),
            password: password,
            auth_user_id: `auth-user-${Date.now()}`,
            business_name: businessName,
            display_name: displayName,
            slug: displayName.toLowerCase().replace(/\s+/g, '-'),
            plan_type: 'pro',
            subscription_status: 'trial',
            role: 'photographer',
            phone: phone || null,
            created_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        };

        MOCK_USERS[email.toLowerCase()] = newUser;

        console.log('✅ Usuario registrado (LOCAL):', email);

        res.status(201).json({
            message: 'Registro exitoso. Tienes 14 días de prueba gratis.',
            photographer: {
                id: newUser.id,
                email: newUser.email,
                businessName: newUser.business_name,
                displayName: newUser.display_name,
                slug: newUser.slug,
                planType: newUser.plan_type,
                subscriptionStatus: newUser.subscription_status,
                trialEndsAt: newUser.trial_ends_at
            }
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

// POST /auth/login - Login (hardcodeado)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('🔐 Intento de login:', email);

        // Si no se proporciona email o password, usar valores por defecto
        const loginEmail = (email || 'admin@test.com').toLowerCase();
        const loginPassword = password || 'admin123';

        // Buscar usuario
        const user = MOCK_USERS[loginEmail];

        if (!user) {
            console.log('❌ Usuario no encontrado:', loginEmail);
            return res.status(401).json({ 
                error: 'Credenciales inválidas',
                hint: 'Usuarios disponibles: admin@test.com (admin123), foto@test.com (12345678)'
            });
        }

        // Verificar password
        if (user.password !== loginPassword) {
            console.log('❌ Password incorrecta');
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Actualizar last login
        user.last_login_at = new Date().toISOString();

        // Generar token
        const token = generateMockToken(user);

        console.log('✅ Login exitoso:', loginEmail);

        res.json({
            message: 'Login exitoso',
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            user: {
                id: user.auth_user_id,
                email: user.email,
                role: user.role
            },
            photographer: {
                id: user.id,
                email: user.email,
                businessName: user.business_name,
                displayName: user.display_name,
                slug: user.slug,
                planType: user.plan_type,
                subscriptionStatus: user.subscription_status,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            },
            session: {
                access_token: token,
                token_type: 'bearer',
                expires_in: 3600,
                user: {
                    id: user.auth_user_id,
                    email: user.email
                }
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout exitoso' });
});

// GET /auth/me - Obtener perfil actual
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Token requerido' 
            });
        }

        const token = authHeader.substring(7);
        const payload = verifyMockToken(token);

        if (!payload) {
            return res.status(401).json({ 
                error: 'Token inválido' 
            });
        }

        // Buscar usuario por email
        const user = Object.values(MOCK_USERS).find(u => u.email === payload.email);

        if (!user) {
            return res.status(404).json({ 
                error: 'Usuario no encontrado' 
            });
        }

        res.json({
            user: {
                id: user.auth_user_id,
                email: user.email,
                role: user.role
            },
            photographer: {
                id: user.id,
                email: user.email,
                businessName: user.business_name,
                displayName: user.display_name,
                slug: user.slug,
                planType: user.plan_type,
                subscriptionStatus: user.subscription_status
            }
        });

    } catch (error) {
        console.error('Error en /me:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

module.exports = router;
module.exports.MOCK_USERS = MOCK_USERS;
module.exports.verifyMockToken = verifyMockToken;
