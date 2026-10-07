const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

router.post('/payments/mpesa-push', auth, ctrl.initiatePayment);
router.post('/payments/callback', ctrl.mpesaCallback);
module.exports = router;