const initSQL = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'ediltrentini.db');

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSQL();

  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }

  db = new SQL.Database(fileBuffer ? new Uint8Array(fileBuffer) : undefined);

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS project_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      is_cover INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Sync admin password from environment variable
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD non configurata nel file .env');
  }

  const existing = db.exec("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
  const count = existing.length > 0 ? existing[0].values[0][0] : 0;
  const hash = bcrypt.hashSync(adminPassword, 10);

  if (count === 0) {
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
  } else {
    db.run("UPDATE users SET password = ? WHERE username = 'admin'", [hash]);
  }
  saveDb();

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

module.exports = { getDb, saveDb };
