# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Landing page + admin panel for **Edil Trentini S.N.C.**, a construction company in Monterenzio (BO), Italy. Built with Node.js/Express, vanilla JS frontend, and SQLite via sql.js.

## Commands

```bash
npm install          # Install dependencies
npm start            # Start production server (port 3000)
npm run dev          # Start with --watch for auto-reload
```

## Architecture

- **server.js** — Express entry point. Serves static files and mounts API routes. Sessions via express-session.
- **db/init.js** — SQLite database (sql.js, pure JS). Creates tables on first run, seeds admin user. Exports `getDb()` (async) and `saveDb()`. DB file: `ediltrentini.db`.
- **routes/api.js** — Public API mounted at `/api`. `GET /api/projects` returns projects with images grouped.
- **routes/admin.js** — Protected admin API mounted at `/admin/api`. CRUD for projects, image upload via multer. Auth via `requireAuth` middleware checking `req.session.userId`. All mutations call `saveDb()` to persist sql.js in-memory DB to disk.
- **public/** — Landing page frontend (HTML/CSS/JS). Projects section loads dynamically from `/api/projects`.
- **admin/** — Admin panel SPA. Login at `/admin/login.html`, dashboard at `/admin/`. Manages projects with image upload.
- **uploads/** — Uploaded project images (gitignored).

### Database Schema

Three tables: `users` (id, username, password), `projects` (id, title, description, category, created_at, updated_at), `project_images` (id, project_id FK, filename, original_name, is_cover).

### Admin API Endpoints

- `POST /admin/api/login` / `POST /admin/api/logout` / `GET /admin/api/me` — Auth
- `GET|POST /admin/api/projects`, `PUT|DELETE /admin/api/projects/:id` — Project CRUD
- `DELETE /admin/api/images/:id` — Delete single image

## Key Details

- Database is sql.js (in-memory + file persistence), NOT better-sqlite3, because this machine lacks native build tools.
- Admin credentials default: `admin` / `ediltrentini2024`. Password stored as bcryptjs hash.
- Image upload: multer, max 10MB, accepts jpeg/jpg/png/gif/webp. Stored in `uploads/` with timestamp filenames.
- Frontend uses Inter font from Google Fonts, CSS custom properties for theming, IntersectionObserver for scroll animations.
- Color palette: primary orange (#E8751A), secondary anthracite (#2D2D2D), accent forest green (#4A7C59), background off-white (#F5F3EF).
