# 📸 FOTOGRAFO SERVER - Sistema Completo

## ✅ Sistema de Autenticación Implementado

### Login de Fotógrafos
**Archivo:** `/photographer-login.html`

**Características:**
- ✅ Formulario completo con validación
- ✅ Toggle de visibilidad de contraseña
- ✅ Opción "Recordarme" (localStorage vs sessionStorage)
- ✅ Verificación automática de sesión activa
- ✅ Integración con endpoint `/auth/login`
- ✅ Almacenamiento de token JWT y datos del fotógrafo
- ✅ Redirección automática al dashboard tras login exitoso
- ✅ Mensajes de error/éxito con auto-hide
- ✅ Diseño responsive con gradiente glassmorphism

**Flujo:**
1. Usuario ingresa email y contraseña
2. POST a `/auth/login` con credenciales
3. Si es exitoso → Guarda token y datos en storage
4. Redirige a `/admin/admin_dashboard.html`
5. Si falla → Muestra mensaje de error

---

### Registro de Fotógrafos
**Archivo:** `/photographer-register.html`

**Características:**
- ✅ Formulario completo con 9 campos
- ✅ Validación de contraseñas coincidentes
- ✅ Indicador de fuerza de contraseña con barra visual
- ✅ Toggle de visibilidad para ambas contraseñas
- ✅ Campos obligatorios y opcionales claramente marcados
- ✅ Checkbox de términos y condiciones
- ✅ Integración con endpoint `/auth/register`
- ✅ Redirección automática al login tras registro exitoso
- ✅ Formulario scrolleable para pantallas pequeñas

**Campos:**
- Nombre del Negocio (requerido)
- Nombre (requerido)
- Apellido (requerido)
- Email (requerido)
- Teléfono (opcional)
- WhatsApp (opcional)
- Contraseña (requerido, min 8 caracteres)
- Confirmar Contraseña (requerido)
- Biografía (opcional, max 500 caracteres)

**Flujo:**
1. Usuario completa formulario
2. Validación client-side (passwords match, términos aceptados)
3. POST a `/auth/register` con datos del fotógrafo
4. Si es exitoso → Mensaje de confirmación
5. Redirige a `/photographer-login.html` después de 2 segundos

---

### Dashboard Admin Protegido
**Archivo:** `/admin/admin_dashboard.html`

**Mejoras:**
- ✅ Verificación de autenticación al cargar (redirect si no hay token)
- ✅ Muestra el nombre del fotógrafo en el header
- ✅ Botón de logout funcional con confirmación
- ✅ Limpieza completa de storage al cerrar sesión
- ✅ Emoji de cámara en el logo

**Script de Auth Check:**
```javascript
// Verifica token al cargar
const token = localStorage/sessionStorage.getItem('photographer_token');
if (!token) window.location.href = '/photographer-login.html';

// Muestra nombre del fotógrafo
const name = localStorage.getItem('photographer_name');
document.getElementById('photographerName').textContent = name;

// Logout handler
logoutButton.addEventListener('click', () => {
  // Limpia todos los datos y redirige al login
});
```

---

## 🎯 Flujo Completo del Cliente (Código de Acceso)

### 1. Página de Código de Acceso
**Archivo:** `/album-access.html`

**Características:**
- ✅ Validación de albumId en URL
- ✅ Carga información del álbum via GET `/albums/:id/info`
- ✅ Muestra nombre, fecha y hint del álbum
- ✅ Input de código con auto-uppercase y validación (4-20 chars)
- ✅ Botones de contacto dinámicos (WhatsApp/Email) si disponibles
- ✅ Verificación de código via POST `/albums/:id/verify-access`
- ✅ Almacena acceso en sessionStorage al aprobar
- ✅ Redirección automática a galería tras código correcto
- ✅ Manejo de álbumes sin código (acceso directo)

**Flujo:**
```
URL: /album-access.html?albumId=abc-123
↓
GET /albums/abc-123/info → Muestra datos del álbum
↓
Usuario ingresa código → Input uppercase, 4-20 chars
↓
POST /albums/abc-123/verify-access {code: "ABC123"}
↓
Si correcto → sessionStorage.setItem('album_abc-123_access', 'granted')
↓
Redirect → /tests/gallery-viewer.html?albumId=abc-123
```

---

### 2. Galería de Fotos del Álbum
**Archivo:** `/tests/gallery-viewer.html`

**Características:**
- ✅ Verificación de acceso en sessionStorage
- ✅ Carga única del álbum especificado en URL
- ✅ Header sticky con nombre del álbum
- ✅ Información del álbum (nombre, fecha, cantidad, precio por foto)
- ✅ Grid responsive de fotos con watermark
- ✅ Selección de fotos con toggle individual
- ✅ Badge visual en fotos seleccionadas
- ✅ Carrito flotante que aparece al seleccionar
- ✅ Cálculo automático del total
- ✅ Botón de checkout con redirección

**Flujo:**
```
URL: /tests/gallery-viewer.html?albumId=abc-123
↓
Verifica sessionStorage['album_abc-123_access']
  → Si no existe → Redirect a /album-access.html
↓
GET /albums/abc-123/info → Header del álbum
GET /albums/abc-123/photos → Fotos con watermark
↓
Usuario selecciona fotos → Set de photo IDs
↓
Click "Comprar Fotos" → sessionStorage.setItem('selectedPhotos', JSON)
↓
Redirect → /checkout.html (o integración MercadoPago)
```

---

## 🗂️ Organización de Archivos

### Páginas de Autenticación (Raíz)
```
/photographer-login.html         ← Login para fotógrafos
/photographer-register.html      ← Registro de fotógrafos
```

### Páginas del Cliente (Raíz)
```
/index.html                      ← Catálogo de fotógrafos/álbumes
/album-access.html               ← Ingreso de código de acceso
/success.html                    ← Confirmación de compra
/comofunciona.html               ← Información
/contacto.html                   ← Contacto
/gallery.html                    ← Galería general
```

### Páginas de Test (Tests)
```
/tests/gallery-viewer.html       ← Galería de álbum individual
/tests/testindex.html            ← Test index
```

### Panel Admin (Admin)
```
/admin/admin_dashboard.html      ← Dashboard principal (protegido)
/admin/monitoring.html           ← Sistema de monitoring
/admin/subscription.html         ← Gestión de suscripciones
/admin/login.html                ← Login admin (legacy)
```

### Test Suite
```
/test-suite.html                 ← Navegación de todas las páginas
```

---

## 🔐 Sistema de Tokens y Storage

### localStorage (Si "Recordarme" está marcado)
```javascript
photographer_token      → JWT del fotógrafo
photographer_id         → UUID del fotógrafo
photographer_name       → Nombre del negocio
photographer_email      → Email del fotógrafo
```

### sessionStorage (Por defecto)
```javascript
photographer_token              → JWT del fotógrafo
photographer_id                 → UUID del fotógrafo
photographer_name               → Nombre del negocio
photographer_email              → Email del fotógrafo
album_{albumId}_access          → 'granted' (acceso al álbum)
album_{albumId}_code            → Código ingresado
selectedPhotos                  → JSON array de photo IDs
albumId                         → UUID del álbum actual
```

---

## 🎨 Diseño Visual

### Paleta de Colores
- **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Success:** `#10b981` (verde)
- **Error:** `#ef4444` (rojo)
- **Warning:** `#f59e0b` (naranja)

### Componentes Reutilizables
- **Cards:** Fondo blanco, border-radius 15px, hover lift effect
- **Inputs:** Iconos a la izquierda, border-radius 10px, focus highlight
- **Botones:** Gradient primary, border-radius 10px, hover lift
- **Badges:** Border-radius 20px, colores temáticos
- **Headers:** Glassmorphism con backdrop-filter blur

---

## 🚀 Para Probar Todo el Sistema

### 1. Test Suite
Visita: `http://localhost:3000/test-suite.html`

### 2. Registro de Fotógrafo
1. Ve a `/photographer-register.html`
2. Completa el formulario
3. Click "Crear Cuenta"
4. Serás redirigido al login

### 3. Login
1. Ve a `/photographer-login.html`
2. Ingresa credenciales
3. Click "Iniciar Sesión"
4. Serás redirigido al dashboard

### 4. Dashboard
- Verás tu nombre en el header
- Puedes gestionar álbumes, pedidos
- Botón de logout en el header

### 5. Flujo del Cliente
1. Ve a `/index.html` (catálogo)
2. Click en álbum → Redirige a `/album-access.html?albumId=X`
3. Ingresa código de acceso
4. Serás redirigido a `/tests/gallery-viewer.html?albumId=X`
5. Selecciona fotos, ve el total
6. Click "Comprar Fotos"

---

## 📊 Estado del Proyecto

### ✅ Completado
- [x] Refactorización completa de server.js (87% reducción)
- [x] Sistema de validación con Joi
- [x] Sistema de códigos de acceso para álbumes
- [x] Login funcional para fotógrafos
- [x] Registro funcional para fotógrafos
- [x] Dashboard protegido con auth check
- [x] Página de ingreso de código de acceso
- [x] Galería de fotos de álbum individual
- [x] Test suite completo con navegación
- [x] Documentación completa

### 🔄 Por Implementar
- [ ] Página de checkout/integración completa con MercadoPago
- [ ] Descarga de fotos originales tras pago
- [ ] Recuperación de contraseña
- [ ] Edición de perfil de fotógrafo
- [ ] Subida de fotos desde el dashboard
- [ ] Gestión de códigos de acceso desde dashboard

---

## 🛠️ Endpoints Backend Utilizados

### Autenticación
- `POST /auth/register` - Registro de fotógrafo
- `POST /auth/login` - Login de fotógrafo

### Álbumes
- `GET /albums/:id/info` - Info pública del álbum
- `POST /albums/:id/verify-access` - Verificar código de acceso
- `GET /albums/:id/photos` - Fotos del álbum

### Admin
- `GET /admin/monitoring/logs` - Logs del sistema
- `GET /admin/monitoring/metrics` - Métricas
- `GET /admin/monitoring/stats` - Estadísticas

### Status
- `GET /status` - Estado del servidor

---

**Última actualización:** 28 de Noviembre 2025
**Versión:** 2.0.0 - Sistema completo con autenticación
