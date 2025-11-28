// mercadopago.js - Configuración de Mercado Pago
const mercadopago = require("mercadopago");

// Verificación de variables de entorno de Mercado Pago
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    console.error("❌ Error: MERCADOPAGO_ACCESS_TOKEN no está definido en .env");
    process.exit(1);
}

// Cliente de Mercado Pago con Access Token
const client = new mercadopago.MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Instancias de Preference y Payment
const preference = new mercadopago.Preference(client);
const payment = new mercadopago.Payment(client);

/**
 * Función con reintentos para obtener Merchant Order (para webhooks)
 * @param {string} merchantOrderId - ID de la orden de Mercado Pago
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Delay entre reintentos en ms
 * @returns {Promise<Object>} - Merchant Order
 */
async function getMerchantOrderWithRetry(merchantOrderId, retries = 3, delay = 1000) {
    const merchantOrder = new mercadopago.MerchantOrder(client);
    
    for (let i = 0; i < retries; i++) {
        try {
            const response = await merchantOrder.get({ merchantOrderId });
            return response;
        } catch (error) {
            console.warn(`⚠️ Intento ${i + 1}/${retries} fallido al obtener merchant_order ${merchantOrderId}:`, error.message);
            
            if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
}

module.exports = {
    client,
    preference,
    payment,
    getMerchantOrderWithRetry,
};
