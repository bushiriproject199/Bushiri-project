const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Bushiri Hotspot Backend inafanya kazi!' });
});

// M-Pesa verification route
app.post('/verify', (req, res) => {
  const { txid, mac } = req.body;
  if (!txid || !mac) {
    return res.status(400).json({ success: false, message: 'Tuma txid na mac' });
  }
  // Tutaongeza logic hapa baadaye
  res.json({ success: true, message: 'Verified', mac, txid });
});app.get('/heartbeat', (req, res) => {
  res.json({
    status: 'ok',
    project: 'BUSHIRI',
    version: '2.0.0',
    time: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server inaendesha port ${PORT}`);
});
