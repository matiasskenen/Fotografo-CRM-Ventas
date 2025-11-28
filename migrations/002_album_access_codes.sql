-- =====================================================
-- MIGRACIÓN: AGREGAR CÓDIGOS DE ACCESO A ÁLBUMES
-- =====================================================

-- Agregar campo access_code a la tabla albums
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS access_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS requires_access_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS access_code_hint VARCHAR(255);

-- Índice para búsquedas por código de acceso
CREATE INDEX IF NOT EXISTS idx_albums_access_code ON albums(access_code) WHERE access_code IS NOT NULL;

-- Comentarios de documentación
COMMENT ON COLUMN albums.access_code IS 'Código de acceso personalizado creado por el fotógrafo para proteger el álbum';
COMMENT ON COLUMN albums.requires_access_code IS 'Si es true, los usuarios deben ingresar el código antes de ver las fotos';
COMMENT ON COLUMN albums.access_code_hint IS 'Pista opcional para ayudar a los usuarios a recordar el código';

-- =====================================================
-- TABLA: album_access_logs (opcional - auditoría)
-- =====================================================
-- Registra intentos de acceso a álbumes protegidos

CREATE TABLE IF NOT EXISTS album_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
    
    -- Datos del intento
    access_code_entered VARCHAR(50),
    was_successful BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT fk_album FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_album_access_logs_album ON album_access_logs(album_id);
CREATE INDEX IF NOT EXISTS idx_album_access_logs_attempted_at ON album_access_logs(attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_access_logs_failed ON album_access_logs(album_id, was_successful, attempted_at DESC) 
    WHERE was_successful = false;

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para generar código de acceso aleatorio
CREATE OR REPLACE FUNCTION generate_access_code(length INT DEFAULT 8)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sin caracteres confusos (I, O, 0, 1)
    result VARCHAR := '';
    i INT;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar código de acceso
CREATE OR REPLACE FUNCTION verify_album_access_code(
    p_album_id UUID,
    p_access_code VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_stored_code VARCHAR;
    v_requires_code BOOLEAN;
BEGIN
    -- Obtener configuración del álbum
    SELECT access_code, requires_access_code
    INTO v_stored_code, v_requires_code
    FROM albums
    WHERE id = p_album_id;
    
    -- Si no existe el álbum
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Si no requiere código
    IF NOT v_requires_code THEN
        RETURN true;
    END IF;
    
    -- Verificar código (case-insensitive)
    RETURN UPPER(v_stored_code) = UPPER(p_access_code);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- POLÍTICA RLS PARA ÁLBUMES CON CÓDIGO
-- =====================================================

-- Nota: Las políticas RLS existentes deben modificarse para considerar access_code
-- Esto se debe hacer manualmente según tu configuración actual de RLS

-- Ejemplo de política para lectura pública con código:
-- CREATE POLICY "Albums públicos o con código correcto"
-- ON albums FOR SELECT
-- USING (
--     is_public = true OR
--     (requires_access_code = false) OR
--     (requires_access_code = true AND verify_album_access_code(id, current_setting('app.access_code', true)))
-- );

-- =====================================================
-- DATOS DE EJEMPLO (comentado)
-- =====================================================

-- Ejemplo: Crear álbum con código de acceso
-- INSERT INTO albums (name, event_date, photographer_id, access_code, requires_access_code, access_code_hint)
-- VALUES (
--     'Graduación 2024', 
--     '2024-12-15', 
--     'uuid-del-fotografo',
--     'GRAD2024',
--     true,
--     'Año de graduación'
-- );

-- =====================================================
-- ROLLBACK (si es necesario)
-- =====================================================

-- Para revertir esta migración:
-- DROP TABLE IF EXISTS album_access_logs CASCADE;
-- DROP FUNCTION IF EXISTS generate_access_code(INT);
-- DROP FUNCTION IF EXISTS verify_album_access_code(UUID, VARCHAR);
-- ALTER TABLE albums DROP COLUMN IF EXISTS access_code;
-- ALTER TABLE albums DROP COLUMN IF EXISTS requires_access_code;
-- ALTER TABLE albums DROP COLUMN IF EXISTS access_code_hint;
