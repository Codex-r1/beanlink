const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/priceController');

router.get('/prices', ctrl.getPrices);
router.get('/prices/latest', ctrl.getLatest);

module.exports = router;