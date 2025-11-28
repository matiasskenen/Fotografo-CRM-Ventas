// monitoringController.js - Controlador de monitoreo y métricas
const logger = require("../utils/logger");
const { metrics, getMetrics } = require("../utils/metrics");
const { supabaseAdmin } = require("../config");

/**
 * Formatea el uptime en formato legible
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

/**
 * GET /api/monitoring/logs - Obtener logs del sistema
 */
function getLogs(req, res) {
    const { level, limit = 100 } = req.query;
    const logBuffer = logger.getLogBuffer();

    let logs = [...logBuffer];

    // Filtrar por nivel si se especifica
    if (level && level.toUpperCase() !== "ALL") {
        logs = logs.filter((log) => log.level === level.toUpperCase());
    }

    // Limitar cantidad
    logs = logs.slice(-parseInt(limit));

    res.json({
        total: logs.length,
        logs: logs.reverse(), // Más recientes primero
    });
}

/**
 * DELETE /api/monitoring/logs - Limpiar logs
 */
function clearLogs(req, res) {
    const logBuffer = logger.getLogBuffer();
    const count = logBuffer.length;
    logBuffer.length = 0;
    
    logger.info("Logs limpiados manualmente", { count });
    
    res.json({ message: `${count} logs eliminados` });
}

/**
 * POST /api/monitoring/log-level - Configurar nivel de log
 */
function setLogLevel(req, res) {
    const { level } = req.body;
    const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

    if (!LOG_LEVELS[level?.toUpperCase()]) {
        return res.status(400).json({ 
            error: "Nivel inválido. Usa: DEBUG, INFO, WARN, ERROR" 
        });
    }

    logger.setLogLevel(level.toUpperCase());
    logger.info(`Nivel de log cambiado a ${level.toUpperCase()}`);

    res.json({ level: level.toUpperCase() });
}

/**
 * POST /api/monitoring/console-logging - Habilitar/deshabilitar logs en consola
 */
function setConsoleLogging(req, res) {
    const { enabled } = req.body;
    
    logger.setConsoleLogging(enabled);
    logger.info(`Console logging ${enabled ? "habilitado" : "deshabilitado"}`);
    
    res.json({ consoleLoggingEnabled: enabled });
}

/**
 * GET /api/monitoring/metrics - Obtener métricas del sistema
 */
function getSystemMetrics(req, res) {
    const currentMetrics = getMetrics();
    const uptime = Date.now() - currentMetrics.startTime;
    
    const avgResponseTime = currentMetrics.responseTimes.length > 0
        ? currentMetrics.responseTimes.reduce((a, b) => a + b, 0) / currentMetrics.responseTimes.length
        : 0;

    res.json({
        uptime: {
            ms: uptime,
            formatted: formatUptime(uptime),
        },
        requests: currentMetrics.requests,
        errors: currentMetrics.errors,
        photos: currentMetrics.photos,
        albums: currentMetrics.albums,
        orders: currentMetrics.orders,
        performance: {
            avgResponseTime: Math.round(avgResponseTime),
            minResponseTime: currentMetrics.responseTimes.length > 0 
                ? Math.min(...currentMetrics.responseTimes) 
                : 0,
            maxResponseTime: currentMetrics.responseTimes.length > 0 
                ? Math.max(...currentMetrics.responseTimes) 
                : 0,
        },
        system: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
        },
    });
}

/**
 * DELETE /api/monitoring/metrics - Resetear métricas
 */
function resetMetrics(req, res) {
    metrics.requests = { total: 0, byEndpoint: {}, byStatusCode: {} };
    metrics.errors = { total: 0, byType: {} };
    metrics.photos = { uploaded: 0, downloaded: 0 };
    metrics.albums = { created: 0 };
    metrics.orders = { created: 0, paid: 0 };
    metrics.responseTimes = [];

    logger.info("Métricas reseteadas");
    
    res.json({ message: "Métricas reseteadas" });
}

/**
 * GET /api/monitoring/health - Health check del sistema
 */
async function healthCheck(req, res) {
    const checks = {
        server: "ok",
        database: "checking",
        storage: "checking",
    };

    try {
        // Test database
        const { error: dbError } = await supabaseAdmin
            .from("albums")
            .select("id")
            .limit(1);
        checks.database = dbError ? "error" : "ok";

        // Test storage
        const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
        checks.storage = storageError ? "error" : "ok";

        const allOk = Object.values(checks).every((status) => status === "ok");

        res.status(allOk ? 200 : 503).json({
            status: allOk ? "healthy" : "degraded",
            checks,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error("Health check failed", { error: err.message });
        res.status(503).json({
            status: "unhealthy",
            checks,
            error: err.message,
        });
    }
}

module.exports = {
    getLogs,
    clearLogs,
    setLogLevel,
    setConsoleLogging,
    getMetrics: getSystemMetrics,
    resetMetrics,
    healthCheck,
};
