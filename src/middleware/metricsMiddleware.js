// metricsMiddleware.js - Middleware para tracking de métricas
const logger = require('../utils/logger');
const { incrementRequest, recordStatusCode, recordResponseTime } = require('../utils/metrics');

/**
 * Middleware para tracking de métricas de requests
 */
function metricsMiddleware(req, res, next) {
    const startTime = Date.now();

    incrementRequest(req.path);

    res.on("finish", () => {
        const duration = Date.now() - startTime;
        recordResponseTime(duration);
        recordStatusCode(res.statusCode);

        logger.debug(`${req.method} ${req.path}`, {
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
}

module.exports = metricsMiddleware;
