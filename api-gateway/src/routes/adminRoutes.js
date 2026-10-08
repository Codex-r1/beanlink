const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const ctrl = require('../controllers/adminController');

router.use('/admin', auth, requireRole('admin'));

router.get('/admin/users', ctrl.listUsers);
router.patch('/admin/users/:id/verify', ctrl.verifyUser);

router.get('/admin/prices', ctrl.listPrices);
router.post('/admin/prices', ctrl.createPrice);
router.delete('/admin/prices/:id', ctrl.deletePrice);

router.get('/admin/reports', ctrl.listReports);
router.patch('/admin/reports/:id', ctrl.resolveReport);
router.get('/admin/stats', ctrl.getStats);
module.exports = router;