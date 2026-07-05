# Oxfraki Accessories Finder

A lightweight web app that helps customers find compatible replacement parts for their robot vacuum model. Customers scan a QR code on Oxfraki product packaging to access the finder.

## Tech stack

- HTML
- CSS (mobile-first)
- Vanilla JavaScript

No frameworks or CSS libraries.

## Project structure

```
.
├── index.html    # Main page
├── style.css     # Styles (mobile-first)
├── script.js     # Application entry point
└── README.md
```

## Local development

Serve the project with any static file server. For example:

```bash
# Python 3
python3 -m http.server 8000

# Node.js (npx)
npx serve .
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## GitHub Pages deployment

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder.
5. Save. The site will be available at `https://<username>.github.io/<repository>/`.

All asset paths are relative, so no build step is required.

## License

Proprietary — Oxfraki.
