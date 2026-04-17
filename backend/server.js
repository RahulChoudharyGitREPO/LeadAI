require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require("socket.io");

const leadsRoutes = require('./routes/leads');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const supportRoutes = require('./routes/support');
const trackActivity = require('./middleware/activity');

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  if (userId) {
    socket.join(userId);
  }
});

// Middleware
app.use(cors());

// Razorpay webhook needs raw body — must be registered BEFORE bodyParser.json()
const { handleWebhook } = require('./controllers/paymentController');
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(bodyParser.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// Activity tracking middleware (runs on every request)
app.use('/api', trackActivity);

// Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/support', supportRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadapp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
