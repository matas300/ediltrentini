const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getDb, saveDb } = require('../db/init');

// Multer config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Non autenticato' });
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    const db = await getDb();
    const result = db.exec("SELECT id, password FROM users WHERE username = ?", [username]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result[0].values[0];
    const valid = bcrypt.compareSync(password, user[1]);

    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    req.session.userId = user[0];
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Check auth status
router.get('/me', requireAuth, (req, res) => {
  res.json({ authenticated: true });
});

// Get all projects (admin)
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const projects = db.exec(`
      SELECT p.id, p.title, p.description, p.category, p.created_at,
             pi.id as image_id, pi.filename, pi.original_name, pi.is_cover
      FROM projects p
      LEFT JOIN project_images pi ON pi.project_id = p.id
      ORDER BY p.created_at DESC
    `);

    if (projects.length === 0) return res.json([]);

    const cols = projects[0].columns;
    const rows = projects[0].values;
    const projectMap = new Map();

    for (const row of rows) {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);

      if (!projectMap.has(obj.id)) {
        projectMap.set(obj.id, {
          id: obj.id,
          title: obj.title,
          description: obj.description,
          category: obj.category,
          created_at: obj.created_at,
          images: []
        });
      }

      if (obj.filename) {
        projectMap.get(obj.id).images.push({
          id: obj.image_id,
          filename: obj.filename,
          original_name: obj.original_name,
          is_cover: obj.is_cover
        });
      }
    }

    res.json(Array.from(projectMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nel recupero dei progetti' });
  }
});

// Create project
router.post('/projects', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Titolo richiesto' });

    const db = await getDb();
    db.run(
      "INSERT INTO projects (title, description, category) VALUES (?, ?, ?)",
      [title, description || '', category || '']
    );

    const result = db.exec("SELECT last_insert_rowid()");
    const projectId = result[0].values[0][0];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        db.run(
          "INSERT INTO project_images (project_id, filename, original_name, is_cover) VALUES (?, ?, ?, ?)",
          [projectId, file.filename, file.originalname, i === 0 ? 1 : 0]
        );
      }
    }

    saveDb();
    res.json({ success: true, id: projectId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella creazione del progetto' });
  }
});

// Update project
router.put('/projects/:id', requireAuth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const { id } = req.params;

    const db = await getDb();
    db.run(
      "UPDATE projects SET title = ?, description = ?, category = ?, updated_at = datetime('now') WHERE id = ?",
      [title, description || '', category || '', id]
    );

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        db.run(
          "INSERT INTO project_images (project_id, filename, original_name, is_cover) VALUES (?, ?, ?, ?)",
          [id, file.filename, file.originalname, 0]
        );
      }
    }

    saveDb();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella modifica del progetto' });
  }
});

// Delete project
router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Get images to delete files
    const images = db.exec("SELECT filename FROM project_images WHERE project_id = ?", [id]);
    if (images.length > 0) {
      for (const row of images[0].values) {
        const filepath = path.join(__dirname, '..', 'uploads', row[0]);
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      }
    }

    db.run("DELETE FROM project_images WHERE project_id = ?", [id]);
    db.run("DELETE FROM projects WHERE id = ?", [id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella cancellazione del progetto' });
  }
});

// Delete single image
router.delete('/images/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const img = db.exec("SELECT filename FROM project_images WHERE id = ?", [id]);
    if (img.length > 0 && img[0].values.length > 0) {
      const filepath = path.join(__dirname, '..', 'uploads', img[0].values[0][0]);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }

    db.run("DELETE FROM project_images WHERE id = ?", [id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore nella cancellazione immagine' });
  }
});

module.exports = router;
