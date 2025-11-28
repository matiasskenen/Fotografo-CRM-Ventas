# 🔐 Sistema de Códigos de Acceso para Álbumes

## 📋 Descripción

Sistema que permite a los fotógrafos proteger sus álbumes con códigos de acceso personalizados. Los clientes deben ingresar el código correcto antes de poder ver las fotos.

## 🎯 Flujo de Usuario

### Para el Fotógrafo:

1. **Crear álbum** (con o sin código)
   ```bash
   POST /albums
   {
     "name": "Graduación 2024",
     "event_date": "2024-12-15",
     "description": "Fotos de la graduación"
   }
   ```

2. **Configurar código de acceso**
   ```bash
   PUT /albums/{albumId}/access-code
   {
     "access_code": "GRAD2024",
     "requires_access_code": true,
     "access_code_hint": "Año de graduación"
   }
   ```

3. **Compartir código con clientes** (WhatsApp, email, etc.)

### Para el Cliente:

1. **Acceder a la galería**
   ```bash
   GET /albums/{albumId}/info
   ```
   Respuesta:
   ```json
   {
     "album": {
       "id": "uuid",
       "name": "Graduación 2024",
       "requires_access_code": true,
       "access_code_hint": "Año de graduación"
     }
   }
   ```

2. **Ingresar código**
   ```bash
   POST /albums/{albumId}/verify-access
   {
     "accessCode": "GRAD2024"
   }
   ```

3. **Si el código es correcto → Ver fotos**
   ```bash
   GET /albums/{albumId}/photos
   ```

---

## 🔧 Endpoints API

### 1. Obtener Información del Álbum (Público)

```http
GET /albums/:albumId/info
```

**Response:**
```json
{
  "album": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Graduación 2024",
    "event_date": "2024-12-15",
    "description": "Fotos de la ceremonia",
    "requires_access_code": true,
    "access_code_hint": "Año de graduación",
    "created_at": "2024-11-28T10:00:00Z"
  }
}
```

---

### 2. Verificar Código de Acceso (Público)

```http
POST /albums/:albumId/verify-access
Content-Type: application/json

{
  "accessCode": "GRAD2024"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "message": "Código correcto",
  "album": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Graduación 2024"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Código incorrecto",
  "hint": "Año de graduación"
}
```

**Status Codes:**
- `200` - Código correcto
- `403` - Código incorrecto
- `404` - Álbum no encontrado
- `400` - Validación fallida

---

### 3. Configurar Código de Acceso (Autenticado)

```http
PUT /albums/:id/access-code
Authorization: Bearer {token}
Content-Type: application/json

{
  "access_code": "GRAD2024",
  "requires_access_code": true,
  "access_code_hint": "Año de graduación"
}
```

**Reglas del Código:**
- **Formato:** Solo letras y números (A-Z, 0-9)
- **Longitud:** 4 a 20 caracteres
- **Case-insensitive:** `grad2024` = `GRAD2024`
- Se almacena en mayúsculas automáticamente

**Response:**
```json
{
  "message": "Código de acceso actualizado",
  "album": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Graduación 2024",
    "access_code": "GRAD2024",
    "requires_access_code": true,
    "access_code_hint": "Año de graduación"
  }
}
```

**Para Desactivar el Código:**
```json
{
  "requires_access_code": false
}
```

---

## 🗄️ Base de Datos

### Tabla: `albums`

Nuevos campos agregados:

```sql
access_code VARCHAR(50)              -- Código de acceso personalizado
requires_access_code BOOLEAN         -- Si requiere código para ver fotos
access_code_hint VARCHAR(255)        -- Pista opcional
```

### Tabla: `album_access_logs` (Auditoría)

```sql
CREATE TABLE album_access_logs (
    id UUID PRIMARY KEY,
    album_id UUID,
    access_code_entered VARCHAR(50),
    was_successful BOOLEAN,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ
);
```

---

## 💡 Casos de Uso

### 1. Álbum de Evento Escolar
```
Código: "COLEGIO2024"
Hint: "Nombre del colegio y año"
```

### 2. Graduación Específica
```
Código: "CURSO5B"
Hint: "Tu curso"
```

### 3. Evento Familiar
```
Código: "FAMILIA123"
Hint: "Apellido de la familia"
```

### 4. Boda Privada
```
Código: "JUANYMARIA"
Hint: "Nombres de los novios"
```

---

## 🔒 Seguridad

### Protecciones Implementadas:

1. **Rate Limiting**: Límite en endpoint de verificación
2. **Logging de Intentos**: Todos los intentos se registran
3. **Case-Insensitive**: Más fácil para usuarios
4. **No Exposición**: El código nunca se devuelve en GET públicos
5. **UUID Validation**: Solo IDs válidos

### Recomendaciones:

- ❌ **No usar datos personales** (DNI, teléfono, etc.)
- ✅ **Usar códigos memorables** (eventos, nombres, años)
- ✅ **Agregar hints claros**
- ✅ **Comunicar el código de forma segura**

---

## 📊 Métricas y Auditoría

Cada intento de acceso se registra con:
- ✅ Código ingresado
- ✅ Éxito/Fallo
- ✅ IP del cliente
- ✅ User Agent
- ✅ Timestamp

**Consultar intentos fallidos:**
```sql
SELECT * FROM album_access_logs
WHERE album_id = 'uuid'
  AND was_successful = false
ORDER BY attempted_at DESC
LIMIT 50;
```

---

## 🧪 Testing

### Prueba Manual:

```bash
# 1. Obtener info del álbum
curl http://localhost:3000/albums/{albumId}/info

# 2. Verificar código correcto
curl -X POST http://localhost:3000/albums/{albumId}/verify-access \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"GRAD2024"}'

# 3. Verificar código incorrecto
curl -X POST http://localhost:3000/albums/{albumId}/verify-access \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"WRONG"}'
```

---

## 🚀 Migración

Para aplicar esta funcionalidad en tu base de datos:

```bash
# Ejecutar la migración
psql -h host -U user -d database -f migrations/002_album_access_codes.sql
```

O desde Supabase Dashboard → SQL Editor → Ejecutar `002_album_access_codes.sql`

---

## 📱 Integración Frontend

### Ejemplo de Flujo:

```javascript
// 1. Cargar info del álbum
const response = await fetch(`/albums/${albumId}/info`);
const { album } = await response.json();

// 2. Si requiere código, mostrar modal
if (album.requires_access_code) {
    const code = prompt(`Ingresa el código de acceso\nPista: ${album.access_code_hint || 'Sin pista'}`);
    
    // 3. Verificar código
    const verifyResponse = await fetch(`/albums/${albumId}/verify-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code })
    });
    
    const result = await verifyResponse.json();
    
    if (result.success) {
        // 4. Código correcto - Cargar fotos
        loadPhotos(albumId);
    } else {
        alert(`Código incorrecto. ${result.hint ? 'Pista: ' + result.hint : ''}`);
    }
} else {
    // No requiere código
    loadPhotos(albumId);
}
```

---

## 🔄 Roadmap Futuro

- [ ] Códigos temporales (expiran después de X días)
- [ ] Múltiples códigos por álbum (diferentes grupos)
- [ ] Límite de intentos fallidos (bloqueo temporal)
- [ ] Notificaciones al fotógrafo de accesos
- [ ] QR codes con código embebido
- [ ] Links compartibles con código pre-aplicado
