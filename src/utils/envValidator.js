// envValidator.js - Validación de variables de entorno requeridas

/**
 * Variables de entorno requeridas para el funcionamiento del servidor
 */
const REQUIRED_ENV_VARS = {
    // Supabase
    SUPABASE_URL: 'URL de Supabase',
    SUPABASE_ANON_KEY: 'Clave anónima de Supabase',
    SUPABASE_SERVICE_ROLE_KEY: 'Clave de servicio de Supabase',
    
    // MercadoPago
    MERCADOPAGO_ACCESS_TOKEN: 'Token de acceso de MercadoPago',
    MERCADOPAGO_WEBHOOK_SECRET: 'Secreto del webhook de MercadoPago',
    
    // URLs
    FRONTEND_URL: 'URL del frontend',
    BACKEND_URL: 'URL del backend',
    
    // Seguridad
    JWT_SECRET: 'Secreto para JWT',
};

/**
 * Variables opcionales con valores por defecto
 */
const OPTIONAL_ENV_VARS = {
    NODE_ENV: 'development',
    PORT: '3000',
    ALLOWED_ORIGINS: '',
    LOG_LEVEL: 'INFO',
    ENABLE_CONSOLE_LOGGING: 'true',
};

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 * @returns {Object} { valid: boolean, missing: string[], warnings: string[] }
 */
function validateEnvironment() {
    const missing = [];
    const warnings = [];
    
    // Validar variables requeridas
    for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
        if (!process.env[key]) {
            missing.push({ key, description });
        }
    }
    
    // Aplicar valores por defecto a variables opcionales
    for (const [key, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
        if (!process.env[key]) {
            process.env[key] = defaultValue;
            warnings.push(`${key} no definida, usando valor por defecto: ${defaultValue}`);
        }
    }
    
    // Validaciones específicas
    
    // Validar formato de URL
    if (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.startsWith('https://')) {
        warnings.push('SUPABASE_URL debería comenzar con https://');
    }
    
    if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
        warnings.push('FRONTEND_URL debería comenzar con http:// o https://');
    }
    
    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.startsWith('http')) {
        warnings.push('BACKEND_URL debería comenzar con http:// o https://');
    }
    
    // Validar JWT_SECRET tiene longitud mínima
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        warnings.push('JWT_SECRET debería tener al menos 32 caracteres para mayor seguridad');
    }
    
    // Validar NODE_ENV
    const validNodeEnvs = ['development', 'production', 'test'];
    if (process.env.NODE_ENV && !validNodeEnvs.includes(process.env.NODE_ENV)) {
        warnings.push(`NODE_ENV="${process.env.NODE_ENV}" no es válido. Usa: ${validNodeEnvs.join(', ')}`);
    }
    
    // Validar PORT es un número
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
        warnings.push('PORT debe ser un número');
    }
    
    return {
        valid: missing.length === 0,
        missing,
        warnings,
    };
}

/**
 * Imprime el resultado de la validación y termina el proceso si hay errores críticos
 */
function checkEnvironmentOrExit() {
    console.log('\n=== VALIDACIÓN DE VARIABLES DE ENTORNO ===');
    
    const result = validateEnvironment();
    
    // Mostrar warnings
    if (result.warnings.length > 0) {
        console.log('\n⚠️  ADVERTENCIAS:');
        result.warnings.forEach(warning => {
            console.log(`   - ${warning}`);
        });
    }
    
    // Si hay variables faltantes, mostrar y salir
    if (!result.valid) {
        console.log('\n❌ ERRORES CRÍTICOS - Variables de entorno faltantes:\n');
        result.missing.forEach(({ key, description }) => {
            console.log(`   ✗ ${key}`);
            console.log(`     → ${description}`);
        });
        
        console.log('\n💡 Crea un archivo .env con estas variables o configúralas en tu sistema.');
        console.log('   Ejemplo: SUPABASE_URL=https://tu-proyecto.supabase.co\n');
        
        process.exit(1);
    }
    
    // Todo OK
    console.log('\n✅ Todas las variables de entorno requeridas están configuradas');
    console.log(`   Entorno: ${process.env.NODE_ENV}`);
    console.log(`   Puerto: ${process.env.PORT}`);
    console.log('==========================================\n');
    
    return true;
}

/**
 * Obtiene información enmascarada de las variables de entorno (para logging)
 */
function getEnvSummary() {
    const mask = (value) => {
        if (!value) return 'NO DEFINIDA';
        if (value.length <= 8) return '****';
        return value.slice(0, 4) + '****' + value.slice(-4);
    };
    
    return {
        supabase: {
            url: process.env.SUPABASE_URL || 'NO DEFINIDA',
            anonKey: mask(process.env.SUPABASE_ANON_KEY),
            serviceRoleKey: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
        mercadopago: {
            accessToken: mask(process.env.MERCADOPAGO_ACCESS_TOKEN),
            webhookSecret: mask(process.env.MERCADOPAGO_WEBHOOK_SECRET),
        },
        urls: {
            frontend: process.env.FRONTEND_URL || 'NO DEFINIDA',
            backend: process.env.BACKEND_URL || 'NO DEFINIDA',
        },
        jwt: {
            secret: mask(process.env.JWT_SECRET),
        },
        config: {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            logLevel: process.env.LOG_LEVEL,
        }
    };
}

module.exports = {
    validateEnvironment,
    checkEnvironmentOrExit,
    getEnvSummary,
    REQUIRED_ENV_VARS,
    OPTIONAL_ENV_VARS,
};
