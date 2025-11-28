// albums.routes.js - Rutas de gestión de álbumes
const express = require("express");
const router = express.Router();
const albumController = require("../controllers/albumController");
const { requireAuth } = require("../middleware/auth");
const { 
    validate, 
    createAlbumSchema, 
    updateAlbumSchema, 
    albumIdSchema,
    verifyAccessCodeSchema,
    updateAccessCodeSchema
} = require("../middleware/validation");

// Crear rate limiter específico para creación
const rateLimit = require("express-rate-limit");
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20,
    message: "Límite de creación alcanzado.",
});

// GET /albums - Obtener todos los álbumes del fotógrafo
router.get("/", requireAuth, albumController.getAlbums);

// POST /albums - Crear nuevo álbum
router.post("/", requireAuth, createLimiter, validate(createAlbumSchema), albumController.createAlbum);

// GET /albums/:albumId/info - Obtener info básica del álbum (público)
router.get("/:albumId/info", validate(albumIdSchema), albumController.getAlbumInfo);

// POST /albums/:albumId/verify-access - Verificar código de acceso (público)
router.post("/:albumId/verify-access", validate(verifyAccessCodeSchema), albumController.verifyAccessCode);

// GET /albums/:albumId/photos - Obtener fotos de un álbum (público)
router.get("/:albumId/photos", validate(albumIdSchema), albumController.getAlbumPhotos);

// GET /albums-with-photos - Obtener álbumes con sus fotos
router.get("/with-photos", requireAuth, albumController.getAlbumsWithPhotos);

// PUT /albums/:id - Actualizar álbum
router.put("/:id", requireAuth, validate(updateAlbumSchema), albumController.updateAlbum);

// PUT /albums/:id/access-code - Configurar código de acceso
router.put("/:id/access-code", requireAuth, validate(updateAccessCodeSchema), albumController.updateAccessCode);

// DELETE /albums/:id - Eliminar álbum
router.delete("/:id", requireAuth, albumController.deleteAlbum);

module.exports = router;
