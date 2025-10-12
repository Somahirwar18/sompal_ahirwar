# Sompal Ahirwar - Portfolio

A modern, responsive personal portfolio website for Sompal Ahirwar (Aspiring Data Scientist), featuring a dark/light theme toggle, smooth animations, and sections for About, Skills, Experience, Projects, Education, Certifications, and Contact. Includes a local Admin Panel to edit all content without any backend.

## Structure

- `index.html` — Main single-page site with all sections
- `assets/css/styles.css` — Styles with dark/light theme variables and responsive layout
- `assets/js/main.js` — Theme toggle, mobile nav, smooth scroll, reveal animations
- `assets/resume/Sompal_Ahirwar_Resume.pdf` — Optional placeholder resume (you can upload a PDF from Admin instead)

## Customize

You have two ways to customize:

1) Admin Panel (recommended)
- Open `http://127.0.0.1:5500/admin.html`
- Login with users defined in `assets/admins.json`
- Visual Editor lets you edit:
  - Profile (name, headline, summary, photo, resume)
  - About, Skills, Experience, Projects, Education, Certifications, Contact
  - Insights (chart data)
- Click "Save" to store changes in your browser's localStorage (key `portfolio_content_override`).
- Export/Import JSON to move changes between devices.

Uploads
- Profile Photo: image files are auto-cropped to a centered 512×512 square and stored as a data URL.
- Resume: PDF files (max ~5 MB) are stored as a data URL. The homepage automatically converts this into a downloadable file in the browser (no server needed).

2) Manual edits (advanced)
- Edit `assets/content.json` directly.
- Place files under `assets/` and reference them by path.

## Develop

- Use a simple local server for correct relative paths and CORS.
- No build step required.

Run with Python (Windows PowerShell):

```powershell
python -m http.server 5500
```

Then open:

- Site: `http://127.0.0.1:5500`
- Admin: `http://127.0.0.1:5500/admin.html`

## Deploy

- Deploy to Netlify, Vercel, or GitHub Pages.
- If using only Admin/localStorage, remember that edits are per-device. To make them permanent, Export from Admin and commit the JSON to `assets/content.json` (or keep using Admin locally).

## Accessibility & Performance

- Semantic HTML with keyboard-accessible nav and buttons.
- Theme state saved in `localStorage` and respects system preference on first load.
- IntersectionObserver used for performant scroll animations.
- Images use lazy loading and are standardized for consistent layout.
