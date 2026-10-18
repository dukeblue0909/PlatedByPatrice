# Plated by Patrice

Static one-page website for **Plated by Patrice** — weekly meal prep bundles and catering.

## Structure

- `index.html` — the whole site (hero, weekly menu, gallery, real-orders spotlight, about, order/contact, footer)
- `assets/css/style.css` — styles
- `assets/js/main.js` — mobile navigation and text request builder
- `assets/js/menu-data.js` — October weekly menus, entree choices, and upgrade prices
- `assets/images/` — food photos, portrait, video posters
- `assets/video/` — prep/spread video clips

No build step — it's plain HTML/CSS/JS.

## Updating the weekly menu

Edit `assets/js/menu-data.js` to update menu weeks, prices, descriptions, and choices. It drives both the menu cards and the text request selections so they stay consistent. The October 5, 12, 19, and 26, 2026 menus were transcribed from **OCTOBER MENUS (1).docx**. Every $65 bundle includes any four entrees; the listed upgrades apply to each entree where selected.

The menu opens to the current week's Monday using the Detroit calendar; Sundays open the upcoming Monday. Outside the supplied date range, it shows the next available menu, or the last supplied menu after the range ends. Each menu always displays its explicit date, and requests require Patrice's availability confirmation. Add new dated menus to keep the selection current; no deadlines or pickup schedules are inferred.

Customers can select any entree multiple times. Mix-and-match entrees require a meat and two side selections; choosing seasoned rice opens a rice choice, and wings open the flavors listed for that week. Salad dressings, optional ingredients, and priced extras appear only for the relevant entree. The document lists **Asian Garlic Parm** as one flavor on October 12 and 19; this wording is preserved. Separate side selectors allow customers to request the same side twice, subject to confirmation.

## Text requests and payments

Customers enter their name, menu week, bundle count, four entree selections per bundle, preferred pickup, and notes in the `#order` section. The estimate includes the base bundle price and selected upgrades. Each bundle can have different selections. Switching weeks or reducing and restoring the bundle count preserves selections in the current page session. The builder shows a review with all choices and prices, then creates an SMS draft addressed to **313-727-1187**. Customers must send the message from their messaging app; nothing is submitted to a server or saved across page reloads. A copy option and visible message support desktop users or devices without an SMS app.

Online ordering and checkout are not enabled. A text request does not reserve a bundle or confirm an order. Cash App and Zelle details are available in a collapsed section for customers whose requests Patrice has already confirmed. Set up a payment provider and a suitable checkout integration before enabling online orders; GitHub Pages cannot run a payment backend or verify payments.

When changing the phone number, update the SMS links, generated message link in `assets/js/main.js`, and visible phone number together. Prices in `menu-data.js` are integer cents; the banner, estimates, and message use those prices. If the four-entree bundle size or base price changes, also update the explanatory copy and no-JavaScript fallback in `index.html`.

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
