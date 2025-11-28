// metrics.js - Sistema de métricas del servidor
const metrics = {
    startTime: Date.now(),
    requests: {
        total: 0,
        byEndpoint: {},
        byStatusCode: {},
    },
    errors: {
        total: 0,
        byType: {},
    },
    photos: {
        uploaded: 0,
        downloaded: 0,
    },
    albums: {
        created: 0,
    },
    orders: {
        created: 0,
        paid: 0,
    },
    responseTimes: [],
};

/**
 * Incrementa contador de requests
 */
function incrementRequest(path) {
    metrics.requests.total++;
    metrics.requests.byEndpoint[path] = (metrics.requests.byEndpoint[path] || 0) + 1;
}

/**
 * Registra status code de respuesta
 */
function recordStatusCode(statusCode) {
    metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1;
}

/**
 * Registra tiempo de respuesta
 */
function recordResponseTime(duration) {
    metrics.responseTimes.push(duration);
    if (metrics.responseTimes.length > 100) {
        metrics.responseTimes.shift();
    }
}

/**
 * Registra un error
 */
function recordError(errorType) {
    metrics.errors.total++;
    metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
}

/**
 * Incrementa contador de fotos subidas
 */
function incrementPhotoUploaded() {
    metrics.photos.uploaded++;
}

/**
 * Incrementa contador de fotos descargadas
 */
function incrementPhotoDownloaded() {
    metrics.photos.downloaded++;
}

/**
 * Incrementa contador de álbumes creados
 */
function incrementAlbumCreated() {
    metrics.albums.created++;
}

/**
 * Incrementa contador de órdenes creadas
 */
function incrementOrderCreated() {
    metrics.orders.created++;
}

/**
 * Incrementa contador de órdenes pagadas
 */
function incrementOrderPaid() {
    metrics.orders.paid++;
}

/**
 * Obtiene todas las métricas
 */
function getMetrics() {
    return { ...metrics };
}

module.exports = {
    metrics,
    incrementRequest,
    recordStatusCode,
    recordResponseTime,
    recordError,
    incrementPhotoUploaded,
    incrementPhotoDownloaded,
    incrementAlbumCreated,
    incrementOrderCreated,
    incrementOrderPaid,
    getMetrics,
};
