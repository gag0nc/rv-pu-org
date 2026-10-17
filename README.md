# Admission Manager

**Start here: [GUIDE.md](GUIDE.md)** has full setup, network access, install-as-app, auto-start, daily use and troubleshooting.

Admission enquiry management for **Sri RV PU College, Kolar**, built directly from the paper *Student Enquiry Form*. Runs on one PC or server; staff open it in a browser. It works on a school network with no internet connection, or online behind HTTPS on a small server (GUIDE.md section 11). No external database.

## Quick start

Requires Python 3.9+.

- **Windows:** double-click `start.bat`
- **Linux / macOS:** `./start.sh`

The first run installs the three dependencies, creates the database, and prints the **administrator password** in the window (also saved in `data/FIRST_LOGIN.txt`, which deletes itself once you set your own password). Open **http://localhost:8000**. Other computers on the college network use `http://<server-PC-IP>:8000`.

You are asked to set your own password at first sign-in.

## What it does

- **Dashboard** – four summary cards, an enquiries chart (yearly or last week), the counselling funnel, the counsellor track (counselled, admitted, conversion) and follow-ups due. Every card is clickable.
- **Enquiries grid** – Excel-style sheet with sticky headers, sorting, search (name, mobile, enquiry no., school, town…), filters, paging. Rows are **colour-coded by status**; change status straight from the grid.
  - Grey = New · Green = Admission Confirmed · Amber = Under Discussion · Blue = Exploring Other Options · Red = Not Interested
- **New Entry** – choose **Enter Manually** or **Scan Filled Form**. Scanning photographs the filled paper form with a phone camera and fills the entry in for staff to check and save (needs a scanning key and internet on the server; see below).
- **Entry form** – all seven sections of the paper form. Auto enquiry numbers (`ENQ-2026-0001`), live percentage from marks, upper-casing of names as the paper form asks, duplicate-mobile warning, follow-up date and assigned counsellor, full change history. Prints on one A4 page in the layout of the paper form (also *Print blank form*).
- **Export to Excel** – respects current filters; status colours, frozen header, filters, and a Summary sheet.
- **Users & roles** (admin) – Admin, Counsellor, Viewer; reset passwords; disable instead of delete.
- **Activity log** (admin) – who created, changed, exported or deleted what, every scan, and every sign-in.
- **Backups** – automatic daily copy in `data/backups/` (last 30 kept) plus one-click download.

| Role | Can do |
|---|---|
| Admin | Everything, including users, delete, backup, export with Aadhaar |
| Counsellor | Add/edit enquiries, change status, export (Aadhaar excluded) |
| Viewer | Read-only; Aadhaar masked |

## Security

- Passwords stored as salted hashes; forced change on first login and after admin reset
- Account locks for 10 minutes after 5 wrong passwords; a network is also paused after 30 wrong attempts in 10 minutes
- Session cookies are HttpOnly + SameSite; CSRF token on every change; **Remember me** keeps a personal device signed in for 7 days, otherwise a sign-in ends when the browser closes or after 8 idle hours; changing or resetting a password signs that account out everywhere else
- Strict Content-Security-Policy, no third-party scripts or fonts
- Parameterised SQL throughout; spreadsheet-formula injection guarded in exports
- Edit-conflict protection: if two people edit the same record, the second save is refused rather than overwriting
- Student Aadhaar numbers are masked for read-only users and left out of non-admin exports

**For use beyond a trusted office network:** put it behind an HTTPS reverse proxy and set `ADMISSIONS_HTTPS=1` and `ADMISSIONS_PROXY=1`. Ready-made `deploy/admission-manager.service` and `deploy/Caddyfile` files and step-by-step commands are in GUIDE.md section 11. `GET /healthz` answers `{"ok":true}` for uptime monitors. Keep the `data/` folder out of public reach.

## Settings (environment variables)

| Variable | Default |
|---|---|
| `ADMISSIONS_PORT` | `8000` |
| `ADMISSIONS_HOST` | `0.0.0.0` (use `127.0.0.1` for this computer only) |
| `ADMISSIONS_DATA` | `./data` |
| `ADMISSIONS_HTTPS` | `0` (set `1` when everyone uses `https://`) |
| `ADMISSIONS_PROXY` | `0` (set `1` behind Caddy, Nginx or a tunnel so real client addresses are used) |
| `ADMISSIONS_REMEMBER_DAYS` | `7` (`0` removes Remember me; maximum 60) |
| `ANTHROPIC_API_KEY` | not set (optional; the key can instead be pasted in Users → Scan settings) |
| `ADMISSIONS_SCAN_MODEL` | `claude-sonnet-5-5` |

## Scanning a filled form

Optional. An administrator adds an Anthropic API key in **Users → Scan settings** (or sets `ANTHROPIC_API_KEY`). After that, **New Entry → Scan Filled Form** opens the phone camera, the photo is read by Claude, and the form opens pre-filled with unsure fields highlighted. Staff always review and press **Save Entry**; nothing is saved automatically, and the photo is not stored. The server needs internet access to `api.anthropic.com`. Anthropic bills the key's owner per scan (roughly a couple of rupees). The photo, which can include Aadhaar and phone numbers, is sent to Anthropic, so check their data terms against your privacy rules first. Details and troubleshooting are in GUIDE.md sections 6A and 7A.

## Data & backup

Everything lives in `data/admissions.db` (SQLite). If scanning is set up, the key is in `data/scan_key.txt`; it is left out of downloaded backups, so keep the folder private. To move to another PC, copy the whole folder. To restore, stop the app, replace the file with a backup and delete `admissions.db-wal` and `admissions.db-shm` if they exist.

## Customising

Streams, coaching, categories, sources and statuses are lists at the top of `app.py`; status colours are in `static/style.css` (`--st-*`) and `STATUS_FILL` in `app.py`.
