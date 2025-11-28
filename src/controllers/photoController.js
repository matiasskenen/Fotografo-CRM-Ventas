// photoController.js - Controlador de fotos
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { supabaseAdmin, ORIGINAL_BUCKET_NAME, WATERMARKED_BUCKET_NAME } = require("../config");
const logger = require("../utils/logger");
const { incrementPhotoUploaded, incrementPhotoDownloaded } = require("../utils/metrics");

/**
 * GET /albums/:albumId/photos - Obtener fotos de un álbum
 */
async function getAlbumPhotos(req, res) {
    const albumId = req.params.albumId;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!albumId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(albumId)) {
        return res.status(400).json({ message: "ID de álbum no válido." });
    }

    try {
        const { data: photos, error } = await supabaseAdmin
            .from("photos")
            .select("id, watermarked_file_path, student_code, price, metadata")
            .eq("album_id", albumId);

        if (error) {
            console.error("Error al obtener fotos del álbum:", error.message);
            return res.status(500).json({ message: `Error al obtener fotos: ${error.message}` });
        }

        if (!photos || photos.length === 0) {
            return res.status(404).json({ message: "No se encontraron fotos para este álbum." });
        }

        const photosWithPublicUrls = photos.map((photo) => ({
            ...photo,
            public_watermarked_url: `${supabaseUrl}/storage/v1/object/public/watermarked-photos/${photo.watermarked_file_path}`,
        }));

        logger.info("Fotos obtenidas para galería", { albumId, count: photos.length });

        res.status(200).json({
            message: `Fotos obtenidas exitosamente para el álbum ${albumId}.`,
            photos: photosWithPublicUrls,
        });
    } catch (err) {
        console.error("Error inesperado al obtener fotos:", err);
        res.status(500).json({ message: "Error inesperado del servidor" });
    }
}

/**
 * POST /upload-photos/:albumId - Subir fotos a un álbum
 */
async function uploadPhotos(req, res) {
    const albumId = req.params.albumId;
    const photographerId = req.photographer.id;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!albumId || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(albumId)) {
        return res.status(400).json({ message: "ID de álbum no válido." });
    }

    let albumPrice;

    try {
        // Obtener álbum y verificar que pertenece al fotógrafo
        const { data: album, error: albumError } = await supabaseAdmin
            .from("albums")
            .select("id, photographer_id, price_per_photo")
            .eq("id", albumId)
            .eq("photographer_id", photographerId)
            .single();

        if (albumError || !album) {
            console.error("Error al verificar álbum:", albumError ? albumError.message : "Álbum no encontrado.");
            return res.status(404).json({ message: "Álbum no encontrado o no autorizado para este fotógrafo." });
        }

        albumPrice = album.price_per_photo || req.photographer.default_price_per_photo || 1500.0;
        logger.info("Subida de fotos iniciada", { albumId, albumPrice, photographerId });
    } catch (dbError) {
        console.error("Error de base de datos al verificar álbum:", dbError);
        return res.status(500).json({ message: "Error interno del servidor al verificar el álbum." });
    }

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No se subieron archivos." });
    }

    const watermarkedPhotosPath = path.resolve(__dirname, "..", "..", "assets", "watermark.png");
    
    if (!fs.existsSync(watermarkedPhotosPath)) {
        console.error(`Error: Archivo de marca de agua no encontrado en ${watermarkedPhotosPath}`);
        return res.status(500).json({ message: "Error interno: Archivo de marca de agua no encontrado." });
    }

    const results = [];

    for (const file of req.files) {
        try {
            const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${path.extname(file.originalname)}`;
            const originalFilePath = `albums/${albumId}/original/${uniqueFileName}`;
            const watermarkedFilePath = `albums/${albumId}/watermarked/${uniqueFileName}`;

            // Subir imagen original
            const { error: uploadOriginalError } = await supabaseAdmin.storage
                .from(ORIGINAL_BUCKET_NAME)
                .upload(originalFilePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (uploadOriginalError) {
                console.error(`Error al subir la imagen original "${file.originalname}":`, uploadOriginalError.message);
                throw new Error(`Fallo al subir original: ${uploadOriginalError.message}`);
            }

            // Redimensionar la marca de agua
            const watermarkBuffer = await sharp(watermarkedPhotosPath)
                .resize({ width: 200 })
                .toBuffer();

            // Aplicar marca de agua
            const watermarkedBuffer = await sharp(file.buffer)
                .composite([
                    {
                        input: watermarkBuffer,
                        gravity: "center",
                    },
                ])
                .toFormat("jpeg", { quality: 80 })
                .toBuffer();

            // Subir imagen con marca de agua
            const { error: uploadWatermarkedError } = await supabaseAdmin.storage
                .from(WATERMARKED_BUCKET_NAME)
                .upload(watermarkedFilePath, watermarkedBuffer, {
                    contentType: "image/jpeg",
                    upsert: false,
                });

            if (uploadWatermarkedError) {
                console.error(`Error al subir la imagen con marca de agua "${file.originalname}":`, uploadWatermarkedError.message);
                throw new Error(`Fallo al subir marcada de agua: ${uploadWatermarkedError.message}`);
            }

            const publicWatermarkedUrl = `${supabaseUrl}/storage/v1/object/public/watermarked-photos/${watermarkedFilePath}`;

            // Insertar registro en base de datos
            const { data: photoDbData, error: dbInsertError } = await supabaseAdmin
                .from("photos")
                .insert([
                    {
                        album_id: albumId,
                        original_file_path: originalFilePath,
                        watermarked_file_path: watermarkedFilePath,
                        student_code: null,
                        price: albumPrice,
                        metadata: {
                            originalName: file.originalname,
                            mimetype: file.mimetype,
                            size: file.size,
                        },
                    },
                ])
                .select()
                .single();

            if (dbInsertError) {
                console.error(`Error al insertar en la BD para "${file.originalname}":`, dbInsertError.message);
                throw new Error(`Fallo al guardar en la BD: ${dbInsertError.message}`);
            }

            incrementPhotoUploaded();

            results.push({
                originalName: file.originalname,
                status: "success",
                photoId: photoDbData.id,
                publicWatermarkedUrl: publicWatermarkedUrl,
            });
        } catch (error) {
            console.error(`Error procesando o subiendo "${file.originalname}":`, error.message);
            results.push({
                originalName: file.originalname,
                status: "failed",
                error: error.message,
            });
        }
    }

    res.status(200).json({
        message: "Proceso de subida de fotos completado.",
        summary:
            results.length > 0
                ? `${results.filter((r) => r.status === "success").length} fotos subidas con éxito, ${results.filter((r) => r.status === "failed").length} fallidas.`
                : "No se procesaron fotos.",
        results: results,
    });
}

/**
 * DELETE /photos/:id - Eliminar una foto
 */
async function deletePhoto(req, res) {
    const { id } = req.params;
    const photographerId = req.photographer.id;
    
    try {
        // Verificar que la foto pertenece a un álbum del fotógrafo
        const { data: photo } = await supabaseAdmin
            .from("photos")
            .select("id, album_id, albums!inner(photographer_id)")
            .eq("id", id)
            .single();
        
        if (!photo || photo.albums.photographer_id !== photographerId) {
            return res.status(404).json({ message: "Foto no encontrada o no autorizada" });
        }
        
        const { error } = await supabaseAdmin.from("photos").delete().eq("id", id);
        if (error) throw error;
        
        res.json({ message: "Foto eliminada" });
    } catch (err) {
        console.error("Error al eliminar foto:", err);
        res.status(500).json({ message: "Error interno al eliminar foto" });
    }
}

/**
 * GET /download-photo/:photoId/:orderId/:customerEmail - Descargar foto sin marca de agua
 */
async function downloadPhoto(req, res) {
    const { photoId, orderId, customerEmail } = req.params;
    const MAX_DESCARGAS = 3;

    try {
        // Verificar orden
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("id, customer_email, status")
            .eq("id", orderId)
            .eq("customer_email", customerEmail)
            .single();

        if (orderError || !orderData) {
            return res.status(404).json({ message: "Pedido no encontrado o email no coincide." });
        }

        if (orderData.status !== "paid") {
            return res.status(403).json({ message: "El pedido aún no está pagado." });
        }

        // Verificar que la foto está en el pedido
        const { data: orderItems, error: itemsError } = await supabaseAdmin
            .from("order_items")
            .select("photo_id")
            .eq("order_id", orderId)
            .eq("photo_id", photoId);

        if (itemsError || !orderItems || orderItems.length === 0) {
            return res.status(404).json({ message: "Esta foto no está en tu pedido." });
        }

        // Obtener información de la foto
        const { data: photoData, error: photoError } = await supabaseAdmin
            .from("photos")
            .select("id, original_file_path, metadata")
            .eq("id", photoId)
            .single();

        if (photoError || !photoData) {
            return res.status(404).json({ message: "Foto no encontrada." });
        }

        // Verificar límite de descargas
        const { data: downloadRecord, error: downloadRecordError } = await supabaseAdmin
            .from("photo_downloads")
            .select("download_count")
            .eq("order_id", orderId)
            .eq("photo_id", photoId)
            .maybeSingle();

        if (downloadRecordError) {
            console.error("Error al verificar descargas:", downloadRecordError);
            return res.status(500).json({ message: "Error al verificar descargas" });
        }

        const currentDownloads = downloadRecord?.download_count || 0;

        if (currentDownloads >= MAX_DESCARGAS) {
            return res.status(403).json({
                message: `Has alcanzado el límite de ${MAX_DESCARGAS} descargas para esta foto.`,
            });
        }

        // Descargar archivo original desde Supabase
        const { data: fileData, error: storageError } = await supabaseAdmin.storage
            .from(ORIGINAL_BUCKET_NAME)
            .download(photoData.original_file_path);

        if (storageError || !fileData) {
            console.error("Error al descargar del storage:", storageError);
            return res.status(500).json({ message: "Error al descargar la foto original." });
        }

        // Incrementar contador de descargas
        if (downloadRecord) {
            await supabaseAdmin
                .from("photo_downloads")
                .update({ download_count: currentDownloads + 1 })
                .eq("order_id", orderId)
                .eq("photo_id", photoId);
        } else {
            await supabaseAdmin
                .from("photo_downloads")
                .insert({ order_id: orderId, photo_id: photoId, download_count: 1 });
        }

        incrementPhotoDownloaded();

        // Enviar archivo
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const originalName = photoData.metadata?.originalName || `photo-${photoId}.jpg`;

        res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`);
        res.setHeader("Content-Type", "image/jpeg");
        res.send(buffer);

    } catch (err) {
        console.error("Error al descargar foto:", err);
        res.status(500).json({ message: "Error interno al descargar la foto" });
    }
}

module.exports = {
    getAlbumPhotos,
    uploadPhotos,
    deletePhoto,
    downloadPhoto,
};
