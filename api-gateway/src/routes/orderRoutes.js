const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

router.get('/orders', auth, ctrl.getOrders);
router.get('/orders/:id', auth, ctrl.getOne);
router.post('/orders', auth, ctrl.create);
router.patch('/orders/:id/status', auth, ctrl.updateStatus);
router.get('/orders/:id/payment-status', auth, ctrl.getPaymentStatus);
module.exports = router;