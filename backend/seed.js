require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leadapp';

const dummyLeads = [
  {
    name: 'Alex Thompson',
    service: 'Enterprise AI',
    date: '2026-04-20',
    location: 'New York',
    phone: '+1 555 0101',
    status: 'new',
    leadScore: 'Hot',
    notes: [{ text: 'Expressed urgent need for AI integration.' }]
  },
  {
    name: 'Sarah Miller',
    service: 'SaaS Development',
    date: '2026-04-22',
    phone: '+1 555 0102',
    status: 'contacted',
    leadScore: 'Warm',
    notes: [{ text: 'Follow-up sent. Waiting for response.' }]
  },
  {
    name: 'Michael Chen',
    service: 'Consulting',
    date: '2026-04-18',
    location: 'San Francisco',
    phone: '+1 555 0103',
    status: 'booked',
    leadScore: 'Hot',
    notes: [{ text: 'Meeting confirmed for next Thursday.' }]
  },
  {
    name: 'Elena Rodriguez',
    service: 'AI Chatbot',
    date: '2026-05-01',
    phone: '+1 555 0104',
    status: 'new',
    leadScore: 'Cold',
    notes: [{ text: 'Just browsing for now.' }]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');
    
    await Lead.deleteMany({});
    console.log('Cleared existing leads.');
    
    await Lead.insertMany(dummyLeads);
    console.log('Successfully seeded database with dummy leads!');
    
    process.exit();
  } catch (err) {
    console.error('Seeding Error:', err);
    process.exit(1);
  }
}

seed();
