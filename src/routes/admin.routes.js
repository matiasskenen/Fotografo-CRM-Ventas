// admin.routes.js - Rutas de administración y testing
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAuth } = require("../middleware/auth");
const { 
    validate, 
    createTestAlbumSchema, 
    simulateErrorSchema, 
    slowEndpointSchema 
} = require("../middleware/validation");

// GET /admin/stats - Obtener estadísticas del fotógrafo
router.get("/stats", requireAuth, adminController.getStats);

// POST /admin/testing/create-test-album - Crear álbum de prueba
router.post("/testing/create-test-album", validate(createTestAlbumSchema), adminController.createTestAlbum);

// DELETE /admin/testing/cleanup - Limpiar datos de prueba
router.delete("/testing/cleanup", adminController.cleanupTestData);

// GET /admin/testing/simulate-error - Simular error
router.get("/testing/simulate-error", validate(simulateErrorSchema), adminController.simulateError);

// GET /admin/testing/slow-endpoint - Endpoint lento para testing
router.get("/testing/slow-endpoint", validate(slowEndpointSchema), adminController.slowEndpoint);

module.exports = router;
