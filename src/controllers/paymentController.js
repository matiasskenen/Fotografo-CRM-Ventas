// paymentController.js - Controlador de pagos y preferencias de Mercado Pago
const { supabaseAdmin } = require("../config");
const { preference } = require("../config").mercadopago;
const logger = require("../utils/logger");
const { incrementOrderCreated } = require("../utils/metrics");

/**
 * POST /create-payment-preference - Crear preferencia de pago en Mercado Pago
 * POST /payments/create-payment-preference - Alias para compatibilidad
 */
async function createPaymentPreference(req, res) {
    const { cart, customerEmail } = req.body;
    
    if (!cart?.length || !customerEmail) {
        return res.status(400).json({ message: "El carrito está vacío o falta el email." });
    }

    let totalAmount = 0;
    for (const item of cart) {
        totalAmount += Number(item.price) * Number(item.quantity || 1);
    }

    try {
        // Obtener photographer_id desde la primera foto del carrito
        const firstPhotoId = cart[0].photoId;
        const { data: photoData } = await supabaseAdmin
            .from("photos")
            .select("album_id, albums!inner(photographer_id)")
            .eq("id", firstPhotoId)
            .single();

        if (!photoData) {
            return res.status(404).json({ message: "Foto no encontrada" });
        }

        const photographerId = photoData.albums.photographer_id;

        // Crear orden con photographer_id
        const { data: orderData, error: orderErr } = await supabaseAdmin
            .from("orders")
            .insert({
                customer_email: customerEmail,
                total_amount: totalAmount,
                status: "pending",
                photographer_id: photographerId,
            })
            .select()
            .single();
            
        if (orderErr) {
            return res.status(500).json({ message: `Error al crear pedido: ${orderErr.message}` });
        }

        // Insertar order_items
        const items = cart.map((i) => ({
            order_id: orderData.id,
            photo_id: i.photoId,
            price_at_purchase: Number(i.price),
            quantity: Number(i.quantity || 1),
        }));
        
        const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert(items);
            
        if (itemsErr) {
            return res.status(500).json({ message: `Error al insertar ítems: ${itemsErr.message}` });
        }

        // Crear preferencia de Mercado Pago
        const prefBody = {
            items: [
                { 
                    title: "Compra de Fotos Escolares", 
                    unit_price: Number(totalAmount), 
                    quantity: 1, 
                    currency_id: "ARS" 
                }
            ],
            external_reference: orderData.id,
            back_urls: {
                success: `${process.env.FRONTEND_URL}/success.html?orderId=${orderData.id}&customerEmail=${encodeURIComponent(customerEmail)}`,
                failure: `${process.env.FRONTEND_URL}/success.html?orderId=${orderData.id}&customerEmail=${encodeURIComponent(customerEmail)}`,
                pending: `${process.env.FRONTEND_URL}/success.html?orderId=${orderData.id}&customerEmail=${encodeURIComponent(customerEmail)}`,
            },
            auto_return: "approved",
            notification_url: `${process.env.BACKEND_URL}/mercadopago-webhook`,
        };

        const prefRes = await preference.create({ body: prefBody });
        const initPoint = process.env.NODE_ENV === "production" 
            ? prefRes.init_point 
            : prefRes.sandbox_init_point;

        incrementOrderCreated();
        
        logger.info("Preferencia de pago creada", { 
            orderId: orderData.id, 
            photographerId, 
            totalAmount 
        });

        return res.status(200).json({
            message: "Preferencia creada",
            init_point: initPoint,
            preference_id: prefRes.id,
            orderId: orderData.id,
        });
    } catch (e) {
        console.error("create-payment-preference error:", e);
        logger.error("Error al crear preferencia de pago", { error: e.message });
        return res.status(500).json({ message: "Error interno al crear preferencia." });
    }
}

/**
 * POST /simulate-payment - Simular pago para testing (solo desarrollo)
 */
async function simulatePayment(req, res) {
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ message: "orderId es requerido" });
    }

    try {
        // Verificar que la orden existe
        const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .select("id, status")
            .eq("id", orderId)
            .single();

        if (orderError || !order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        if (order.status === "paid") {
            return res.status(400).json({ message: "La orden ya está marcada como pagada" });
        }

        // Marcar orden como pagada
        const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({ 
                status: "paid",
                paid_at: new Date().toISOString()
            })
            .eq("id", orderId);

        if (updateError) {
            throw updateError;
        }

        logger.info("Pago simulado", { orderId });

        return res.status(200).json({
            message: "Pago simulado exitosamente",
            orderId: orderId,
            status: "paid"
        });
    } catch (err) {
        console.error("Error al simular pago:", err);
        return res.status(500).json({ message: "Error al simular pago" });
    }
}

module.exports = {
    createPaymentPreference,
    simulatePayment,
};
