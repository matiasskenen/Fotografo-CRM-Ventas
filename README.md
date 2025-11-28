# SchoolSnap - Plataforma de Fotografía Escolar

Plataforma backend para gestión de fotografías escolares con Mercado Pago y Supabase.

## 📁 Estructura del Proyecto

```
📦 Fotografo SERVER/
├── 📂 src/                      # Código fuente del backend
│   ├── 📂 config/              # Configuraciones
│   ├── 📂 controllers/         # Controladores (lógica de negocio)
│   ├── 📂 middleware/          # Middlewares de Express
│   │   └── auth.js            # Autenticación
│   ├── 📂 models/              # Modelos de datos
│   ├── 📂 routes/              # Rutas de la API
│   │   ├── auth.js            # Rutas de autenticación
│   │   └── subscriptions.js   # Rutas de suscripciones
│   ├── 📂 services/            # Servicios y lógica de negocio
│   ├── 📂 migrations/          # Migraciones de base de datos
│   └── server.js              # Archivo principal del servidor
│
├── 📂 public/                   # Archivos estáticos públicos
│   ├── index.html              # Landing page principal
│   ├── gallery.html            # Galería de fotos
│   ├── success.html            # Página de éxito de pago
│   ├── register.html           # Registro de fotógrafos
│   ├── comofunciona.html       # Información
│   ├── contacto.html           # Contacto
│   ├── 📂 admin/               # Panel de administración
│   ├── 📂 assets/              # CSS e imágenes públicas
│   ├── 📂 js/                  # JavaScript del frontend
│   └── 📂 tests/               # Páginas HTML de prueba
│
├── 📂 tests/                    # Tests del backend
│   ├── register.test.js        # Test de registro
│   ├── security.test.js        # Test de seguridad
│   └── test-server.js          # Servidor de pruebas
│
├── 📂 scripts/                  # Scripts de utilidades
│   ├── backup.js               # Script de backup de DB
│   └── check-env.js            # Verificación de variables de entorno
│
├── 📂 docs/                     # Documentación
│   ├── DATABASE_MULTITENANT.md
│   ├── MONITORING_README.md
│   ├── REFACTORING_MULTITENANT.md
│   └── SECURITY_README.md
│
├── 📂 assets/                   # Assets del servidor (watermarks, etc.)
├── 📂 backups/                  # Backups de la base de datos
├── .env                         # Variables de entorno (NO en git)
├── .env.example                 # Ejemplo de variables de entorno
├── package.json                 # Dependencias del proyecto
└── README.md                    # Este archivo
```

## 🚀 Inicio Rápido

### Instalación

```bash
npm install
```

### Variables de Entorno

Copia `.env.example` a `.env` y configura tus variables:

```bash
cp .env.example .env
```

Variables requeridas:
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_KEY` - API Key de Supabase
- `MERCADOPAGO_ACCESS_TOKEN` - Token de acceso de Mercado Pago
- `MERCADOPAGO_WEBHOOK_SECRET` - Secret del webhook

### Ejecutar el Servidor

```bash
# Modo desarrollo
npm start

# Verificar variables de entorno
node scripts/check-env.js
```

## 📝 Scripts Disponibles

```bash
npm start              # Inicia el servidor principal
npm run backup         # Ejecuta backup de la base de datos
npm run test:security  # Ejecuta tests de seguridad
```

## 🧪 Testing

Los archivos de test están organizados en:
- `/tests/` - Tests del backend (Node.js)
- `/public/tests/` - Páginas HTML de prueba del frontend

Para ejecutar el servidor de tests:
```bash
node tests/test-server.js
```

## 📚 Documentación

Consulta la carpeta `/docs/` para documentación detallada sobre:
- Base de datos y multitenant
- Seguridad
- Monitoreo
- Refactoring

## 🔒 Seguridad

- Helmet configurado para headers de seguridad
- Rate limiting en endpoints críticos
- Autenticación con JWT
- Variables sensibles en `.env` (no versionado)

## 📦 Dependencias Principales

- **Express** - Framework web
- **Supabase** - Base de datos y almacenamiento
- **Mercado Pago** - Procesamiento de pagos
- **Sharp** - Procesamiento de imágenes
- **Multer** - Subida de archivos

## 🌐 Despliegue

El proyecto está configurado para desplegarse en Render u otros servicios similares.

Variables de entorno de producción deben configurarse en el panel del servicio.

---

**Nota**: Este proyecto fue reorganizado para seguir mejores prácticas de estructura de proyecto Node.js/Express.
