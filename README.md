# Salon Appointment Manager

A web-based appointment scheduling system for small salons. View, add, edit, move, and delete appointments for multiple stylists. Runs from any web server with PHP.

## Quick Start

Open `http://localhost/` (or your server's address) in a browser. The main screen shows the appointment timeline. Use the **gear icon** (top-right) to open settings and set your salon name, service types, and stylists.

## Data Files & Security

All data is stored under the `data/` folder as plain JSON files[cite: 2]:

| File | What it stores |
|------|---------------|
| `data/data.json` | All clients and appointments[cite: 2] |
| `data/site_settings.json` | Salon name, service types, stylist list, products, tax rate[cite: 2, 4, 7] |
| `data/revisions.json` | Change history (auto-trimmed to 30 days)[cite: 2] |

### Directory Permissions & Hardening

The web server process (`www-data` on Apache/Ubuntu) requires exclusive read/write access to the data directories[cite: 2]. For security, files should **not** be set to world-writable (`777`)[cite: 2].

**Set ownership and directory permissions:**
   Restrict file access so only the web server user can read and modify the JSON files:
   ```bash
   sudo chown -R www-data:www-data data/ backups/
   sudo chmod -R 750 data/ backups/

**Block direct HTTP downloads (.htaccess):**
   To prevent public browsers from downloading raw JSON files directly, place a root-level .htaccess file in your web directory:
   ```bash
   RewriteEngine On
   # Block direct web access to data and backup stores
   RewriteRule ^(data|backups)(/.*)?$ - [F,L]


## Backups

A **Backup** button is in the settings panel (gear icon). It saves timestamped copies of `data.json` and `site_settings.json` into the `backups/` folder. Automatic backups also run once per day whenever data changes.

Backups older than 60 days are automatically removed. If you need long-term archiving, copy files out of the `backups/` folder manually.

## Appointment Timeline

- **Day view** — appointments stacked in a single column, 8 AM to 8 PM
- **Week view** — seven columns, one per day
- Click an appointment block to see details, edit, or delete
- Drag an appointment block to reschedule (snaps to 15-minute increments)

## Stylists

- Add or remove stylists in the settings panel
- Each appointment is assigned to one stylist
- Use the stylist filter (next to the date picker) to view one stylist's schedule
- Inactive stylists are hidden from the filter but existing appointments still show their name

## Client Management

- Search clients by name in the sidebar
- Click a client to see their profile and full appointment history
- Edit client details (name, phone) from the profile view
- Add new clients on the fly when creating an appointment

## Change History

Every change (create/edit/move/delete appointment, create/edit client) is recorded in `data/revisions.json` with a timestamp. Access the log by adding `?revisions` to the URL (e.g. `http://localhost/?revisions`). Entries older than 30 days are automatically removed.

## Technical Overview

- **Frontend**: Plain HTML + CSS + JavaScript (no frameworks)
- **Backend**: Single PHP file (`api/data.php`) handling all data operations
- **Data format**: JSON files on disk (no database required)
- **PHP required**: The viewer needs PHP to save changes. Without it, the page loads in read-only mode.

## App Files

The app is plain static files — no build step required. Just serve the folder:

```
index.html         (page shell)
css/app.css        (styles)
js/app.js          (app logic)
api/data.php       (data read/write API)
data/*.json        (data files)
```

To update the app, edit these files directly and refresh the browser.

## Data Cleanup / Export Tools

The Python helpers prepare old CSV exports into the `data.json` payload the app reads:

```bash
python3 scripts/clean_clients.py csv/CLIENTS.TXT \
  --json-fallback clients.json -o csv/CLIENTS_CLEAN.TXT && \
python3 scripts/combine_csv_export.py csv/CLIENTS_CLEAN.TXT csv/PPAPP003.TXT \
  --no-empty -o data.json
```

Run them whenever the CSV exports are refreshed to regenerate `data.json`. The retired generator script is kept under `scripts/archive/`.

## File Permissions

The web server needs write access to the `data/` folder and its files. If saves fail, check that Apache's user (`www-data`) can write to:

```
data/         (chmod 777)
backups/      (chmod 777)
```

## Requirements

- Web server with PHP (any version that supports `json_encode`/`json_decode`)
- Python 3.6+ (only needed for the deploy pipeline, not for running the app)
