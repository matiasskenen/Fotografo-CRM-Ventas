// validate-env.js - Script para validar todas las variables de entorno
require('dotenv').config();

// Usar el validador centralizado
const { checkEnvironmentOrExit, getEnvSummary } = require('../src/utils/envValidator');

// Ejecutar validación completa
checkEnvironmentOrExit();

// Mostrar resumen (enmascarado)
console.log("📋 RESUMEN DE CONFIGURACIÓN:");
const summary = getEnvSummary();

console.log("\n🔐 Supabase:");
console.log(`   URL: ${summary.supabase.url}`);
console.log(`   Anon Key: ${summary.supabase.anonKey}`);
console.log(`   Service Role: ${summary.supabase.serviceRoleKey}`);

console.log("\n💳 MercadoPago:");
console.log(`   Access Token: ${summary.mercadopago.accessToken}`);
console.log(`   Webhook Secret: ${summary.mercadopago.webhookSecret}`);

console.log("\n🌐 URLs:");
console.log(`   Frontend: ${summary.urls.frontend}`);
console.log(`   Backend: ${summary.urls.backend}`);

console.log("\n🔑 JWT:");
console.log(`   Secret: ${summary.jwt.secret}`);

console.log("\n⚙️  Configuración:");
console.log(`   Environment: ${summary.config.nodeEnv}`);
console.log(`   Port: ${summary.config.port}`);
console.log(`   Log Level: ${summary.config.logLevel}`);

console.log("\n✅ Todas las validaciones pasaron correctamente.\n");
