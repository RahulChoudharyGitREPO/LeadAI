const User = require('../models/User');

const FREE_SEARCH_LIMIT = 2;
const FREE_RESULTS_LIMIT = 3;
const PAID_RESULTS_LIMIT = 20;

async function checkSubscription(userId) {
  let user = await User.findOne({ userId });

  // Auto-create new users as free plan
  if (!user) {
    user = await User.create({ userId, plan: 'free', searchLimit: FREE_SEARCH_LIMIT, searchesUsed: 0 });
  }

  // Grandfathered = unlimited, full results
  if (user.plan === 'grandfathered' || user.searchLimit === -1) {
    return { allowed: true, resultsLimit: PAID_RESULTS_LIMIT };
  }

  // Paid plans: check expiry with 60s grace buffer
  const GRACE_MS = 60 * 1000;
  if (user.plan !== 'free') {
    if (!user.subscriptionEnd || user.subscriptionEnd.getTime() + GRACE_MS < Date.now()) {
      return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' };
    }
  }

  const effectiveLimit = user.plan === 'free' ? FREE_SEARCH_LIMIT : user.searchLimit;

  // Atomic increment — only succeeds if under the limit
  const updated = await User.findOneAndUpdate(
    { userId, searchesUsed: { $lt: effectiveLimit } },
    { $inc: { searchesUsed: 1, searchCount: 1 } },
    { new: true }
  );

  if (!updated) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_REQUIRED',
      searchesUsed: user.searchesUsed,
      searchLimit: effectiveLimit
    };
  }

  const resultsLimit = user.plan === 'free' ? FREE_RESULTS_LIMIT : PAID_RESULTS_LIMIT;
  const searchesRemaining = effectiveLimit - updated.searchesUsed;
  const usageRatio = updated.searchesUsed / effectiveLimit;
  const warning = user.plan !== 'free' && usageRatio >= 0.8 ? 'NEARING_LIMIT' : null;

  return { allowed: true, resultsLimit, isFree: user.plan === 'free', searchesRemaining, ...(warning && { warning }) };
}

module.exports = { checkSubscription };
