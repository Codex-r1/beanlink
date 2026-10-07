const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/dashboard/summary', auth, ctrl.getSummary);
router.get('/dashboard/activity', auth, ctrl.getActivity);

module.exports = router;