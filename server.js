require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDb } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'ediltrentini-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Static files
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin/api', require('./routes/admin'));

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
