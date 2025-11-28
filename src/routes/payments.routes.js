// payments.routes.js - Rutas de pagos y webhooks de MercadoPago
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const webhookController = require("../controllers/webhookController");
const rateLimit = require("express-rate-limit");
const { 
    validate, 
    createPaymentPreferenceSchema, 
    simulatePaymentSchema 
} = require("../middleware/validation");

// Rate limiter específico para webhooks
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30,
    message: "Webhook rate limit excedido",
});

// POST /payments/create-preference - Crear preferencia de pago
router.post("/create-preference", validate(createPaymentPreferenceSchema), paymentController.createPaymentPreference);

// POST /payments/simulate - Simular pago (testing)
router.post("/simulate", express.json(), validate(simulatePaymentSchema), paymentController.simulatePayment);

// POST /payments/webhook - Webhook de MercadoPago
router.post("/webhook", webhookLimiter, express.json(), webhookController.handleMercadoPagoWebhook);

module.exports = router;
