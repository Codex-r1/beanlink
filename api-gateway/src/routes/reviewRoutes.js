const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/reviewController');

router.post('/reviews', auth, ctrl.create);
router.get('/reviews/user/:userId', ctrl.getForUser);
router.get('/reviews/user/:userId/summary', ctrl.getSummary);
router.get('/reviews/order/:txnId', auth, ctrl.getForOrder);

module.exports = router;