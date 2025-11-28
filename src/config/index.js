// index.js - Archivo central de configuración
module.exports = {
    // Database
    ...require('./database'),
    
    // MercadoPago
    mercadopago: require('./mercadopago'),
    
    // Multer (upload)
    ...require('./multer'),
};
