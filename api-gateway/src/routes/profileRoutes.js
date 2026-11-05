const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/profileController');

router.get('/profile', auth, ctrl.getProfile);
router.patch('/profile', auth, ctrl.updateProfile);

module.exports = router;