const express = require('express');
const router = express.Router();
const { getDb } = require('../db/init');

// GET all published projects
router.get('/projects', async (req, res) => {
  try {
    const db = await getDb();
    const projects = db.exec(`
      SELECT p.id, p.title, p.description, p.category, p.created_at,
             pi.filename, pi.is_cover
      FROM projects p
      LEFT JOIN project_images pi ON pi.project_id = p.id
      ORDER BY p.created_at DESC
    `);

    if (projects.length === 0) {
      return res.json([]);
    }

    const cols = projects[0].columns;
    const rows = projects[0].values;

    // Group images by project
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
          filename: obj.filename,
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

module.exports = router;
