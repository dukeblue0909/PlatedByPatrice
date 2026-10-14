# Plated by Patrice

Static one-page website for **Plated by Patrice** — weekly meal prep bundles and catering.

## Structure

- `index.html` — the whole site (hero, weekly menu, gallery, real-orders spotlight, about, order/contact, footer)
- `assets/css/style.css` — styles
- `assets/js/main.js` — mobile nav toggle
- `assets/images/` — food photos, portrait, video posters
- `assets/video/` — prep/spread video clips

No build step — it's plain HTML/CSS/JS.

## Updating the weekly menu

Edit the `#menu` section in `index.html` (the banner text and the two menu cards) each week.

## Running locally

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying with GitHub Pages

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Pick the branch this site lives on and `/ (root)` as the folder, then save.
5. GitHub will publish the site at `https://<username>.github.io/<repo-name>/` within a minute or two.
