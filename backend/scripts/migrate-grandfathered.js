/**
 * One-time migration: grandfather all existing users.
 * Run once after deploying Razorpay subscription feature:
 *   node backend/scripts/migrate-grandfathered.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await User.updateMany(
    { plan: { $exists: false } },
    { $set: { plan: 'grandfathered', searchLimit: -1, searchesUsed: 0 } }
  );
  console.log(`Grandfathered ${result.modifiedCount} existing users`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
