// multer.js - Configuración de subida de archivos
const multer = require("multer");

// Configuración de almacenamiento en memoria
const storage = multer.memoryStorage();

// Configuración de Multer con validaciones
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 25 * 1024 * 1024, // Límite de 25MB por archivo
    },
    fileFilter: (req, file, cb) => {
        // Solo permite archivos de imagen
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten archivos de imagen."), false);
        }
    },
});

module.exports = {
    upload,
};
