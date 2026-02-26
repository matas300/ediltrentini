require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { exec } = require('child_process');
const { getDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiter: max 10 tentativi di login ogni 15 minuti per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Troppi tentativi. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use('/admin/api/login', loginLimiter);

// Static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin/api', require('./routes/admin'));

// GitLab webhook — auto deploy on push
app.post('/webhook', (req, res) => {
  const token = req.headers['x-gitlab-token'];
  if (!token || token !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(200).json({ ok: true });
  exec('git pull && pm2 restart all', { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) console.error('[webhook] Deploy fallito:', err.message);
    else console.log('[webhook] Deploy ok:', stdout.trim());
  });
});

// Initialize DB and start server
getDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
  });
}).catch(err => {
  console.error('Errore inizializzazione database:', err);
  process.exit(1);
});
