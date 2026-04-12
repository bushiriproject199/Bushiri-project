const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== HIFADHI YA MUDA ====================
const pendingPayments = new Map(); // TXID → malipo
const activeSessions = new Map();  // IP/identifier → session
const trialUsed = new Set(); // Hifadhi namba zilizotumia trial
// ==================== MUDA WA HUDUMA ====================
// Uwiano: TZS 800 = Masaa 15
// TZS 1600 = Masaa 30, TZS 2400 = Masaa 45, n.k.

function getDuration(amount) {
  if (amount < 800) return null;
  // Hesabu uwiano: (amount / 800) * 15 masaa
  const hours = (amount / 800) * 15;
  return Math.floor(hours * 60 * 60 * 1000); // milliseconds
}

function getDurationText(amount) {
  if (amount < 800) return null;
  const hours = (amount / 800) * 15;
  const fullHours = Math.floor(hours);
  const mins = Math.floor((hours - fullHours) * 60);
  
  if (fullHours >= 24) {
    const days = Math.floor(fullHours / 24);
    const remainHours = fullHours % 24;
    if (remainHours > 0) {
      return `Siku ${days} na masaa ${remainHours}! 🎉`;
    }
    return `Siku ${days} kamili! 🎉`;
  }
  if (mins > 0) {
    return `Masaa ${fullHours} na dakika ${mins}! ✅`;
  }
  return `Masaa ${fullHours}! ✅`;
}

function getWelcomeMessage(amount) {
  if (amount < 800) return null;
  const hours = Math.floor((amount / 800) * 15);
  
  if (amount >= 4000) return `🌟 WOW! Umeweka TZS ${amount.toLocaleString()} - Unapata masaa ${hours} ya internet! Asante sana kwa uaminifu wako!`;
  if (amount >= 2400) return `🚀 Hongera! TZS ${amount.toLocaleString()} = Masaa ${hours} ya internet yenye kasi! Furahia bila wasiwasi!`;
  if (amount >= 1600) return `💪 Vizuri! TZS ${amount.toLocaleString()} = Masaa ${hours} ya internet! Karibu BUSHIRI HOTSPOT!`;
  return `✅ Hongera! TZS ${amount.toLocaleString()} = Masaa ${hours} ya internet! Karibu sana - tunatumai utafurahia!`;
}

// ==================== HOME ====================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bushiri Hotspot Backend inafanya kazi!',
    version: '3.0.0'
  });
});

// ==================== HEARTBEAT ====================
app.get('/heartbeat', (req, res) => {
  const now = Date.now();
  
  // Hesabu sessions zinazofanya kazi
  let activeSessions_count = 0;
  for (const [key, session] of activeSessions.entries()) {
    if (now < session.expiry) {
      activeSessions_count++;
    } else {
      activeSessions.delete(key); // Futa zilizokwisha
    }
  }

  res.json({
    status: 'ok',
    project: 'BUSHIRI',
    version: '3.0.0',
    time: new Date().toISOString(),
    activeSessions: activeSessions_count,
    pendingPayments: pendingPayments.size
  });
});

// ==================== SMS CALLBACK ====================
     if (isTuma) {
      console.log('SMS ya kutuma - INAPUUZWA');
      return res.json({ success: true, ignored: true });
    }

    // Pokea SMS za kupokea tu
    const isPokea = smsUpper.includes('UMEPOKEA') ||
                    smsUpper.includes('HAMISHO LA PESA LIMEKAMILIKA');

    if (!isPokea) {
      console.log('SMS si ya kupokea - INAPUUZWA');
      return res.json({ success: true, ignored: true });
    }

    // Tafuta kiasi
    // Format 1: "Umepokea TSh 2,000"
    // Format 2: "Umepokea TSh 300 kutoka Airtel"
    const amountMatch = text.match(/Umepokea\s+TSh\s+([\d,]+)/i);

    // Tafuta TXID
    // Format 1: "Kumbukumbu no.: 26205921931320"
    // Format 2: "kumbukumbu ya malipo.: 25492622118133"
    const txidMatch = text.match(/Kumbukumbu\s+(?:no\.|ya\s+malipo\.?)\s*:?\s*(\d{10,20})/i);

    if (!amountMatch) {
      console.log('Kiasi hakijapatikana');
      return res.json({ success: true, ignored: true });
    }

    if (!txidMatch) {
      console.log('TXID haijapatikana');
      return res.json({ success: true, ignored: true });
    }

    const txid = txidMatch[1];
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    // Angalia kiasi - lazima iwe angalau 800
    if (amount < 800) {
      console.log('Kiasi kidogo mno:', amount);
      pendingPayments.set(txid, {
        amount,
        from,
        date: new Date().toISOString(),
        used: false,
        tooSmall: true,
        raw: text
      });
      return res.json({ success: true, tooSmall: true });
    }

    console.log('✅ MALIPO YAMEGUNDULIWA!');
    console.log('TXID:', txid);
    console.log('Kiasi: TSh', amount);

    // Hifadhi malipo
    pendingPayments.set(txid, {
      amount,
      from,
      date: new Date().toISOString(),
      used: false,
      tooSmall: false,
      raw: text
    });

    console.log('Jumla ya malipo yanayosubiri:', pendingPayments.size);
    res.json({ success: true, txid, amount });

  } catch (error) {
    console.error('SMS Error:', error);
    res.status(500).json({ success: false });
  }
});

// ==================== VERIFY ====================
// ==================== TRIAL / PROMO ====================
if (txidClean === 'BUSHIRIPROJECT') {
  
  // Angalia kama namba hii imeshafaidika na trial
  const phone = req.body.phone || mac;
  
  if (trialUsed.has(phone)) {
    return res.json({
      success: false,
      message: '❌ Umeshafaidika na ofa hii.\n\nLipa TZS 800 kuendelea!'
    });
  }

  // Ruhusu trial ya dakika 10
  const trialDuration = 10 * 60 * 1000; // Dakika 10
  const expiry = Date.now() + trialDuration;

  activeSessions.set(mac.toUpperCase(), {
    txid: 'BUSHIRIPROJECT',
    amount: 0,
    startTime: Date.now(),
    expiry: expiry,
    expiryISO: new Date(expiry).toISOString(),
    isTrial: true
  });

  // Hifadhi namba iliyotumia trial
  trialUsed.add(phone);
  trialUsed.add(mac.toUpperCase());

  console.log('Trial activated for:', mac, 'Phone:', phone);

  return res.json({
    success: true,
    message: '🎁 Hongera! Umepata dakika 15 za BURE!\n\nKaribu BUSHIRI HOTSPOT!\nMuda ukiisha lipa TZS 800 kuendelea.',
    duration: 'Dakika 15 za bure!',
    isTrial: true,
    expiry: new Date(expiry).toISOString()
  });
}
app.post('/verify', (req, res) => {
  const { txid, mac } = req.body;

  if (!txid || !mac) {
    return res.status(400).json({
      success: false,
      message: '⚠️ Tuma txid na mac'
    });
  }

  const txidClean = txid.trim().toUpperCase();
  console.log('Verify Request - TXID:', txidClean, '| ID:', mac);

  // Tafuta malipo
  const payment = pendingPayments.get(txidClean);

  if (!payment) {
    return res.json({
      success: false,
      message: '❌ Namba hii ya muamala haijapatikana.\n\nHakikisha:\n1. Umenakili namba sahihi kutoka SMS\n2. Subiri sekunde 30 kisha jaribu tena'
    });
  }

  if (payment.used) {
    return res.json({
      success: false,
      message: '⚠️ Namba hii ya muamala imetumika tayari.\n\nKama una tatizo wasiliana nasi.'
    });
  }

  if (payment.tooSmall) {
    return res.json({
      success: false,
      message: `❌ Malipo yako ya TZS ${payment.amount} ni kidogo mno.\n\nBei ya chini ni TZS 800 kwa siku nzima.\n\nTuma tofauti na ujaribu tena.`
    });
  }

  // Angalia kiasi tena
  const duration = getDuration(payment.amount);
  if (!duration) {
    return res.json({
      success: false,
      message: `❌ Kiasi cha TZS ${payment.amount} hakikidhi. Angalau TZS 800 inahitajika.`
    });
  }

  // ✅ MALIPO YAMEKUBALIWA - Anza muda SASA HIVI
  const now = Date.now();
  const expiry = now + duration;
  const expiryDate = new Date(expiry);

  // Weka session - muda unaanza SASA
  activeSessions.set(mac.toUpperCase(), {
    txid: txidClean,
    amount: payment.amount,
    startTime: now,
    expiry: expiry,
    expiryISO: expiryDate.toISOString()
  });

  // Weka TXID kama imetumika
  payment.used = true;
  pendingPayments.set(txidClean, payment);

  const welcomeMsg = getWelcomeMessage(payment.amount);
  const durationText = getDurationText(payment.amount);

  console.log('✅ Session Imeundwa:', mac, '| Kiasi:', payment.amount, '| Inaisha:', expiryDate.toISOString());

  res.json({
    success: true,
    message: welcomeMsg,
    duration: durationText,
    amount: payment.amount,
    expiry: expiryDate.toISOString(),
    expiryFormatted: expiryDate.toLocaleString('sw-TZ')
  });
});

// ==================== CHECK SESSION ====================
app.post('/check', (req, res) => {
  const { mac } = req.body;

  if (!mac) {
    return res.status(400).json({ authorized: false });
  }

  const macClean = mac.toUpperCase();
  const session = activeSessions.get(macClean);
  const now = Date.now();

  if (!session) {
    return res.json({ 
      authorized: false, 
      message: 'Hakuna session - tafadhali lipa kwanza' 
    });
  }

  // Angalia muda
  if (now >= session.expiry) {
    // Muda umeisha - futa session
    activeSessions.delete(macClean);
    return res.json({ 
      authorized: false, 
      message: '⏰ Muda wako wa internet umeisha.\n\nAsante kwa kutumia BUSHIRI HOTSPOT!\nLipa tena kuendelea.' 
    });
  }

  // Bado ana muda - ruhusu
  const remainingMs = session.expiry - now;
  const remainingHours = Math.floor(remainingMs / 3600000);
  const remainingMins = Math.floor((remainingMs % 3600000) / 60000);

  res.json({
    authorized: true,
    remaining: `${remainingHours}h ${remainingMins}m`,
    expiry: session.expiryISO,
    amount: session.amount
  });
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  
  if (token !== (process.env.ADMIN_PASSWORD || 'bushiri2026')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = Date.now();
  const activeList = [];
  const expiredList = [];

  for (const [mac, session] of activeSessions.entries()) {
    const remainingMs = session.expiry - now;
    if (remainingMs > 0) {
      const hours = Math.floor(remainingMs / 3600000);
      const mins = Math.floor((remainingMs % 3600000) / 60000);
      activeList.push({
        id: mac,
        amount: session.amount,
        remaining: `${hours}h ${mins}m`,
        expiry: session.expiryISO
      });
    } else {
      expiredList.push({ id: mac, expiry: session.expiryISO });
      activeSessions.delete(mac);
    }
  }

  res.json({
    activeSessions: activeList,
    totalActive: activeList.length,
    pendingPayments: pendingPayments.size,
    timestamp: new Date().toISOString()
  });
});

// ==================== SERVER ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bushiri Backend inaendesha port ${PORT}`);
});
