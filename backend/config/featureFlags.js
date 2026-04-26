// backend/config/featureFlags.js
// Central place for feature‑flags that can be toggled via environment variables.

module.exports = {
  // When true the system uses BullMQ queues. When false the discovery pipeline
  // runs directly as an async background task (no Redis required).
  USE_QUEUE: process.env.USE_QUEUE === 'false'
};
