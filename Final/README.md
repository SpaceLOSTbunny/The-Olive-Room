# The Olive Rooms — Complete Resort Website

This project combines the three supplied website projects into one consistent resort experience and uses the supplied Olive Rooms logo as the main brand mark.

## Included

- `index.html` — premium homepage and resort story
- `services.html` — services with category filters
- `blog.html` — Olive Journal with filters and article modals
- `contact.html` — contact and resort information
- `reservations.html` — Google Sheets-ready reservation enquiry form
- `assets/images/logo.png` — your supplied logo
- `assets/images/*.svg` — visual artwork from the supplied blog project
- `css/style.css` — all styles, responsive layout and animations
- `js/script.js` — navigation, reveal animations, filters, blog modal and reservation submission
- `js/config.js` — Google Apps Script endpoint configuration
- `google-apps-script/Code.gs` — Google Sheets + optional Google Drive backend

## Run locally

Open `index.html` in VS Code using Live Server. The site also works as a static project after deployment.

## Google Sheets reservation setup

See the step-by-step instructions in the chat message that delivered this project.

### Important

The frontend intentionally does not contain a Google account password or private API key. The browser sends reservation data to your deployed Google Apps Script web app.

The optional upload field accepts PDF/JPG/JPEG/PNG/WEBP and the included Apps Script stores the file in Google Drive and places the Drive URL into the reservation sheet. Keep upload sizes small; the frontend is configured for 5 MB by default.

## Motion & navigation notes

- Navbar slides up and fades out once you scroll, and returns at the top of the page (`js/script.js`, `syncNavbarVisibility`).
- Mobile (≤ 800px) uses a full-screen menu that opens from the menu button; the Reserve button moves into the menu.
- Shared easing lives in `:root` (`--ease`, `--ease-io`) at the bottom of `css/style.css`; adjust those to change the feel everywhere.
- Page-to-page fade, hero entrance, scroll reveals, filters and the light/dark cross-fade all respect `prefers-reduced-motion`.
