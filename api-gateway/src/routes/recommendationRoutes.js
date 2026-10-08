const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/recommendationController');

router.post('/recommendations', auth, ctrl.getRecommendation);

module.exports = router;