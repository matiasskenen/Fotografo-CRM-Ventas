// Carga las variables de entorno PRIMERO
require("dotenv").config();

// Validar variables de entorno antes de continuar
const { checkEnvironmentOrExit } = require("./utils/envValidator");
checkEnvironmentOrExit();

// server.js
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const express = require("express");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

// ConfiguraciÃ³n centralizada
const {
    supabase,
    supabaseAdmin,
    ORIGINAL_BUCKET_NAME,
    WATERMARKED_BUCKET_NAME,
    ORDER_FIELD_NAME,
    mercadopago,
    upload,
} = require("./config");

// Utilidades
const logger = require("./utils/logger");

// Middleware
const { requireAuth, optionalAuth } = require("./middleware/auth");
const metricsMiddleware = require("./middleware/metricsMiddleware");

// Controllers
const albumController = require("./controllers/albumController");
const photoController = require("./controllers/photoController");
const orderController = require("./controllers/orderController");
const paymentController = require("./controllers/paymentController");
const adminController = require("./controllers/adminController");
const monitoringController = require("./controllers/monitoringController");
const webhookController = require("./controllers/webhookController");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - CRÃTICO para Render/Heroku/producciÃ³n detrÃ¡s de reverse proxy
app.set("trust proxy", 1);

// --- Middleware para tracking de mÃ©tricas ---
app.use(metricsMiddleware);

// Acceso a clientes de MercadoPago
const { preference, payment, getMerchantOrderWithRetry } = mercadopago;

// --- Middlewares ---
// SEGURIDAD: Helmet para headers HTTP seguros
app.use(
    helmet({
        contentSecurityPolicy: false, // Deshabilitado porque usamos CDN de Tailwind
        crossOriginEmbedderPolicy: false, // Necesario para imÃ¡genes de Supabase
        hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000 } : false,
    })
);

// SEGURIDAD: CORS configurado con whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["https://school-photos-backend.onrender.com"]; // Valor por defecto para producciÃ³n

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin origin (como mobile apps, Postman, curl)
        if (!origin) return callback(null, true);

        // En desarrollo, permitir localhost
        console.log("ðŸ” CORS CHECK:", { 
            origin, 
            NODE_ENV: process.env.NODE_ENV, 
            isDev: process.env.NODE_ENV !== 'production' 
        });
        
        if (process.env.NODE_ENV !== 'production') {
            console.log("âœ… Permitido por NODE_ENV");
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn("CORS bloqueado", { origin });
            callback(new Error("No permitido por CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// SEGURIDAD: Rate limiting general
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // LÃ­mite de 100 requests por ventana
    message: "Demasiadas peticiones desde esta IP, por favor intenta mÃ¡s tarde.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn("Rate limit excedido", {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: "Demasiadas peticiones, por favor intenta mÃ¡s tarde.",
            retryAfter: "15 minutos",
        });
    },
});

// SEGURIDAD: Rate limiting estricto para login
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Solo 5 intentos de login
    message: "Demasiados intentos de login, por favor intenta mÃ¡s tarde.",
    skipSuccessfulRequests: false, // Contar todos los intentos
    handler: (req, res) => {
        logger.warn("Rate limit de auth excedido", {
            ip: req.ip,
            email: req.body?.email,
        });
        res.status(429).json({
            error: "Demasiados intentos de login. Por seguridad, espera 15 minutos.",
            retryAfter: "15 minutos",
        });
    },
});

// SEGURIDAD: Rate limiting para creaciÃ³n de recursos
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 20, // 20 creaciones por hora
    message: "LÃ­mite de creaciÃ³n alcanzado.",
    handler: (req, res) => {
        logger.warn("Rate limit de creaciÃ³n excedido", {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            error: "Has alcanzado el lÃ­mite de creaciones por hora.",
            retryAfter: "1 hora",
        });
    },
});

// SEGURIDAD: Rate limiting para webhooks (mÃ¡s permisivo)
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // 30 requests por minuto
    message: "Webhook rate limit excedido",
});

// Aplicar rate limiting general a todas las rutas
app.use(generalLimiter);

app.use(express.json()); // Para parsear cuerpos de peticiÃ³n JSON
app.use(express.urlencoded({ extended: true })); // Para parsear datos de formularios URL-encoded

// Sirve los archivos estÃ¡ticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, "..", "public")));

// --- Rutas ---

// Servir la pÃ¡gina principal (index.html) en la raÃ­z
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Ruta de estado / prueba para verificar que el servidor estÃ¡ funcionando
app.get("/status", (req, res) => {
    res.send("Backend de la Plataforma de Fotos Escolares funcionando!");
});

// Ruta de prueba para verificar la conexiÃ³n a Supabase
app.get("/test-supabase", async (req, res) => {
    try {
        // Usamos supabaseAdmin para asegurarnos de que la conexiÃ³n de servicio funciona
        const { data, error } = await supabaseAdmin.from("albums").select("*").limit(1);

        if (error) {
            console.error("Error al probar Supabase:", error);
            return res.status(500).json({ message: "Error al conectar con Supabase", error: error.message });
        }
        res.status(200).json({ message: "ConexiÃ³n a Supabase exitosa. Datos de Ã¡lbumes (si hay):", data });
    } catch (err) {
        console.error("Error inesperado en /test-supabase:", err);
        res.status(500).json({ message: "Error inesperado del servidor" });
    }
});

// --- IMPORTAR RUTAS ---
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');
const albumsRoutes = require('./routes/albums.routes');
const photosRoutes = require('./routes/photos.routes');
const ordersRoutes = require('./routes/orders.routes');
const paymentsRoutes = require('./routes/payments.routes');
const adminRoutes = require('./routes/admin.routes');
const monitoringRoutes = require('./routes/monitoring.routes');

// --- MONTAR RUTAS ---
app.use('/auth', authLimiter, authRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/albums', albumsRoutes);
app.use('/photos', photosRoutes);
app.use('/orders', ordersRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);

// --- RUTAS DE PAGOS ---
app.post("/create-payment-preference", paymentController.createPaymentPreference);
app.post("/payments/create-payment-preference", paymentController.createPaymentPreference);
app.post("/simulate-payment", express.json(), paymentController.simulatePayment);

// --- RUTAS DE FOTOS ---
app.post("/upload-photos/:albumId", requireAuth, upload.array("photos"), photoController.uploadPhotos);
app.get("/download-photo/:photoId/:orderId/:customerEmail", photoController.downloadPhoto);
app.delete("/photos/:id", requireAuth, photoController.deletePhoto);

// --- WEBHOOK DE MERCADO PAGO ---
app.post("/mercadopago-webhook", webhookLimiter, express.json(), webhookController.handleMercadoPagoWebhook);

// --- RUTAS DE Ã“RDENES ---
app.get("/order-details/:orderId/:customerEmail", orderController.getOrderDetails);
app.get("/orders", requireAuth, orderController.getOrders);
app.delete("/orders/all", requireAuth, orderController.deleteAllOrders);
app.delete("/orders/:id", requireAuth, orderController.deleteOrder);

// --- RUTAS DE ADMINISTRACIÃ“N ---
app.get("/admin/stats", requireAuth, adminController.getStats);
app.post("/api/testing/create-test-album", adminController.createTestAlbum);
app.delete("/api/testing/cleanup-test-data", adminController.cleanupTestData);
app.get("/api/testing/simulate-error", adminController.simulateError);
app.get("/api/testing/slow-endpoint", adminController.slowEndpoint);

// --- RUTAS DE MONITOREO ---
app.get("/api/monitoring/logs", monitoringController.getLogs);
app.delete("/api/monitoring/logs", monitoringController.clearLogs);
app.post("/api/monitoring/log-level", monitoringController.setLogLevel);
app.post("/api/monitoring/console-logging", monitoringController.setConsoleLogging);
app.get("/api/monitoring/metrics", monitoringController.getMetrics);
app.delete("/api/monitoring/metrics", monitoringController.resetMetrics);
app.get("/api/monitoring/health", monitoringController.healthCheck);

// --- RUTA DE CONFIGURACIÃ“N FRONTEND ---
app.get("/config.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    const backendUrl = process.env.NODE_ENV === "development" 
        ? `http://localhost:${process.env.PORT || 3000}`
        : process.env.BACKEND_URL;
    res.send(`window.BACKEND_URL = "${backendUrl}";`);
});

// --- Iniciar el servidor ---
app.listen(PORT, () => {
    console.log(`✅ Servidor backend escuchando en puerto ${PORT}`);
    try {
        logger.info(`Servidor backend escuchando en puerto ${PORT}`);
        logger.info("Sistema iniciado correctamente", {
            environment: process.env.NODE_ENV || "development",
            port: PORT
        });
    } catch (err) {
        console.error("Error en logger:", err.message);
    }
}).on('error', (err) => {
    console.error("❌ Error al iniciar servidor:", err);
    process.exit(1);
});
