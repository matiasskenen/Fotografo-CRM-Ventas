// albumController.js - Controlador de álbumes
const { supabaseAdmin } = require("../config");
const logger = require("../utils/logger");
const { incrementAlbumCreated } = require("../utils/metrics");

/**
 * GET /albums - Obtener todos los álbumes del fotógrafo autenticado
 */
async function getAlbums(req, res) {
    try {
        const photographerId = req.photographer.id;

        const { data: albums, error } = await supabaseAdmin
            .from("albums")
            .select("id, name, event_date, description, price_per_photo, created_at")
            .eq("photographer_id", photographerId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error("Error al obtener álbumes", { error: error.message, photographerId });
            return res.status(500).json({ message: `Error al obtener álbumes: ${error.message}` });
        }
        
        res.status(200).json({ message: "Álbumes obtenidos exitosamente.", albums });
    } catch (err) {
        console.error("Error inesperado al obtener álbumes:", err);
        res.status(500).json({ message: "Error interno del servidor al obtener álbumes." });
    }
}

/**
 * POST /albums - Crear un nuevo álbum
 */
async function createAlbum(req, res) {
    const { name, event_date, description, price_per_photo } = req.body;
    const photographerId = req.photographer.id;

    if (!name) {
        return res.status(400).json({ message: "El nombre del álbum es requerido." });
    }
    if (!event_date) {
        return res.status(400).json({ message: "La fecha del evento es requerida para el álbum." });
    }

    // Usar precio por defecto del fotógrafo si no se especifica
    const finalPrice = price_per_photo ? Number(price_per_photo) : req.photographer.default_price_per_photo || 1500.0;

    logger.info("Creando nuevo álbum", { name, event_date, price_per_photo: finalPrice, photographerId });

    try {
        const { data: album, error } = await supabaseAdmin
            .from("albums")
            .insert({
                name,
                event_date,
                description: description || null,
                price_per_photo: finalPrice,
                photographer_id: photographerId,
            })
            .select()
            .single();

        if (error) {
            logger.error("Error al crear álbum", { error: error.message });
            return res.status(500).json({ message: `Error al crear álbum: ${error.message}` });
        }

        incrementAlbumCreated();
        res.status(201).json({ message: "Álbum creado exitosamente.", album });
    } catch (err) {
        console.error("Error inesperado al crear álbum:", err);
        res.status(500).json({ message: "Error interno del servidor al crear álbum." });
    }
}

/**
 * GET /albums/:albumId/photos - Obtener fotos de un álbum específico (público)
 */
async function getAlbumPhotos(req, res) {
    const { albumId } = req.params;

    // Validar que albumId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(albumId)) {
        return res.status(400).json({ message: "ID de álbum inválido" });
    }

    try {
        const { data: photos, error } = await supabaseAdmin
            .from("photos")
            .select("id, watermarked_url, original_filename")
            .eq("album_id", albumId);

        if (error) {
            logger.error("Error al obtener fotos del álbum", { error: error.message, albumId });
            return res.status(500).json({ message: "Error al obtener fotos del álbum" });
        }

        res.json({ photos: photos || [] });
    } catch (err) {
        logger.error("Error inesperado al obtener fotos del álbum", { error: err.message, albumId });
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

/**
 * GET /albums-with-photos - Obtener álbumes con sus fotos
 */
async function getAlbumsWithPhotos(req, res) {
    try {
        const photographerId = req.photographer.id;
        const supabaseUrl = process.env.SUPABASE_URL;
        
        const { data: albums, error } = await supabaseAdmin
            .from("albums")
            .select(
                `
        id,
        name,
        event_date,
        description,
        price_per_photo,
        photos!photos_album_id_fkey (
          id,
          watermarked_file_path
        )
      `
            )
            .eq("photographer_id", photographerId)
            .order("event_date", { ascending: false });

        if (error) throw error;

        const albumsWithUrls = albums.map((a) => ({
            ...a,
            photos: a.photos.map((p) => ({
                id: p.id,
                public_watermarked_url: `${supabaseUrl}/storage/v1/object/public/watermarked-photos/${p.watermarked_file_path}`,
            })),
        }));

        res.json(albumsWithUrls);
    } catch (err) {
        console.error("Error al obtener álbumes con fotos:", err);
        res.status(500).json({ message: "Error interno al obtener álbumes" });
    }
}

/**
 * DELETE /albums/:id - Eliminar álbum y sus fotos
 */
async function deleteAlbum(req, res) {
    const { id } = req.params;
    const photographerId = req.photographer.id;
    
    try {
        // Verificar que el álbum pertenece al fotógrafo
        const { data: album } = await supabaseAdmin
            .from("albums")
            .select("id")
            .eq("id", id)
            .eq("photographer_id", photographerId)
            .single();
        
        if (!album) {
            return res.status(404).json({ message: "Álbum no encontrado o no autorizado" });
        }
        
        // Eliminar fotos del álbum
        await supabaseAdmin.from("photos").delete().eq("album_id", id);
        
        // Eliminar álbum
        const { error } = await supabaseAdmin
            .from("albums")
            .delete()
            .eq("id", id)
            .eq("photographer_id", photographerId);
            
        if (error) throw error;
        
        res.json({ message: "Álbum eliminado" });
    } catch (err) {
        console.error("Error al eliminar álbum:", err);
        res.status(500).json({ message: "Error interno al eliminar álbum" });
    }
}

/**
 * PUT /albums/:id - Actualizar álbum
 */
async function updateAlbum(req, res) {
    const { id } = req.params;
    const photographerId = req.photographer?.id;
    const { name, event_date, description, price_per_photo } = req.body;

    try {
        // Verificar que el álbum existe
        const { data: album } = await supabaseAdmin
            .from("albums")
            .select("id")
            .eq("id", id)
            .eq("photographer_id", photographerId)
            .single();
            
        if (!album) {
            return res.status(404).json({ message: "Álbum no encontrado o no autorizado" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (event_date) updates.event_date = event_date;
        if (description !== undefined) updates.description = description;
        if (price_per_photo) updates.price_per_photo = Number(price_per_photo);

        const { data: updatedAlbum, error } = await supabaseAdmin
            .from("albums")
            .update(updates)
            .eq("id", id)
            .eq("photographer_id", photographerId)
            .select()
            .single();

        if (error) throw error;

        res.json({ 
            message: "Álbum actualizado exitosamente", 
            album: updatedAlbum 
        });
    } catch (err) {
        console.error("Error al actualizar álbum:", err);
        res.status(500).json({ message: "Error interno al actualizar álbum" });
    }
}

/**
 * POST /albums/:albumId/verify-access - Verificar código de acceso de álbum
 */
async function verifyAccessCode(req, res) {
    const { albumId } = req.params;
    const { accessCode } = req.body;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(albumId)) {
        return res.status(400).json({ message: "ID de álbum inválido" });
    }

    if (!accessCode) {
        return res.status(400).json({ message: "El código de acceso es requerido" });
    }

    try {
        // Obtener álbum con su código
        const { data: album, error } = await supabaseAdmin
            .from("albums")
            .select("id, name, access_code, requires_access_code, access_code_hint")
            .eq("id", albumId)
            .single();

        if (error || !album) {
            logger.warn("Álbum no encontrado para verificar acceso", { albumId });
            return res.status(404).json({ message: "Álbum no encontrado" });
        }

        // Si no requiere código
        if (!album.requires_access_code) {
            return res.json({ 
                success: true, 
                message: "Este álbum no requiere código de acceso" 
            });
        }

        // Verificar código (case-insensitive)
        const isValid = album.access_code && 
                       accessCode.toUpperCase() === album.access_code.toUpperCase();

        // Log del intento (opcional)
        await supabaseAdmin
            .from("album_access_logs")
            .insert({
                album_id: albumId,
                access_code_entered: accessCode.substring(0, 50),
                was_successful: isValid,
                ip_address: req.ip,
                user_agent: req.get("user-agent")?.substring(0, 500),
            })
            .catch(err => logger.warn("Error al registrar log de acceso", { error: err.message }));

        if (isValid) {
            logger.info("Acceso a álbum verificado", { albumId, album: album.name });
            return res.json({ 
                success: true, 
                message: "Código correcto",
                album: {
                    id: album.id,
                    name: album.name
                }
            });
        } else {
            logger.warn("Código de acceso incorrecto", { albumId });
            return res.status(403).json({ 
                success: false, 
                message: "Código incorrecto",
                hint: album.access_code_hint || null
            });
        }
    } catch (err) {
        logger.error("Error al verificar código de acceso", { error: err.message, albumId });
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

/**
 * GET /albums/:albumId/info - Obtener información básica del álbum (sin fotos)
 */
async function getAlbumInfo(req, res) {
    const { albumId } = req.params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(albumId)) {
        return res.status(400).json({ message: "ID de álbum inválido" });
    }

    try {
        const { data: album, error } = await supabaseAdmin
            .from("albums")
            .select("id, name, event_date, description, requires_access_code, access_code_hint, created_at")
            .eq("id", albumId)
            .single();

        if (error || !album) {
            return res.status(404).json({ message: "Álbum no encontrado" });
        }

        res.json({ 
            album: {
                ...album,
                // No exponer el código de acceso
                access_code: undefined
            }
        });
    } catch (err) {
        logger.error("Error al obtener info del álbum", { error: err.message, albumId });
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

/**
 * PUT /albums/:id/access-code - Configurar o actualizar código de acceso
 */
async function updateAccessCode(req, res) {
    const { id } = req.params;
    const { access_code, requires_access_code, access_code_hint } = req.body;
    const photographerId = req.photographer.id;

    try {
        // Verificar que el álbum pertenece al fotógrafo
        const { data: album, error: fetchError } = await supabaseAdmin
            .from("albums")
            .select("id, photographer_id")
            .eq("id", id)
            .eq("photographer_id", photographerId)
            .single();

        if (fetchError || !album) {
            return res.status(404).json({ message: "Álbum no encontrado" });
        }

        // Construir update
        const updates = {};
        
        if (access_code !== undefined) {
            // Validar formato del código (solo letras y números, 4-20 chars)
            if (access_code && !/^[A-Za-z0-9]{4,20}$/.test(access_code)) {
                return res.status(400).json({ 
                    message: "El código debe tener entre 4 y 20 caracteres alfanuméricos" 
                });
            }
            updates.access_code = access_code ? access_code.toUpperCase() : null;
        }

        if (requires_access_code !== undefined) {
            updates.requires_access_code = Boolean(requires_access_code);
        }

        if (access_code_hint !== undefined) {
            updates.access_code_hint = access_code_hint;
        }

        // Si se desactiva el código, limpiar los campos
        if (requires_access_code === false) {
            updates.access_code = null;
            updates.access_code_hint = null;
        }

        const { data: updatedAlbum, error: updateError } = await supabaseAdmin
            .from("albums")
            .update(updates)
            .eq("id", id)
            .select("id, name, access_code, requires_access_code, access_code_hint")
            .single();

        if (updateError) {
            logger.error("Error al actualizar código de acceso", { error: updateError.message });
            return res.status(500).json({ message: "Error al actualizar código de acceso" });
        }

        logger.info("Código de acceso actualizado", { albumId: id, requires: updatedAlbum.requires_access_code });

        res.json({ 
            message: "Código de acceso actualizado",
            album: updatedAlbum
        });
    } catch (err) {
        logger.error("Error inesperado al actualizar código de acceso", { error: err.message });
        res.status(500).json({ message: "Error interno del servidor" });
    }
}

module.exports = {
    getAlbums,
    createAlbum,
    getAlbumPhotos,
    getAlbumsWithPhotos,
    deleteAlbum,
    updateAlbum,
    verifyAccessCode,
    getAlbumInfo,
    updateAccessCode,
};
