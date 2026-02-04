# SchoolSnap

Este proyecto es una plataforma para gestionar fotos escolares con un backend en Node.js y un panel web de administración. Incluye páginas públicas, login de fotógrafos y un panel con métricas y pedidos.

Para correrlo en local, instalá dependencias con npm install, configurá tu .env y luego ejecutá npm start.

```bash
# Modo desarrollo
npm start

# Verificar variables de entorno
node scripts/check-env.js
```

## Scripts Disponibles

```bash
npm start              # Inicia el servidor principal
npm run backup         # Ejecuta backup de la base de datos
npm run test:security  # Ejecuta tests de seguridad
```
- Helmet configurado para headers de seguridad
- Rate limiting en endpoints críticos
- Autenticación con JWT
- Variables sensibles en `.env` (no versionado)

## Dependencias Principales

- **Express** - Framework web
- **Supabase** - Base de datos y almacenamiento
- **Mercado Pago** - Procesamiento de pagos

---

**Nota**: Este proyecto fue reorganizado para seguir mejores prácticas de estructura de proyecto Node.js/Express.
