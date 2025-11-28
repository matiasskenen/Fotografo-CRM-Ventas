// monitoring.routes.js - Rutas de monitoreo y métricas
const express = require("express");
const router = express.Router();
const monitoringController = require("../controllers/monitoringController");
const { 
    validate, 
    setLogLevelSchema, 
    setConsoleLoggingSchema, 
    getLogsSchema 
} = require("../middleware/validation");

// GET /monitoring/logs - Obtener logs del sistema
router.get("/logs", validate(getLogsSchema), monitoringController.getLogs);

// DELETE /monitoring/logs - Limpiar logs
router.delete("/logs", monitoringController.clearLogs);

// POST /monitoring/log-level - Configurar nivel de log
router.post("/log-level", validate(setLogLevelSchema), monitoringController.setLogLevel);

// POST /monitoring/console-logging - Habilitar/deshabilitar logs en consola
router.post("/console-logging", validate(setConsoleLoggingSchema), monitoringController.setConsoleLogging);

// GET /monitoring/metrics - Obtener métricas del sistema
router.get("/metrics", monitoringController.getMetrics);

// DELETE /monitoring/metrics - Resetear métricas
router.delete("/metrics", monitoringController.resetMetrics);

// GET /monitoring/health - Health check del sistema
router.get("/health", monitoringController.healthCheck);

module.exports = router;
