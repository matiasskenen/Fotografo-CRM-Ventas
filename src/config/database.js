// database.js - Configuración de Supabase
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verificación de variables de entorno necesarias
if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error("❌ Error: Faltan variables de entorno de Supabase");
    console.error("SUPABASE_URL:", supabaseUrl ? "✅" : "❌");
    console.error("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✅" : "❌");
    console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "✅" : "❌");
    process.exit(1);
}

// Cliente de Supabase con clave anónima (para operaciones públicas)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente de Supabase con Service Role Key (para operaciones administrativas)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Nombres de los buckets de almacenamiento
const ORIGINAL_BUCKET_NAME = "original-photos";
const WATERMARKED_BUCKET_NAME = "watermarked-photos";
const ORDER_FIELD_NAME = "order_id";

module.exports = {
    supabase,
    supabaseAdmin,
    ORIGINAL_BUCKET_NAME,
    WATERMARKED_BUCKET_NAME,
    ORDER_FIELD_NAME,
};
