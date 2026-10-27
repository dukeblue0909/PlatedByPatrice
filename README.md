# Plated by Patrice

Static HTML/CSS/JS storefront hosted by GitHub Pages at https://www.platedbypatrice.com. No new paid service or frontend dependency is required for the October 2026 experience update.

## Customer experience

The homepage leads to the weekly menu, saved favorites, bundle builder, and catering. Orders are requested by Friday for Sunday pickup; Patrice confirms the pickup time, availability, dietary needs, and final price. No cutoff hour or pickup date is inferred. Gallery, real orders, owner story, and confirmed-order payment information remain available.

The builder has three editable steps: weeks and bundle quantities; four entree selections per bundle; contact and dietary notes. Review is a fourth stage with a separate submit action. All included weeks must be complete. Prices are integer cents; current menu upgrades determine the estimate. Copying an entree and duplicating bundles are supported. Text, download, and print alternatives remain available.

## Menus

`assets/js/menu-data.js` drives the menu, required choices, estimates, and requests. November 2, 9, and 16, 2026 were transcribed from NOVEMBER 2026 MENUS - PLATED BY PATRICE.docx. Bundles are $65 for four entrees; catfish is +$2 and salmon is +$3 per selected entree. The November 9 wing flavor “Asian Garlic Parm” preserves the document wording. There are no meal prep bundles November 23 or November 30; these weeks are displayed as a notice and excluded from order selections.

The dated menu defaults using the Detroit calendar, with Sundays opening the upcoming Monday. Outside the supplied date range it shows the next available menu or the last supplied menu; explicit week labels and confirmation requirements remain visible. Add new dated menus and update the schedule notice when rolling forward. Do not infer availability from an old menu.

## Favorites and privacy

Favorites are optional and account-free. Customers explicitly name and save a complete four-entree bundle. Up to 12 favorites live in localStorage under `patrice-favorites-v1` in the current browser and origin. The saved data contains only bundle names, meal option identifiers/labels, and selected extras, never customer contact fields, allergies, pickup preferences, or request notes. Advise customers not to save on a shared device. Clearing browser data removes favorites; they do not sync across devices.

Reusing a favorite fills an empty bundle or appends one without overwriting an existing selection, up to ten bundles per week. It checks saved option IDs and labels against the selected week's menu, clears unavailable choices, explains replacements, and recalculates with current prices. Customers must finish choices and review before submitting. Delete removes the favorite from this browser. Invalid or blocked storage does not prevent ordering.

An unfinished meal cart uses sessionStorage (`patrice-meal-request-v1`) only for menu choices, included weeks, and quantities. Contact details, allergies, pickup preferences, and notes are not persisted. A menu data change invalidates the session draft; saved favorites remain available for compatibility checks.

## Requests and tracking

Both bundle and catering forms submit to the existing public request service:
`https://plated-by-patrice-requests.dariouswaters.chatgpt.site/api/submit`

Requests are saved by that service for Patrice's private order dashboard. Preserve its payload contract and service endpoint when updating the storefront. Bundle totals are cents. A UUID identifies a reviewed payload for retries; the success reference comes from the service. The UI reports success only after a successful server response, and retries retain the same request ID. Changed reviewed payloads receive new IDs. No fake requests should be sent to production during QA: intercept submissions in browser tests.

A saved request is not a confirmed order. Customers wait for Patrice before paying through Cash App or Zelle. There is no card checkout, customer account, cross-device history, or automatic recurring order in this version.

## Files and verification

- `index.html`: responsive storefront, wizard markup, review, catering, payment alternatives
- `assets/css/style.css`: existing styles plus cleaner storefront and builder overrides
- `assets/js/main.js`: menu rendering, bundle builder, wizard, favorites, review and submission
- `assets/js/menu-data.js`: dated menu definitions and prices
- `design-preview.html`: separate earlier design concept; not the ordering homepage

No build or install step. Serve with `python -m http.server 8000` for local preview. Update the stylesheet/script release query parameters with incompatible changes. Validate syntax with `node --check assets/js/main.js` and `node --check assets/js/menu-data.js`, then browser-check required choices, integer totals, favorite compatibility and deletion, blocked storage, multiweek review, submission errors/retries, catering, and mobile layouts. Mock backend submissions.

Publish the exact checked source to the `main` branch; GitHub Pages performs the build and deployment. Keep CNAME unchanged.
