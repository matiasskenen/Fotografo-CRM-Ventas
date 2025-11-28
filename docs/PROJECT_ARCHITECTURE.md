# 🏗️ Arquitectura del Proyecto

## 📁 Estructura de Carpetas

```
Fotografo SERVER/
├── src/                          # Código fuente
│   ├── config/                   # Configuraciones centralizadas
│   │   ├── database.js          # Cliente Supabase (anon + admin)
│   │   ├── mercadopago.js       # Cliente MercadoPago con retry logic
│   │   ├── multer.js            # Configuración de uploads
│   │   └── index.js             # Exportación centralizada
│   │
│   ├── controllers/              # Lógica de negocio
│   │   ├── albumController.js   # Gestión de álbumes (220 líneas)
│   │   ├── photoController.js   # Subida y descarga de fotos (345 líneas)
│   │   ├── orderController.js   # Gestión de pedidos (210 líneas)
│   │   ├── paymentController.js # Pagos MercadoPago (165 líneas)
│   │   ├── webhookController.js # Webhook de MercadoPago (195 líneas)
│   │   ├── adminController.js   # Estadísticas y testing (180 líneas)
│   │   └── monitoringController.js # Logs y métricas (195 líneas)
│   │
│   ├── middleware/               # Middleware personalizado
│   │   ├── auth.js              # Autenticación JWT + multi-tenant
│   │   └── metricsMiddleware.js # Tracking de métricas de requests
│   │
│   ├── routes/                   # Definición de rutas
│   │   ├── auth.js              # Rutas de autenticación
│   │   ├── subscriptions.js     # Rutas de suscripciones
│   │   ├── albums.routes.js     # Rutas de álbumes
│   │   ├── photos.routes.js     # Rutas de fotos
│   │   ├── orders.routes.js     # Rutas de pedidos
│   │   ├── payments.routes.js   # Rutas de pagos
│   │   ├── admin.routes.js      # Rutas de administración
│   │   └── monitoring.routes.js # Rutas de monitoreo
│   │
│   ├── utils/                    # Utilidades reutilizables
│   │   ├── logger.js            # Sistema de logging centralizado
│   │   └── metrics.js           # Tracking de métricas de negocio
│   │
│   ├── migrations/               # Migraciones de base de datos
│   │   └── 001_multitenant.sql # Setup inicial multi-tenant
│   │
│   └── server.js                 # Punto de entrada (233 líneas)
│
├── public/                       # Archivos estáticos (frontend)
│   ├── index.html
│   ├── gallery.html
│   ├── success.html
│   ├── admin/                    # Dashboard de administración
│   └── tests/                    # Páginas de testing
│
├── tests/                        # Tests automatizados
│   ├── register.test.js
│   ├── security.test.js
│   └── test-server.js
│
├── scripts/                      # Scripts de utilidad
│   ├── backup.js                # Script de backup automático
│   └── check-env.js             # Validación de variables de entorno
│
├── docs/                         # Documentación
│   ├── API_ROUTES.md            # Índice de rutas API
│   ├── PROJECT_ARCHITECTURE.md  # Este archivo
│   ├── DATABASE_MULTITENANT.md  # Arquitectura de base de datos
│   ├── MONITORING_README.md     # Sistema de monitoreo
│   ├── SECURITY_README.md       # Consideraciones de seguridad
│   └── REFACTORING_MULTITENANT.md
│
├── assets/                       # Recursos estáticos
│   └── watermark.png            # Marca de agua para fotos
│
├── backups/                      # Backups automáticos
│
├── .env                          # Variables de entorno (no commitear)
├── .gitignore
├── package.json
└── README.md
```

---

## 🎯 Patrón de Arquitectura: MVC Modular

### Model (Base de Datos)
- **Supabase PostgreSQL** con Row Level Security (RLS)
- Multi-tenant con aislamiento por `photographer_id`
- Tablas principales: `photographers`, `albums`, `photos`, `orders`, `order_items`

### View (Frontend)
- HTML/CSS/JavaScript vanilla
- Dashboard de administración en `/public/admin/`
- Páginas públicas para clientes

### Controller (Backend)
- **Express.js** como framework
- Controllers especializados por dominio
- Separación clara de responsabilidades

---

## 🔄 Flujo de Datos

### 1. Request Flow
```
Cliente → Express Middleware → Route → Controller → Database/Storage → Response
```

### 2. Middleware Stack
```javascript
1. Trust Proxy (Render/Heroku)
2. Metrics Middleware (tracking)
3. Helmet (security headers)
4. CORS (origin validation)
5. Rate Limiting (general/auth/create/webhook)
6. Body Parsers (JSON/URL-encoded)
7. Static Files
8. Routes
```

### 3. Authentication Flow
```
1. Cliente envía credenciales
2. Supabase Auth valida
3. JWT token generado
4. Token enviado en Authorization header
5. Middleware requireAuth valida
6. req.photographer inyectado
7. Multi-tenant check en queries
```

---

## 🗄️ Capa de Datos

### Supabase Clients

**`supabase` (anon key)**
- Usuario con permisos limitados
- Respeta Row Level Security (RLS)
- Usado para operaciones que deben respetar políticas

**`supabaseAdmin` (service role)**
- Acceso completo, bypassa RLS
- Usado para operaciones administrativas
- Usado en webhooks y operaciones de sistema

### Storage Buckets

**`original-photos` (privado)**
- Fotos originales sin marca de agua
- Solo accesible con URLs firmadas
- Se genera URL temporal al descargar

**`watermarked-photos` (público)**
- Fotos con marca de agua
- URLs públicas para galería
- Procesadas con Sharp al subir

---

## 🔐 Seguridad

### Rate Limiting
- **General**: 100 req/15min por IP
- **Auth**: 5 intentos/15min
- **Create**: 20/hora
- **Webhook**: 30/minuto

### Autenticación Multi-Tenant
```javascript
// Cada query incluye photographer_id del token
const { data } = await supabaseAdmin
    .from("albums")
    .select("*")
    .eq("photographer_id", req.photographer.id);  // ← Aislamiento
```

### CORS
- Desarrollo: todos los orígenes
- Producción: whitelist en `ALLOWED_ORIGINS`

### Helmet
- Content Security Policy
- Cross-Origin policies
- HSTS en producción

---

## 📊 Sistema de Monitoreo

### Logging
```javascript
// Niveles: DEBUG, INFO, WARN, ERROR
logger.info("Evento", { metadata });

// Buffer circular de 1000 logs
// Sanitización automática de datos sensibles
```

### Métricas
```javascript
metrics: {
    requests: { total, byEndpoint, byStatusCode },
    errors: { total, byType },
    photos: { uploaded, downloaded },
    albums: { created },
    orders: { created, paid },
    responseTimes: [...]
}
```

### Health Check
```javascript
GET /api/monitoring/health
→ Verifica DB, Storage, Server
→ Status: healthy, degraded, unhealthy
```

---

## 🚀 Flujos de Negocio Principales

### 1. Subida de Fotos
```
1. Fotógrafo sube fotos a álbum
2. Multer recibe archivos (max 25MB)
3. Sharp aplica watermark
4. Supabase Storage guarda ambas versiones
5. Registro en DB con rutas
6. Métricas actualizadas
7. Response con URLs públicas
```

### 2. Compra de Fotos
```
1. Cliente selecciona fotos
2. POST /payments/create-preference
3. Se crea orden en DB (status: pending)
4. MercadoPago genera preference
5. Cliente paga en MP
6. MP envía webhook
7. Webhook valida HMAC signature
8. Orden actualizada (status: paid)
9. Registro de descargas creado
10. Cliente puede descargar originales
```

### 3. Descarga de Foto Original
```
1. Cliente accede a /photos/download/...
2. Validación: orden pagada + email correcto
3. Check límite de descargas (3 por defecto)
4. Generar URL firmada (válida 7 días)
5. Incrementar contador
6. Redirect a URL firmada
7. Supabase sirve archivo
```

---

## 🔧 Configuración y Entorno

### Variables de Entorno Críticas
```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# URLs
FRONTEND_URL=
BACKEND_URL=

# Seguridad
ALLOWED_ORIGINS=
JWT_SECRET=

# Opcionales
NODE_ENV=production
PORT=3000
```

---

## 📈 Escalabilidad

### Horizontal Scaling
- Stateless design (sin sesiones en memoria)
- JWT para auth (no requiere sesión de servidor)
- Métricas en memoria (OK para instancias múltiples independientes)

### Vertical Scaling
- Multer usa memoria (considerar disk en alta carga)
- Sharp procesa en CPU (considerar worker threads)
- Rate limiting en memoria (considerar Redis para cluster)

### Optimizaciones Futuras
- [ ] Cache con Redis (albums, photos públicas)
- [ ] Queue para procesamiento de imágenes (Bull/BullMQ)
- [ ] CDN para archivos estáticos
- [ ] Lazy loading de módulos
- [ ] Compresión de responses (gzip)

---

## 🧪 Testing

### Estructura
```
tests/
├── unit/              # Tests de controllers aislados
├── integration/       # Tests de flujos completos
└── e2e/              # Tests end-to-end con frontend
```

### Endpoints de Testing
```
POST /admin/testing/create-test-album
DELETE /admin/testing/cleanup
GET /admin/testing/simulate-error?type=400|404|500
GET /admin/testing/slow-endpoint?delay=3000
```

---

## 📝 Mejoras Implementadas

### ✅ Completadas

1. **Modularización**
   - server.js: 1838 → 233 líneas (87% reducción)
   - 7 controllers especializados
   - 6 archivos de rutas organizados

2. **Configuración Centralizada**
   - database.js, mercadopago.js, multer.js
   - Fácil cambiar proveedores

3. **Sistema de Logging**
   - Buffer circular con sanitización
   - Niveles configurables en runtime
   - Metadata estructurada

4. **Métricas de Negocio**
   - Tracking automático de eventos
   - Performance monitoring
   - Health checks

### 🔄 En Progreso

- [ ] Middleware de validación (schemas)
- [ ] Error handling centralizado
- [ ] Tests automatizados
- [ ] Documentación OpenAPI/Swagger

### 💡 Roadmap Futuro

- [ ] GraphQL API
- [ ] WebSockets para notificaciones en tiempo real
- [ ] Internacionalización (i18n)
- [ ] Admin dashboard React/Vue
- [ ] Analytics avanzados
- [ ] A/B testing framework

---

## 🤝 Contribuir

### Agregar un Nuevo Endpoint

1. **Crear función en controller**
```javascript
// src/controllers/exampleController.js
exports.newFeature = async (req, res) => {
    try {
        const photographerId = req.photographer.id;
        // lógica...
        res.json({ success: true });
    } catch (error) {
        logger.error("Error en newFeature", { error: error.message });
        res.status(500).json({ error: "Error interno" });
    }
};
```

2. **Agregar ruta**
```javascript
// src/routes/example.routes.js
router.post("/new-feature", requireAuth, exampleController.newFeature);
```

3. **Montar en server.js**
```javascript
const exampleRoutes = require('./routes/example.routes');
app.use('/example', exampleRoutes);
```

4. **Documentar en API_ROUTES.md**

---

## 📚 Referencias

- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [Supabase Docs](https://supabase.com/docs)
- [MercadoPago API](https://www.mercadopago.com.ar/developers)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
