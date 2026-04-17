const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const PLANS = require('../config/plans');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000;

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

const createOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User is required' });

    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

    const planDetails = PLANS[plan];

    // Idempotency: return existing order if same plan requested within window
    const existing = await User.findOne({ userId });
    if (
      existing?.razorpayOrderId &&
      existing?.pendingPlan === plan &&
      existing?.pendingOrderCreatedAt &&
      Date.now() - existing.pendingOrderCreatedAt.getTime() < IDEMPOTENCY_WINDOW_MS
    ) {
      return res.json({
        orderId: existing.razorpayOrderId,
        amount: planDetails.amountPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        planDetails
      });
    }

    const order = await razorpay.orders.create({
      amount: planDetails.amountPaise,
      currency: 'INR',
      receipt: userId
    });

    await User.findOneAndUpdate(
      { userId },
      { razorpayOrderId: order.id, pendingPlan: plan, pendingOrderCreatedAt: new Date() },
      { upsert: true }
    );

    res.json({
      orderId: order.id,
      amount: planDetails.amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      planDetails
    });
  } catch (error) {
    console.error('[PAYMENT] create-order error:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User is required' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'PAYMENT_VERIFICATION_FAILED' });
    }

    const user = await User.findOne({ userId });

    // Replay attack guard: already processed this payment
    if (user?.razorpayPaymentId === razorpay_payment_id) {
      return res.json({ success: true, plan: user.plan, searchLimit: user.searchLimit, subscriptionEnd: user.subscriptionEnd });
    }

    // Plan comes from DB, never from frontend
    const planKey = user?.pendingPlan;
    if (!planKey || !PLANS[planKey]) {
      return res.status(400).json({ error: 'No pending plan found. Please restart checkout.' });
    }

    const planDetails = PLANS[planKey];
    const now = new Date();
    const subscriptionEnd = new Date(now.getTime() + planDetails.durationDays * 24 * 60 * 60 * 1000);

    await User.findOneAndUpdate(
      { userId },
      {
        plan: planKey,
        searchLimit: planDetails.searchLimit,
        searchesUsed: 0,
        subscriptionStart: now,
        subscriptionEnd,
        razorpayPaymentId: razorpay_payment_id,
        pendingPlan: null,
        pendingOrderCreatedAt: null
      },
      { upsert: true }
    );

    res.json({ success: true, plan: planKey, searchLimit: planDetails.searchLimit, subscriptionEnd });
  } catch (error) {
    console.error('[PAYMENT] verify error:', error.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

const getStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'User is required' });

    const user = await User.findOne({ userId });
    if (!user) return res.json({ plan: 'free', searchLimit: 0, searchesUsed: 0, searchesRemaining: 0, isActive: false });

    const now = new Date();
    const isGrandfathered = user.plan === 'grandfathered' || user.searchLimit === -1;
    const isActive = isGrandfathered ||
      (user.plan !== 'free' && user.subscriptionEnd > now && user.searchesUsed < user.searchLimit);

    res.json({
      plan: user.plan,
      searchLimit: user.searchLimit,
      searchesUsed: user.searchesUsed,
      searchesRemaining: isGrandfathered ? -1 : Math.max(0, (user.searchLimit || 0) - (user.searchesUsed || 0)),
      subscriptionEnd: user.subscriptionEnd || null,
      isActive
    });
  } catch (error) {
    console.error('[PAYMENT] status error:', error.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ error: 'Webhook secret not configured' });

    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto
      .createHmac('sha256', secret)
      .update(req.body) // raw buffer
      .digest('hex');

    if (expected !== signature) {
      console.warn('[WEBHOOK] Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString());
    console.log(`[WEBHOOK] Event: ${event.event}`);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      const user = await User.findOne({ razorpayOrderId: orderId });
      if (!user) {
        console.warn(`[WEBHOOK] No user found for order ${orderId}`);
        return res.json({ status: 'ok' });
      }

      // Skip if already processed
      if (user.razorpayPaymentId === paymentId) return res.json({ status: 'ok' });

      const planKey = user.pendingPlan;
      if (!planKey || !PLANS[planKey]) {
        console.warn(`[WEBHOOK] No pending plan for user ${user.userId}`);
        return res.json({ status: 'ok' });
      }

      const planDetails = PLANS[planKey];
      const now = new Date();
      const subscriptionEnd = new Date(now.getTime() + planDetails.durationDays * 24 * 60 * 60 * 1000);

      await User.findOneAndUpdate(
        { userId: user.userId },
        {
          plan: planKey,
          searchLimit: planDetails.searchLimit,
          searchesUsed: 0,
          subscriptionStart: now,
          subscriptionEnd,
          razorpayPaymentId: paymentId,
          pendingPlan: null,
          pendingOrderCreatedAt: null
        }
      );
      console.log(`[WEBHOOK] Activated ${planKey} for user ${user.userId}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = { createOrder, verifyPayment, getStatus, handleWebhook };
