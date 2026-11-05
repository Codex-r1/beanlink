const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/listingController');
const optionalAuth = require('../middleware/optionalAuth');

router.get('/marketplace/listings', optionalAuth, ctrl.getMarketplace);
// Public
router.get('/marketplace/listings', ctrl.getMarketplace);
router.get('/listings/mine', auth, ctrl.getMine);           
router.post('/listings', auth, ctrl.create);

// Parameterised
router.get('/listings/:id', ctrl.getOne);
router.patch('/listings/:id', auth, ctrl.update);
router.patch('/listings/:id/status', auth, ctrl.updateStatus);
router.delete('/listings/:id', auth, ctrl.remove);

module.exports = router;