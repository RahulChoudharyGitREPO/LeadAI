const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getStatus } = require('../controllers/paymentController');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/status', getStatus);

module.exports = router;
