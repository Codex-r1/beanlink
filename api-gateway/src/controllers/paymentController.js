const daraja = require('../services/mpesa');
const pool = require('../config/db');

// POST /api/payments/mpesa-push
exports.initiatePayment = async (req, res) => {
  const { order_id, phone } = req.body;
  const userId = req.user.user_id;

  try {
    // 1. Verify the order exists, belongs to the user, and is pending
    const orderResult = await pool.query(
      `SELECT txn_id, total_amount FROM transactions 
       WHERE txn_id = $1 AND buyer_id = $2 AND status = 'pending'`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not eligible for payment' });
    }

    const order = orderResult.rows[0];
    const amount = Math.round(Number(order.total_amount)); // Daraja requires integer KES

    // 2. Initiate STK Push
const push = await daraja.stkPush({
  transactionType: "CustomerPayBillOnline",
  amount: Math.round(Number(order.total_amount)),
  partyA: phone,        // ← customer's phone number (debited)
  phoneNumber: phone,   // ← where STK prompt goes (usually same)
  accountReference: `ORD-${order_id}`,
  transactionDesc: "BeanLink",
});

    // 3. Store the CheckoutRequestID for later matching
    await pool.query(
      `UPDATE transactions SET payment_ref = $1, payment_status = 'initiated' WHERE txn_id = $2`,
      [push.CheckoutRequestID, order_id]
    );

    res.json({ checkout_request_id: push.CheckoutRequestID });
  } catch (err) {
    console.error('initiatePayment error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

// POST /api/mpesa/callback
exports.mpesaCallback = async (req, res) => {
  // Safaricom expects a fast ACK, so we respond immediately and process async
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) return;

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callbackData;

    if (ResultCode === 0) {
      // Success — extract the M-Pesa receipt number
      const receipt = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber')?.Value;
      
      await pool.query(
        `UPDATE transactions 
         SET status = 'confirmed', payment_status = 'paid', mpesa_receipt = $1 
         WHERE payment_ref = $2`,
        [receipt, CheckoutRequestID]
      );
    } else {
      // Failed, cancelled, or timeout
      await pool.query(
        `UPDATE transactions SET payment_status = 'failed' WHERE payment_ref = $1`,
        [CheckoutRequestID]
      );
    }
  } catch (err) {
    console.error('mpesaCallback processing error:', err);
  }
};