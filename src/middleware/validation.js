// validation.js - Middleware de validación con Joi
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Middleware genérico de validación
 * @param {Object} schema - Schema de Joi con body, query, params
 */
function validate(schema) {
    return (req, res, next) => {
        const toValidate = {};
        
        if (schema.body) toValidate.body = req.body;
        if (schema.query) toValidate.query = req.query;
        if (schema.params) toValidate.params = req.params;
        
        const { error } = Joi.object(schema).validate(toValidate, {
            abortEarly: false, // Mostrar todos los errores
            allowUnknown: true, // Permitir campos adicionales
            stripUnknown: false, // No eliminar campos desconocidos
        });
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));
            
            logger.warn('Validación fallida', {
                path: req.path,
                method: req.method,
                errors,
            });
            
            return res.status(400).json({
                message: 'Errores de validación',
                errors,
            });
        }
        
        next();
    };
}

// ===== SCHEMAS DE VALIDACIÓN =====

/**
 * Schema para crear álbum
 */
const createAlbumSchema = {
    body: Joi.object({
        name: Joi.string()
            .min(3)
            .max(100)
            .required()
            .messages({
                'string.empty': 'El nombre del álbum es requerido',
                'string.min': 'El nombre debe tener al menos 3 caracteres',
                'string.max': 'El nombre no puede tener más de 100 caracteres',
            }),
        
        event_date: Joi.date()
            .iso()
            .required()
            .messages({
                'date.base': 'La fecha del evento debe ser válida',
                'any.required': 'La fecha del evento es requerida',
            }),
        
        description: Joi.string()
            .max(500)
            .allow('', null)
            .messages({
                'string.max': 'La descripción no puede tener más de 500 caracteres',
            }),
        
        price_per_photo: Joi.number()
            .min(0)
            .max(1000000)
            .allow(null)
            .messages({
                'number.min': 'El precio no puede ser negativo',
                'number.max': 'El precio es demasiado alto',
            }),
    }),
};

/**
 * Schema para actualizar álbum
 */
const updateAlbumSchema = {
    params: Joi.object({
        id: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de álbum inválido',
            }),
    }),
    body: Joi.object({
        name: Joi.string().min(3).max(100),
        event_date: Joi.date().iso(),
        description: Joi.string().max(500).allow('', null),
        price_per_photo: Joi.number().min(0).max(1000000).allow(null),
    }).min(1), // Al menos un campo debe estar presente
};

/**
 * Schema para ID de álbum en params
 */
const albumIdSchema = {
    params: Joi.object({
        albumId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de álbum inválido',
            }),
    }),
};

/**
 * Schema para subir fotos
 */
const uploadPhotosSchema = {
    params: Joi.object({
        albumId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de álbum inválido',
            }),
    }),
};

/**
 * Schema para descargar foto
 */
const downloadPhotoSchema = {
    params: Joi.object({
        photoId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de foto inválido',
            }),
        orderId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de orden inválido',
            }),
        customerEmail: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Email inválido',
            }),
    }),
};

/**
 * Schema para obtener detalles de orden
 */
const orderDetailsSchema = {
    params: Joi.object({
        orderId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de orden inválido',
            }),
        customerEmail: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Email inválido',
            }),
    }),
};

/**
 * Schema para crear preferencia de pago
 */
const createPaymentPreferenceSchema = {
    body: Joi.object({
        photoIds: Joi.array()
            .items(Joi.string().uuid())
            .min(1)
            .required()
            .messages({
                'array.min': 'Debe seleccionar al menos una foto',
                'any.required': 'La lista de fotos es requerida',
            }),
        
        customerEmail: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Email inválido',
                'any.required': 'El email del cliente es requerido',
            }),
        
        customerName: Joi.string()
            .min(2)
            .max(100)
            .required()
            .messages({
                'string.min': 'El nombre debe tener al menos 2 caracteres',
                'any.required': 'El nombre del cliente es requerido',
            }),
    }),
};

/**
 * Schema para simular pago
 */
const simulatePaymentSchema = {
    body: Joi.object({
        orderId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de orden inválido',
            }),
    }),
};

/**
 * Schema para configurar nivel de log
 */
const setLogLevelSchema = {
    body: Joi.object({
        level: Joi.string()
            .valid('DEBUG', 'INFO', 'WARN', 'ERROR')
            .required()
            .messages({
                'any.only': 'El nivel debe ser: DEBUG, INFO, WARN o ERROR',
            }),
    }),
};

/**
 * Schema para configurar console logging
 */
const setConsoleLoggingSchema = {
    body: Joi.object({
        enabled: Joi.boolean()
            .required()
            .messages({
                'boolean.base': 'El valor debe ser true o false',
            }),
    }),
};

/**
 * Schema para obtener logs con filtros
 */
const getLogsSchema = {
    query: Joi.object({
        level: Joi.string().valid('DEBUG', 'INFO', 'WARN', 'ERROR'),
        limit: Joi.number().integer().min(1).max(1000).default(100),
    }),
};

/**
 * Schema para crear test album
 */
const createTestAlbumSchema = {
    body: Joi.object({
        photographerId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de fotógrafo inválido',
            }),
    }),
};

/**
 * Schema para simular error
 */
const simulateErrorSchema = {
    query: Joi.object({
        type: Joi.string()
            .valid('400', '404', '500')
            .default('500')
            .messages({
                'any.only': 'El tipo debe ser: 400, 404 o 500',
            }),
    }),
};

/**
 * Schema para slow endpoint
 */
const slowEndpointSchema = {
    query: Joi.object({
        delay: Joi.number()
            .integer()
            .min(0)
            .max(30000)
            .default(3000)
            .messages({
                'number.max': 'El delay máximo es 30 segundos',
            }),
    }),
};

/**
 * Schema para verificar código de acceso
 */
const verifyAccessCodeSchema = {
    params: Joi.object({
        albumId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de álbum inválido',
            }),
    }),
    body: Joi.object({
        accessCode: Joi.string()
            .min(4)
            .max(50)
            .required()
            .messages({
                'string.min': 'El código debe tener al menos 4 caracteres',
                'string.max': 'El código es demasiado largo',
                'any.required': 'El código de acceso es requerido',
            }),
    }),
};

/**
 * Schema para actualizar código de acceso
 */
const updateAccessCodeSchema = {
    params: Joi.object({
        id: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.guid': 'ID de álbum inválido',
            }),
    }),
    body: Joi.object({
        access_code: Joi.string()
            .pattern(/^[A-Za-z0-9]{4,20}$/)
            .allow(null, '')
            .messages({
                'string.pattern.base': 'El código debe tener entre 4 y 20 caracteres alfanuméricos',
            }),
        requires_access_code: Joi.boolean(),
        access_code_hint: Joi.string()
            .max(255)
            .allow(null, '')
            .messages({
                'string.max': 'La pista no puede tener más de 255 caracteres',
            }),
    }).min(1), // Al menos un campo debe estar presente
};

// Exportar middleware y schemas
module.exports = {
    validate,
    
    // Schemas de álbumes
    createAlbumSchema,
    updateAlbumSchema,
    albumIdSchema,
    verifyAccessCodeSchema,
    updateAccessCodeSchema,
    
    // Schemas de fotos
    uploadPhotosSchema,
    downloadPhotoSchema,
    
    // Schemas de órdenes
    orderDetailsSchema,
    
    // Schemas de pagos
    createPaymentPreferenceSchema,
    simulatePaymentSchema,
    
    // Schemas de monitoreo
    setLogLevelSchema,
    setConsoleLoggingSchema,
    getLogsSchema,
    
    // Schemas de admin/testing
    createTestAlbumSchema,
    simulateErrorSchema,
    slowEndpointSchema,
};
