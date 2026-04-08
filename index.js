

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hifadhi ya muda - MAC zilizoidhinishwa na malipo
const authorizedMACs = new Map();
const pendingPayments = new Map();

// ==================== ROUTES ====================

// Home
app.get('/', (req, res) => {
  res.json({ message: 'Bushiri Hotspot Backend inafanya kazi!' });
});

// Heartbeat - ESP32 inauliza kama VPS iko hai
app.get('/heartbeat', (req, res) => {
  res.json({
    status: 'ok',
    project: 'BUSHIRI',
    version: '2.0.0',
    time: new Date().toISOString(),
    authorizedCount: authorizedMACs.size
  });
});

// SMS Callback - Africa's Talking inatuma SMS hapa
app.post('/sms', (req, res) => {
  try {
    const { from, text, date } = req.body;
    console.log('SMS Imeingia:', { from, text, date });

    // Angalia kama ni SMS ya M-Pesa
    // Mfano wa SMS ya M-Pesa Tanzania:
    // "Umetuma TZS 1,000 kwa BUSHIRI HOTSPOT. Nambari ya Muamala: ABC123456"
    
    const smsText = text ? text.toUpperCase() : '';
    
    // Tafuta nambari ya muamala (Transaction ID)
    // M-Pesa Tanzania format: herufi na namba
    const txMatch = smsText.match(/([A-Z0-9]{8,12})/g);
    const amountMatch = smsText.match(/TZS\s*([\d,]+)/i) || 
                        smsText.match(/(\d[\d,]+)\s*TZS/i) ||
                        smsText.match(/SHILINGI\s*([\d,]+)/i);

    if (txMatch && amountMatch) {
      const txid = txMatch[0];
      const amountStr = amountMatch[1].replace(/,/g, '');
      const amount = parseInt(amountStr);
      
      console.log('Malipo Yamegunduliwa:', { txid, amount, from });
      
      // Hifadhi malipo - yanasubiri ESP32 ithibitishe
      pendingPayments.set(txid, {
        amount,
        from,
        date: new Date().toISOString(),
        used: false
      });

      console.log('Malipo yamehifadhiwa. TXID:', txid, 'Kiasi:', amount);
    } else {
      console.log('SMS si ya M-Pesa au format haieleweki');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('SMS Error:', error);
    res.status(500).json({ success: false });
  }
});

// Verify - ESP32 inauliza kama TXID ni halali
app.post('/verify', (req, res) => {
  const { txid, mac, amount } = req.body;
  
  if (!txid || !mac) {
    return res.status(400).json({ 
      success: false, 
      message: 'Tuma txid na mac' 
    });
  }

  console.log('Verify Request:', { txid, mac, amount });

  // Angalia kama TXID ipo kwenye malipo yaliyopokelewa
  const payment = pendingPayments.get(txid.toUpperCase());
  
  if (!payment) {
    return res.json({ 
      success: false, 
      message: 'TXID haijapatikana - Subiri SMS au jaribu tena' 
    });
  }

  if (payment.used) {
    return res.json({ 
      success: false, 
      message: 'TXID hii imetumika tayari' 
    });
  }

  // Angalia kiasi - lazima iwe angalau TZS 500
  const minAmount = parseInt(process.env.MIN_AMOUNT) || 500;
  if (payment.amount < minAmount) {
    return res.json({ 
      success: false, 
      message: `Kiasi kidogo mno. Angalau TZS ${minAmount} inahitajika` 
    });
  }

  // Idhinisha MAC address
  const duration = getDuration(payment.amount);
  const expiry = new Date(Date.now() + duration).toISOString();
  
  authorizedMACs.set(mac.toUpperCase(), {
    txid,
    amount: payment.amount,
    expiry,
    authorizedAt: new Date().toISOString()
  });

  // Weka TXID kama imetumika
  payment.used = true;
  pendingPayments.set(txid.toUpperCase(), payment);

  console.log('MAC Imeidhinishwa:', mac, 'Hadi:', expiry);

  res.json({ 
    success: true, 
    message: 'Malipo yamethibitishwa! Karibu.',
    mac,
    amount: payment.amount,
    expiry,
    duration: getDurationText(payment.amount)
  });
});

// Check MAC - ESP32 inauliza kama MAC imeidhinishwa
app.post('/check', (req, res) => {
  const { mac } = req.body;
  
  if (!mac) {
    return res.status(400).json({ authorized: false });
  }

  const auth = authorizedMACs.get(mac.toUpperCase());
  
  if (!auth) {
    return res.json({ authorized: false, message: 'MAC haijaidhinishwa' });
  }

  // Angalia kama muda haujaisha
  if (new Date() > new Date(auth.expiry)) {
    authorizedMACs.delete(mac.toUpperCase());
    return res.json({ authorized: false, message: 'Muda wako umeisha' });
  }

  res.json({ 
    authorized: true, 
    expiry: auth.expiry,
    amount: auth.amount
  });
});

// Admin - Angalia hali ya system
app.get('/admin', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    authorizedMACs: Object.fromEntries(authorizedMACs),
    pendingPayments: Object.fromEntries(pendingPayments),
    totalAuthorized: authorizedMACs.size,
    totalPayments: pendingPayments.size
  });
});

// ==================== HELPER FUNCTIONS ====================

// Panga muda kulingana na kiasi
function getDuration(amount) {
  if (amount >= 5000) return 30 * 24 * 60 * 60 * 1000; // Mwezi
  if (amount >= 2000) return 7 * 24 * 60 * 60 * 1000;  // Wiki
  if (amount >= 1000) return 24 * 60 * 60 * 1000;      // Siku
  if (amount >= 500)  return 12 * 60 * 60 * 1000;      // Masaa 12
  return 6 * 60 * 60 * 1000;                            // Masaa 6
}

function getDurationText(amount) {
  if (amount >= 5000) return 'Mwezi mmoja';
  if (amount >= 2000) return 'Wiki moja';
  if (amount >= 1000) return 'Siku moja';
  if (amount >= 500)  return 'Masaa 12';
  return 'Masaa 6';
}

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bushiri Backend inaendesha port ${PORT}`);
});
```

Commit → Render 
