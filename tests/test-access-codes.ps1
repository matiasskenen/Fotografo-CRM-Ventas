# 🧪 Scripts de Prueba - Códigos de Acceso

## PowerShell Commands

### 1. Verificar que el servidor esté corriendo
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/status" | Select-Object StatusCode
```

### 2. Obtener información de un álbum (reemplazar {albumId})
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/albums/{albumId}/info" | Select-Object -ExpandProperty Content
```

### 3. Verificar código de acceso - CORRECTO
```powershell
$albumId = "tu-album-id-aqui"
$body = '{"accessCode":"TEST123"}'
Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/verify-access" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content
```

### 4. Verificar código de acceso - INCORRECTO (para probar)
```powershell
$albumId = "tu-album-id-aqui"
$body = '{"accessCode":"WRONG123"}'
try {
    Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/verify-access" -Method POST -Body $body -ContentType "application/json"
} catch {
    $_.ErrorDetails.Message
}
```

### 5. Configurar código de acceso (requiere autenticación)
```powershell
$albumId = "tu-album-id-aqui"
$token = "tu-jwt-token-aqui"
$body = @{
    access_code = "GRAD2024"
    requires_access_code = $true
    access_code_hint = "Año de graduación"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/access-code" -Method PUT -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $token"} | Select-Object -ExpandProperty Content
```

### 6. Desactivar código de acceso
```powershell
$albumId = "tu-album-id-aqui"
$token = "tu-jwt-token-aqui"
$body = @{
    requires_access_code = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/access-code" -Method PUT -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $token"} | Select-Object -ExpandProperty Content
```

## 📊 Ver Logs de Acceso en Supabase

```sql
-- Ver últimos 20 intentos de acceso
SELECT 
    al.attempted_at,
    al.was_successful,
    al.access_code_entered,
    al.ip_address,
    a.name as album_name
FROM album_access_logs al
JOIN albums a ON al.album_id = a.id
ORDER BY al.attempted_at DESC
LIMIT 20;

-- Ver intentos fallidos de un álbum específico
SELECT 
    attempted_at,
    access_code_entered,
    ip_address
FROM album_access_logs
WHERE album_id = 'tu-album-id'
  AND was_successful = false
ORDER BY attempted_at DESC;
```

## 🎯 Flujo Completo de Prueba

```powershell
# 1. Obtener lista de álbumes (requiere auth)
$token = "tu-jwt-token"
Invoke-WebRequest -Uri "http://localhost:3000/albums" -Headers @{Authorization="Bearer $token"} | Select-Object -ExpandProperty Content

# 2. Guardar un albumId
$albumId = "album-id-obtenido-arriba"

# 3. Ver info del álbum
Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/info" | Select-Object -ExpandProperty Content

# 4. Configurar código (como fotógrafo)
$body = '{"access_code":"EVENTO2024","requires_access_code":true,"access_code_hint":"Nombre del evento y año"}'
Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/access-code" -Method PUT -Body $body -ContentType "application/json" -Headers @{Authorization="Bearer $token"} | Select-Object -ExpandProperty Content

# 5. Probar acceso como cliente (código correcto)
$body = '{"accessCode":"EVENTO2024"}'
Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/verify-access" -Method POST -Body $body -ContentType "application/json" | Select-Object -ExpandProperty Content

# 6. Probar acceso como cliente (código incorrecto)
$body = '{"accessCode":"WRONG"}'
try {
    Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/verify-access" -Method POST -Body $body -ContentType "application/json"
} catch {
    Write-Host "Error (esperado):"
    $_.ErrorDetails.Message
}

# 7. Si el código es correcto, obtener fotos
Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/photos" | Select-Object -ExpandProperty Content
```

## 🔍 Debugging

### Ver respuesta completa con headers
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/info"
$response | Select-Object StatusCode, StatusDescription, Headers, Content
```

### Ver solo el status code
```powershell
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/albums/$albumId/verify-access" -Method POST -Body $body -ContentType "application/json"
    Write-Host "Success: $($response.StatusCode)"
} catch {
    Write-Host "Error: $($_.Exception.Response.StatusCode.value__)"
}
```
