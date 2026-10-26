# Sri R.V. PU College, Kolar: website + Admission Manager

Two linked projects in one repository:

| Project | Folder | Live now | Future address |
|---|---|---|---|
| 1. College website | `website/` | https://srirvpucollege.vercel.app | srirvpucollege.com |
| 2. Admission portal (dashboard) | repository root (`app.py`, `static/`) | https://rv-admission-portal.vercel.app | admissionportal.srirvpucollege.com |

Every enquiry form on the website lands in the portal instantly as a **New** enquiry with source **Website** and a follow-up due today. Full setup and daily use: **[GUIDE.md](GUIDE.md)** (section 12 covers hosting and the domain).

## Admission portal

Built from the paper *Student Enquiry Form*. Runs on phones, tablets and laptops.

- **Dashboard:** KPI cards, enquiries chart, counselling funnel, follow-ups, website-leads banner. Admin also sees the Counsellor track.
- **Enquiries grid:** Excel-style sheet, search, filters (stream, coaching, source, counsellor, counselling, follow-up, dates), status colours, status change in the grid. On phones, filters fold behind one button.
- **New entry:** enter manually, or scan a filled paper form with the phone camera (AI reads it; staff check and save).
- **Siblings:** name and class of brothers or sisters currently studying at Sri R.V. School / PU College only, with that rule shown clearly on the form, the printed form and the website.
- **Telecalling:** a source option; when ticked, *Telecalling done by* is required. In the Excel export the caller's name is printed under "Telecalling" in the Source column. Scanned forms read the "Called by" line too.
- **Print / blank form:** one-page A4 form matching the enquiry form (with siblings and Telecalling), print or download as PDF.
- **Export to Excel** (Aadhaar only for admin), **Import from Excel** (admin; reads the existing Walk-In Enquiry List, skips duplicates), **sample data** for demos (one-click remove).
- The **Download backup** button has been removed from the website.

| Role | Can do |
|---|---|
| Admin | Everything: users, delete, import, scan settings, Activity log, Counsellor track, management remark |
| Counsellor | Add/edit enquiries, change status, export (no Aadhaar). No Users, Activity log or Counsellor track; Follow-ups fill the dashboard's bottom row |
| Viewer | Same screens as a counsellor, read only, Aadhaar masked, no export |

Every rule is enforced on the server, not just hidden in the screen.

## Data storage

- **Online:** Neon Postgres (Singapore) through Vercel, free tier, no server to manage. Set by `DATABASE_URL`.
- **Offline / own server:** without `DATABASE_URL` the same code uses a single SQLite file in `data/` (run `start.bat` or `./start.sh`, see GUIDE.md).
- GitHub is used for the code only, never for student data (Aadhaar and phone numbers must not live in a repository).

## Security

Salted password hashes, forced change on first login, lockout after 5 wrong passwords, per-network throttling (stored in the database so it works across servers), CSRF tokens, strict CSP, parameterised SQL, spreadsheet-formula guarding, edit-conflict protection with a version number, Aadhaar masking. The public website endpoint only accepts the college's own website addresses, has spam traps and a per-connection limit.

## Developing

```
pip install -r requirements.txt
python app.py            # http://localhost:8000, SQLite in ./data
cd website && python -m http.server 8768   # website, talks to the local portal
```
Lists (streams, coaching, sources, statuses) are at the top of `app.py`.
