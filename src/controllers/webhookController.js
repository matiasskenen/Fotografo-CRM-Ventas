// webhookController.js - Controlador de webhooks de Mercado Pago
const crypto = require("crypto");
const { supabaseAdmin, ORDER_FIELD_NAME } = require("../config");
const logger = require("../utils/logger");
const { incrementOrderPaid } = require("../utils/metrics");

// Cache para protección anti-replay
const replayProtectionCache = new Map();
const REPLAY_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const MP_BASE_URL = "https://api.mercadopago.com";

/**
 * Procesa una orden de Mercado Pago
 */
async function procesarOrden(orderData, timestamp) {
    if (orderData.order_status !== "paid" && orderData.paid_amount < orderData.total_amount) {
        return false;
    }

    const orderId = orderData.external_reference;

    if (!orderId) {
        logger.warn("External reference faltante en orden", { orderData: orderData.id });
        return false;
    }

    logger.info("Procesando orden de pago", { orderId });

    // Verificar si existe la orden
    const { data: orders, error: checkError } = await supabaseAdmin
        .from("orders")
        .select("status, mercado_pago_payment_id, customer_email")
        .eq("id", orderId);

    if (checkError || !orders || orders.length === 0) {
        logger.error("Orden no encontrada en DB", { orderId, error: checkError?.message });
        return false;
    }

    const existingOrder = orders[0];

    // Si ya fue procesada, saltar
    if (existingOrder.status === "paid" && existingOrder.mercado_pago_payment_id) {
        logger.info("Orden ya procesada anteriormente", { orderId });
        return false;
    }

    const order = existingOrder;

    // Obtener items del pedido
    const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("photo_id")
        .eq(ORDER_FIELD_NAME, orderId);

    if (itemsError || !orderItems || orderItems.length === 0) {
        logger.error("Error obteniendo items de orden", { orderId, error: itemsError?.message });
        return false;
    }

    // Actualizar orden a 'paid'
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    const paymentId = orderData.payments?.[0]?.id || null;

    const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
            status: "paid",
            mercado_pago_payment_id: paymentId,
            download_expires_at: expiresAt.toISOString(),
            paid_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (updateError) {
        logger.error("Error actualizando orden a paid", { orderId, error: updateError.message });
        return false;
    }

    logger.info("Orden actualizada a paid", { 
        orderId, 
        paymentId, 
        itemsCount: orderItems.length,
        expiresAt: expiresAt.toISOString()
    });

    // Crear registro de descargas (si no existe)
    const { data: existingDownload } = await supabaseAdmin
        .from("descargas")
        .select("*")
        .eq("order_id", orderId)
        .single();

    if (!existingDownload) {
        const { error: downloadError } = await supabaseAdmin
            .from("descargas")
            .insert({
                order_id: orderId,
                user_email: order.customer_email,
                contador: 0,
            });

        if (downloadError) {
            logger.warn("Error creando registro de descargas", { orderId, error: downloadError.message });
        }
    }

    incrementOrderPaid();

    return true;
}

/**
 * POST /mercadopago-webhook - Webhook de Mercado Pago
 */
async function handleMercadoPagoWebhook(req, res) {
    const now = new Date();
    const timestamp = now.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });

    try {
        // Headers y datos básicos
        const xSignature = req.headers["x-signature"];
        const xRequestId = req.headers["x-request-id"] || "no-request-id";
        const dataId = req.query["data.id"] || req.query.id || req.body.data?.id;
        const topic = req.query.type || req.query.topic || req.body.type;

        logger.info("Webhook recibido", { topic, dataId, xRequestId });

        // Validación de signature
        if (!xSignature) {
            logger.warn("Webhook sin x-signature", { topic, dataId });
            return res.status(200).json({ status: "missing_signature_ignored" });
        }

        // Parsear signature
        const parts = xSignature.split(",");
        let ts, hash;
        for (const part of parts) {
            const [key, value] = part.split("=");
            if (!key || !value) continue;
            const k = key.trim();
            const v = value.trim();
            if (k === "ts") ts = v;
            if (k === "v1") hash = v;
        }

        if (!ts || !hash) {
            logger.warn("Signature inválida (formato)", { topic, dataId });
            return res.status(200).json({ status: "invalid_signature_format_ignored" });
        }

        // Verificar HMAC
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || "";
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const computedHash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

        if (computedHash !== hash) {
            logger.error("HMAC inválido", { topic, dataId });
            return res.status(200).json({ status: "invalid_signature_ignored" });
        }

        // Idempotencia
        const idempotencyKey = xRequestId || `${topic}-${dataId}`;
        if (replayProtectionCache.has(idempotencyKey)) {
            logger.info("Webhook ya procesado (idempotencia)", { idempotencyKey });
            return res.status(200).json({ status: "already_processed" });
        }
        replayProtectionCache.set(idempotencyKey, true);
        setTimeout(() => replayProtectionCache.delete(idempotencyKey), REPLAY_CACHE_TTL);

        // Procesar según topic
        if (topic === "payment") {
            logger.info("Procesando payment webhook", { dataId });

            // Esperar a que MP tenga el payment listo
            await new Promise((r) => setTimeout(r, 3000));

            const mpRes = await fetch(`${MP_BASE_URL}/v1/payments/${dataId}`, {
                headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
            });

            if (!mpRes.ok) {
                logger.warn("Payment aún no existe", { dataId, status: mpRes.status });
                return res.status(200).json({ status: "payment_not_ready_yet" });
            }

            const paymentData = await mpRes.json();

            if (paymentData.status !== "approved") {
                logger.info("Payment no aprobado", { dataId, status: paymentData.status });
                return res.status(200).json({ status: "not_approved" });
            }

            const merchantOrderId = paymentData.order?.id;
            if (!merchantOrderId) {
                logger.warn("Payment aprobado pero sin merchant_order", { dataId });
                return res.status(200).json({ status: "no_merchant_order" });
            }

            // Obtener merchant order
            const orderRes = await fetch(`${MP_BASE_URL}/merchant_orders/${merchantOrderId}`, {
                headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
            });

            if (!orderRes.ok) {
                logger.error("Error consultando merchant_order", { merchantOrderId, status: orderRes.status });
                return res.status(500).json({ error: "Failed to fetch merchant_order" });
            }

            const orderData = await orderRes.json();
            const success = await procesarOrden(orderData, timestamp);

            if (success) {
                logger.info("Payment procesado exitosamente", { 
                    dataId, 
                    orderId: orderData.external_reference 
                });
            }

            return res.status(200).json({ status: "processed" });
        }

        if (topic === "merchant_order") {
            logger.info("Procesando merchant_order webhook", { dataId });

            const orderRes = await fetch(`${MP_BASE_URL}/merchant_orders/${dataId}`, {
                headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
            });

            if (!orderRes.ok) {
                logger.error("Error consultando merchant_order", { dataId, status: orderRes.status });
                return res.status(500).json({ error: "Failed to fetch merchant_order" });
            }

            const orderData = await orderRes.json();
            const success = await procesarOrden(orderData, timestamp);

            if (success) {
                logger.info("Merchant Order procesado exitosamente", { 
                    dataId, 
                    orderId: orderData.external_reference 
                });
            }

            return res.status(200).json({ status: "processed" });
        }

        // Otros topics ignorados
        logger.info("Topic ignorado", { topic, dataId });
        return res.status(200).json({ status: "ignored_topic" });

    } catch (error) {
        logger.error("Error en webhook", { error: error.message, stack: error.stack });
        return res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    handleMercadoPagoWebhook,
};
