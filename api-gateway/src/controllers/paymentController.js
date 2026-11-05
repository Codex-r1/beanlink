const daraja = require('../services/mpesa');
const pool = require('../config/db');

/* ============================================================================
   POST /api/payments/mpesa-push
   ========================================================================== */
exports.initiatePayment = async (req, res) => {
  const { order_id, phone } = req.body;
  const userId = req.user.user_id;

  try {
    const orderResult = await pool.query(
      `SELECT txn_id, total_amount, payment_status, payment_ref
         FROM transactions
        WHERE txn_id = $1 AND buyer_id = $2 AND status = 'pending'`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or not eligible for payment' });
    }

    const order = orderResult.rows[0];

    // If this order already has an STK Push in flight, do not fire another one.
    // Return the existing CheckoutRequestID so the client can resume polling.
    if (order.payment_status === 'initiated' && order.payment_ref) {
      return res.status(200).json({
        checkout_request_id: order.payment_ref,
        reused: true,
      });
    }

    const amount = Math.round(Number(order.total_amount));

    const push = await daraja.stkPush({
      transactionType: 'CustomerPayBillOnline',
      amount,
      partyA: phone,
      phoneNumber: phone,
      accountReference: `ORD-${order_id}`.slice(0, 12),
      transactionDesc: `Order ${order_id}`.slice(0, 13),
    });

    await pool.query(
      `UPDATE transactions
          SET payment_ref = $1, payment_status = 'initiated'
        WHERE txn_id = $2`,
      [push.CheckoutRequestID, order_id]
    );

    res.json({
      checkout_request_id: push.CheckoutRequestID,
      reused: false,
    });
  } catch (err) {
    console.error('initiatePayment error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

/* ============================================================================
   POST /api/mpesa/callback
   Idempotent: duplicate callbacks for the same CheckoutRequestID are ignored.
   ========================================================================== */
exports.mpesaCallback = async (req, res) => {
  // ACK immediately so Safaricom doesn't retry on our processing time
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) return;

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callbackData;

    // Look up the transaction by CheckoutRequestID
    const existing = await pool.query(
      `SELECT payment_status FROM transactions WHERE payment_ref = $1`,
      [CheckoutRequestID]
    );

    if (existing.rows.length === 0) {
      console.warn('Callback received for unknown CheckoutRequestID:', CheckoutRequestID);
      return;
    }

    if (existing.rows[0].payment_status === 'paid') {
      // Already processed — ignore this duplicate.
      console.log('Duplicate callback ignored for:', CheckoutRequestID);
      return;
    }

    if (ResultCode === 0) {
      const receipt = CallbackMetadata?.Item?.find(
        (i) => i.Name === 'MpesaReceiptNumber'
      )?.Value;

      await pool.query(
        `UPDATE transactions
            SET status = 'confirmed',
                payment_status = 'paid',
                mpesa_receipt = $1
          WHERE payment_ref = $2 AND payment_status <> 'paid'`,
        [receipt, CheckoutRequestID]
      );
    } else {
      // Non-zero ResultCode means the payment did not complete.
      await pool.query(
        `UPDATE transactions
            SET payment_status = 'failed'
          WHERE payment_ref = $1 AND payment_status <> 'paid'`,
        [CheckoutRequestID]
      );
    }
  } catch (err) {
    console.error('mpesaCallback processing error:', err);
  }
};