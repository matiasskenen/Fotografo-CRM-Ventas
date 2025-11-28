// orderController.js - Controlador de órdenes
const { supabaseAdmin } = require("../config");
const logger = require("../utils/logger");
const { incrementOrderCreated } = require("../utils/metrics");

/**
 * GET /order-details/:orderId/:customerEmail - Obtener detalles de una orden
 */
async function getOrderDetails(req, res) {
    const { orderId, customerEmail } = req.params;
    const supabaseUrl = process.env.SUPABASE_URL;

    if (!orderId || !customerEmail) {
        return res.status(400).json({ message: "ID de orden o email del cliente faltantes." });
    }
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(orderId)) {
        return res.status(400).json({ message: "ID de orden no válido." });
    }

    try {
        // Verificar que la orden existe y pertenece al email
        const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("id, customer_email, status, download_expires_at")
            .eq("id", orderId)
            .eq("customer_email", customerEmail.toLowerCase())
            .single();

        if (orderError || !order) {
            console.error(`Error al obtener detalles de orden: Orden ${orderId} no encontrada o email incorrecto.`, orderError?.message);
            return res.status(404).json({ 
                message: "Orden no encontrada o email no coincide.", 
                status: "not_found" 
            });
        }

        // Si la orden no está pagada, devolver estado actual
        if (order.status !== "paid") {
            return res.status(200).json({
                message: `La orden ${orderId} no está pagada aún. Estado actual: ${order.status}`,
                order: {
                    id: order.id,
                    customer_email: order.customer_email,
                    status: order.status,
                },
                photos: [],
            });
        }

        // Obtener items de la orden
        const { data: orderItems, error: orderItemsError } = await supabaseAdmin
            .from("order_items")
            .select("photo_id")
            .eq("order_id", orderId);

        if (orderItemsError) {
            console.error(`Error al obtener ítems de la orden ${orderId}:`, orderItemsError.message);
            return res.status(500).json({ message: "Error al obtener ítems de la orden." });
        }

        const photoIds = orderItems.map((oi) => oi.photo_id);
        if (photoIds.length === 0) {
            return res.status(404).json({ message: "No se encontraron fotos para esta orden." });
        }

        // Obtener detalles de las fotos
        const { data: photos, error: photosError } = await supabaseAdmin
            .from("photos")
            .select("id, watermarked_file_path, student_code, price")
            .in("id", photoIds);

        if (photosError) {
            console.error(`Error al obtener detalles de las fotos para la orden ${orderId}:`, photosError.message);
            return res.status(500).json({ message: "Error al obtener detalles de las fotos." });
        }

        const photosWithPublicUrls = photos.map((photo) => ({
            id: photo.id,
            student_code: photo.student_code,
            price: photo.price,
            watermarked_url: `${supabaseUrl}/storage/v1/object/public/watermarked-photos/${photo.watermarked_file_path}`,
        }));

        res.status(200).json({
            message: `Detalles de la orden ${orderId} obtenidos exitosamente.`,
            order: {
                id: order.id,
                customer_email: order.customer_email,
                status: order.status,
                download_expires_at: order.download_expires_at,
            },
            photos: photosWithPublicUrls,
        });
    } catch (err) {
        console.error("❌ Error inesperado en la ruta /order-details:", err);
        res.status(500).json({ message: "Error interno del servidor al obtener detalles de la orden." });
    }
}

/**
 * GET /orders - Obtener todas las órdenes del fotógrafo
 */
async function getOrders(req, res) {
    try {
        const photographerId = req.photographer.id;
        
        const { data: orders, error } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("photographer_id", photographerId)
            .order("created_at", { ascending: false });
            
        if (error) throw error;
        
        res.json(orders);
    } catch (err) {
        console.error("Error al obtener órdenes:", err);
        res.status(500).json({ message: "Error interno al obtener órdenes" });
    }
}

/**
 * DELETE /orders/all - Eliminar todas las órdenes (dev/testing)
 */
async function deleteAllOrders(req, res) {
    try {
        const photographerId = req.photographer.id;
        
        // Primero eliminar order_items
        const { data: orders } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("photographer_id", photographerId);
            
        const orderIds = orders.map(o => o.id);
        
        if (orderIds.length > 0) {
            await supabaseAdmin
                .from("order_items")
                .delete()
                .in("order_id", orderIds);
                
            const { error } = await supabaseAdmin
                .from("orders")
                .delete()
                .eq("photographer_id", photographerId);
                
            if (error) throw error;
        }
        
        logger.info("Todas las órdenes eliminadas", { photographerId, count: orderIds.length });
        res.json({ 
            message: `${orderIds.length} órdenes eliminadas exitosamente` 
        });
    } catch (err) {
        console.error("Error al eliminar todas las órdenes:", err);
        res.status(500).json({ message: "Error interno al eliminar órdenes" });
    }
}

/**
 * DELETE /orders/:id - Eliminar una orden específica
 */
async function deleteOrder(req, res) {
    const { id } = req.params;
    const photographerId = req.photographer.id;
    
    try {
        // Verificar que la orden pertenece al fotógrafo
        const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("id", id)
            .eq("photographer_id", photographerId)
            .single();
            
        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada o no autorizada" });
        }
        
        // Eliminar order_items primero
        await supabaseAdmin
            .from("order_items")
            .delete()
            .eq("order_id", id);
            
        // Eliminar orden
        const { error } = await supabaseAdmin
            .from("orders")
            .delete()
            .eq("id", id)
            .eq("photographer_id", photographerId);
            
        if (error) throw error;
        
        res.json({ message: "Orden eliminada exitosamente" });
    } catch (err) {
        console.error("Error al eliminar orden:", err);
        res.status(500).json({ message: "Error interno al eliminar orden" });
    }
}

module.exports = {
    getOrderDetails,
    getOrders,
    deleteAllOrders,
    deleteOrder,
};
