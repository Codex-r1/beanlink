const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const ctrl = require('../controllers/adminController');

const upload = multer({ dest: 'uploads/' });
const adminOnly = [auth, requireRole('admin')];

router.post(
  '/admin/prices/import-csv',
  upload.single('file'),
  ...adminOnly,
  ctrl.importKamisCsv
);

router.get('/admin/users', ...adminOnly, ctrl.listUsers);
router.patch('/admin/users/:id/verify', ...adminOnly, ctrl.verifyUser);
router.get('/admin/prices', ...adminOnly, ctrl.listPrices);
router.post('/admin/prices', ...adminOnly, ctrl.createPrice);
router.delete('/admin/prices/:id', ...adminOnly, ctrl.deletePrice);
router.get('/admin/reports', ...adminOnly, ctrl.listReports);
router.patch('/admin/reports/:id', ...adminOnly, ctrl.resolveReport);
router.get('/admin/stats', ...adminOnly, ctrl.getStats);

module.exports = router;