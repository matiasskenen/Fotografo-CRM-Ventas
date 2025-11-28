// photos.routes.js - Rutas de gestión de fotos
const express = require("express");
const router = express.Router();
const photoController = require("../controllers/photoController");
const { requireAuth } = require("../middleware/auth");
const { upload } = require("../config");
const { 
    validate, 
    uploadPhotosSchema, 
    downloadPhotoSchema 
} = require("../middleware/validation");

// POST /photos/upload/:albumId - Subir fotos a un álbum
router.post("/upload/:albumId", requireAuth, validate(uploadPhotosSchema), upload.array("photos"), photoController.uploadPhotos);

// GET /photos/download/:photoId/:orderId/:customerEmail - Descargar foto original
router.get("/download/:photoId/:orderId/:customerEmail", validate(downloadPhotoSchema), photoController.downloadPhoto);

// DELETE /photos/:id - Eliminar foto
router.delete("/:id", requireAuth, photoController.deletePhoto);

module.exports = router;
