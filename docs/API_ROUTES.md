# 📋 Índice de Rutas API

Este documento describe todas las rutas disponibles en la API, organizadas por módulo.

## 🎯 URLs Base

- **Desarrollo**: `http://localhost:3000`
- **Producción**: Configurada en `.env` como `BACKEND_URL`

---

## 🖼️ Álbumes (`/albums`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/albums` | ✅ | Obtener todos los álbumes del fotógrafo |
| POST | `/albums` | ✅ | Crear nuevo álbum (rate limited: 20/hora) |
| GET | `/albums/:albumId/photos` | ❌ | Obtener fotos de un álbum (público) |
| GET | `/albums/with-photos` | ✅ | Obtener álbumes con sus fotos incluidas |
| PUT | `/albums/:id` | ❌ | Actualizar álbum |
| DELETE | `/albums/:id` | ✅ | Eliminar álbum y sus fotos |

**Rutas Legacy (mantener compatibilidad):**
- GET `/albums-with-photos` → migrar a `/albums/with-photos`

---

## 📸 Fotos (`/photos`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/photos/upload/:albumId` | ✅ | Subir fotos a un álbum (con watermark) |
| GET | `/photos/download/:photoId/:orderId/:customerEmail` | ❌ | Descargar foto original (con validación) |
| DELETE | `/photos/:id` | ✅ | Eliminar foto |

**Rutas Legacy:**
- POST `/upload-photos/:albumId` → migrar a `/photos/upload/:albumId`
- GET `/download-photo/:photoId/:orderId/:customerEmail` → migrar a `/photos/download/...`

---

## 🛒 Órdenes (`/orders`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/orders` | ✅ | Obtener todos los pedidos del fotógrafo |
| GET | `/orders/details/:orderId/:customerEmail` | ❌ | Obtener detalles de orden (público) |
| DELETE | `/orders/all` | ✅ | Eliminar todos los pedidos |
| DELETE | `/orders/:id` | ✅ | Eliminar pedido específico |

**Rutas Legacy:**
- GET `/order-details/:orderId/:customerEmail` → migrar a `/orders/details/...`

---

## 💳 Pagos (`/payments`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/payments/create-preference` | ❌ | Crear preferencia de pago MercadoPago |
| POST | `/payments/simulate` | ❌ | Simular pago aprobado (testing) |
| POST | `/payments/webhook` | ❌ | Webhook de MercadoPago (rate limited: 30/min) |

**Rutas Legacy:**
- POST `/create-payment-preference` → migrar a `/payments/create-preference`
- POST `/mercadopago-webhook` → migrar a `/payments/webhook`

---

## 👤 Autenticación (`/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Registrar nuevo fotógrafo |
| POST | `/auth/login` | ❌ | Iniciar sesión (rate limited: 5/15min) |
| GET | `/auth/me` | ✅ | Obtener perfil del usuario |
| POST | `/auth/logout` | ✅ | Cerrar sesión |

---

## 💼 Suscripciones (`/subscriptions`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/subscriptions` | ✅ | Obtener suscripción actual |
| POST | `/subscriptions/checkout` | ✅ | Crear sesión de checkout |
| POST | `/subscriptions/cancel` | ✅ | Cancelar suscripción |

---

## 🔧 Administración (`/admin`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/admin/stats` | ✅ | Obtener estadísticas del fotógrafo |
| POST | `/admin/testing/create-test-album` | ❌ | Crear álbum de prueba |
| DELETE | `/admin/testing/cleanup` | ❌ | Limpiar datos de prueba |
| GET | `/admin/testing/simulate-error` | ❌ | Simular error (testing) |
| GET | `/admin/testing/slow-endpoint` | ❌ | Endpoint lento (testing) |

---

## 📊 Monitoreo (`/api/monitoring`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/monitoring/logs` | ❌ | Obtener logs del sistema |
| DELETE | `/api/monitoring/logs` | ❌ | Limpiar logs |
| POST | `/api/monitoring/log-level` | ❌ | Configurar nivel de log |
| POST | `/api/monitoring/console-logging` | ❌ | Habilitar/deshabilitar logs en consola |
| GET | `/api/monitoring/metrics` | ❌ | Obtener métricas del sistema |
| DELETE | `/api/monitoring/metrics` | ❌ | Resetear métricas |
| GET | `/api/monitoring/health` | ❌ | Health check del sistema |

---

## 🔒 Seguridad

### Rate Limiting

- **General**: 100 requests / 15 minutos
- **Autenticación**: 5 intentos / 15 minutos
- **Creación de recursos**: 20 / hora
- **Webhooks**: 30 / minuto

### Autenticación

La autenticación se realiza mediante JWT en el header:
```
Authorization: Bearer <token>
```

### CORS

- **Desarrollo**: Todos los orígenes permitidos
- **Producción**: Solo orígenes en `ALLOWED_ORIGINS` (.env)

---

## 📝 Ejemplos de Uso

### Crear un álbum
```javascript
POST /albums
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Graduación 2024",
  "event_date": "2024-06-15",
  "description": "Fotos de graduación",
  "price_per_photo": 2500
}
```

### Subir fotos
```javascript
POST /photos/upload/:albumId
Authorization: Bearer <token>
Content-Type: multipart/form-data

photos: [file1.jpg, file2.jpg, ...]
```

### Crear preferencia de pago
```javascript
POST /payments/create-preference
Content-Type: application/json

{
  "cart": [
    {
      "photoId": "uuid-1234",
      "price": 2500,
      "quantity": 1
    }
  ],
  "customerEmail": "cliente@ejemplo.com"
}
```

---

## 🚀 Migración de Rutas Legacy

Para mantener compatibilidad con el frontend existente, las siguientes rutas legacy seguirán funcionando pero deberían migrarse gradualmente:

| Legacy | Nueva Ruta | Acción |
|--------|------------|--------|
| GET `/albums-with-photos` | GET `/albums/with-photos` | Actualizar frontend |
| POST `/upload-photos/:id` | POST `/photos/upload/:id` | Actualizar frontend |
| GET `/download-photo/...` | GET `/photos/download/...` | Actualizar frontend |
| POST `/create-payment-preference` | POST `/payments/create-preference` | Actualizar frontend |
| POST `/mercadopago-webhook` | POST `/payments/webhook` | Actualizar config MP |
| GET `/order-details/...` | GET `/orders/details/...` | Actualizar frontend |

---

## 📚 Documentación Adicional

- [Arquitectura del Proyecto](./PROJECT_ARCHITECTURE.md)
- [Base de Datos Multi-Tenant](./DATABASE_MULTITENANT.md)
- [Sistema de Monitoreo](./MONITORING_README.md)
- [Seguridad](./SECURITY_README.md)
