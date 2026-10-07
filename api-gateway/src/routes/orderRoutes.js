const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.get('/orders', auth, ctrl.getOrders);
router.get('/orders/:id', auth, ctrl.getOne);
router.get('/orders/:id/payment-status', auth, ctrl.getPaymentStatus);
router.post('/orders', auth, ctrl.create);
router.patch('/orders/:id/status', auth, ctrl.updateStatus);
router.patch('/orders/:id/fulfillment', auth, ctrl.setFulfillment);
router.patch('/orders/:id/seller-advance', auth, ctrl.sellerAdvance);
router.patch('/orders/:id/confirm-receipt', auth, ctrl.buyerConfirm);

module.exports = router;