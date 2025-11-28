// logger.js - Sistema de logging centralizado
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};

let currentLogLevel = process.env.LOG_LEVEL || "INFO";
let consoleLoggingEnabled = true;

// Buffer circular para logs (últimos 1000)
const MAX_LOGS = 1000;
const logBuffer = [];

/**
 * Sanitiza metadata para evitar loggear información sensible
 * @param {Object} metadata - Metadata a sanitizar
 * @returns {Object} Metadata sanitizada
 */
function sanitizeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") return metadata;

    const sanitized = { ...metadata };
    const sensitiveKeys = ["password", "token", "authorization", "secret", "key", "access_token"];

    for (const key in sanitized) {
        if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = "***REDACTED***";
        }
    }

    return sanitized;
}

/**
 * Logger centralizado con múltiples niveles
 */
const logger = {
    _log: (level, message, metadata = {}) => {
        if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel.toUpperCase()]) {
            return; // No loggear si el nivel es menor al configurado
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            metadata: sanitizeMetadata(metadata),
        };

        // Agregar al buffer (circular)
        logBuffer.push(logEntry);
        if (logBuffer.length > MAX_LOGS) {
            logBuffer.shift();
        }

        // Log a consola si está habilitado
        if (consoleLoggingEnabled) {
            const emoji = { DEBUG: "🔍", INFO: "ℹ️", WARN: "⚠️", ERROR: "❌" }[level] || "";
            // Comentado para reducir ruido en consola
            // console.log(`${emoji} [${timestamp}] [${level}] ${message}`, metadata && Object.keys(metadata).length > 0 ? metadata : "");
        }
    },
    
    debug: (msg, meta) => logger._log("DEBUG", msg, meta),
    info: (msg, meta) => logger._log("INFO", msg, meta),
    warn: (msg, meta) => logger._log("WARN", msg, meta),
    error: (msg, meta) => logger._log("ERROR", msg, meta),
    
    // Getters y setters para acceder a configuración
    getLogBuffer: () => logBuffer,
    setLogLevel: (level) => { 
        currentLogLevel = level; 
    },
    setConsoleLogging: (enabled) => { 
        consoleLoggingEnabled = enabled; 
    },
    getCurrentLogLevel: () => currentLogLevel,
    isConsoleLoggingEnabled: () => consoleLoggingEnabled,
};

module.exports = logger;
