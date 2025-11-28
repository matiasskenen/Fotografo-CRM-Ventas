// orders.routes.js - Rutas de gestión de órdenes
const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { requireAuth } = require("../middleware/auth");
const { validate, orderDetailsSchema } = require("../middleware/validation");

// GET /orders/details/:orderId/:customerEmail - Obtener detalles de orden (público)
router.get("/details/:orderId/:customerEmail", validate(orderDetailsSchema), orderController.getOrderDetails);

// GET /orders - Obtener todos los pedidos del fotógrafo
router.get("/", requireAuth, orderController.getOrders);

// DELETE /orders/all - Eliminar todos los pedidos
router.delete("/all", requireAuth, orderController.deleteAllOrders);

// DELETE /orders/:id - Eliminar pedido específico
router.delete("/:id", requireAuth, orderController.deleteOrder);

module.exports = router;
