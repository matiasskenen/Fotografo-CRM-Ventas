// adminController.js - Controlador de administración y estadísticas
const { supabaseAdmin } = require("../config");
const logger = require("../utils/logger");

/**
 * GET /admin/stats - Obtener estadísticas del fotógrafo
 */
async function getStats(req, res) {
    try {
        const photographerId = req.photographer.id;

        // Obtener conteos filtrados por photographer_id
        const [
            { count: totalAlbums },
            albumsWithPhotos,
            { count: totalOrders },
            ordersData
        ] = await Promise.all([
            supabaseAdmin
                .from("albums")
                .select("*", { count: "exact", head: true })
                .eq("photographer_id", photographerId),
            supabaseAdmin
                .from("albums")
                .select("id")
                .eq("photographer_id", photographerId),
            supabaseAdmin
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("photographer_id", photographerId),
            supabaseAdmin
                .from("orders")
                .select("total_amount, status")
                .eq("photographer_id", photographerId),
        ]);

        // Contar fotos de todos los álbumes del fotógrafo
        const albumIds = albumsWithPhotos.data?.map((a) => a.id) || [];
        let totalPhotos = 0;
        
        if (albumIds.length > 0) {
            const { count } = await supabaseAdmin
                .from("photos")
                .select("*", { count: "exact", head: true })
                .in("album_id", albumIds);
            totalPhotos = count ?? 0;
        }

        // Calcular ventas totales (solo pedidos pagados)
        const totalSales = ordersData.data
            ?.filter((order) => order.status === "paid")
            .reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        res.json({
            totalAlbums: totalAlbums ?? 0,
            totalPhotos,
            totalOrders: totalOrders ?? 0,
            totalSales: totalSales.toFixed(2),
            photographer: {
                business_name: req.photographer.business_name,
                plan_type: req.photographer.plan_type,
                subscription_status: req.photographer.subscription_status,
            },
        });
    } catch (err) {
        console.error("Error al obtener estadísticas:", err);
        logger.error("Error al obtener estadísticas", { error: err.message });
        res.status(500).json({ message: "Error interno al obtener estadísticas" });
    }
}

/**
 * POST /api/testing/create-test-album - Crear álbum de prueba
 */
async function createTestAlbum(req, res) {
    try {
        const testAlbum = {
            name: `Test Album ${Date.now()}`,
            event_date: new Date().toISOString().split("T")[0],
            description: "Álbum de prueba generado automáticamente",
            price_per_photo: 1500,
            photographer_id: req.photographer?.id || "test-photographer-id",
        };

        const { data, error } = await supabaseAdmin
            .from("albums")
            .insert(testAlbum)
            .select()
            .single();

        if (error) throw error;

        logger.info("Álbum de prueba creado", { albumId: data.id });
        res.json({ message: "Álbum de prueba creado", album: data });
    } catch (err) {
        console.error("Error al crear álbum de prueba:", err);
        res.status(500).json({ message: "Error al crear álbum de prueba" });
    }
}

/**
 * DELETE /api/testing/cleanup-test-data - Limpiar datos de prueba
 */
async function cleanupTestData(req, res) {
    try {
        const photographerId = req.photographer?.id;

        // Eliminar álbumes de test
        const { data: testAlbums } = await supabaseAdmin
            .from("albums")
            .select("id")
            .eq("photographer_id", photographerId)
            .ilike("name", "%Test Album%");

        const testAlbumIds = testAlbums?.map((a) => a.id) || [];

        if (testAlbumIds.length > 0) {
            // Eliminar fotos de test
            await supabaseAdmin
                .from("photos")
                .delete()
                .in("album_id", testAlbumIds);

            // Eliminar álbumes de test
            await supabaseAdmin
                .from("albums")
                .delete()
                .in("id", testAlbumIds);
        }

        logger.info("Datos de prueba limpiados", { count: testAlbumIds.length });
        res.json({ 
            message: `${testAlbumIds.length} álbumes de prueba eliminados` 
        });
    } catch (err) {
        console.error("Error al limpiar datos de prueba:", err);
        res.status(500).json({ message: "Error al limpiar datos" });
    }
}

/**
 * GET /api/testing/simulate-error - Simular un error para testing
 */
function simulateError(req, res) {
    const { type = "generic" } = req.query;

    logger.warn("Error simulado solicitado", { type });

    switch (type) {
        case "500":
            throw new Error("Error 500 simulado");
        case "timeout":
            // Simular timeout
            setTimeout(() => {
                res.status(408).json({ error: "Request timeout simulado" });
            }, 5000);
            break;
        case "validation":
            res.status(400).json({ error: "Error de validación simulado" });
            break;
        default:
            res.status(500).json({ error: "Error genérico simulado" });
    }
}

/**
 * GET /api/testing/slow-endpoint - Endpoint lento para testing de performance
 */
async function slowEndpoint(req, res) {
    const { delay = 3000 } = req.query;
    
    logger.info("Endpoint lento ejecutado", { delay });
    
    await new Promise((resolve) => setTimeout(resolve, parseInt(delay)));
    
    res.json({ 
        message: "Respuesta retrasada", 
        delay: parseInt(delay) 
    });
}

module.exports = {
    getStats,
    createTestAlbum,
    cleanupTestData,
    simulateError,
    slowEndpoint,
};
