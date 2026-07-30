# Salon Appointment Manager

A web-based appointment scheduling system for small salons. View, add, edit, move, and delete appointments for multiple stylists. Runs from any web server with PHP.

## Quick Start

Copy all files to a PHP-enabled web server. Open the URL for the server in a browser. The main screen shows the appointment timeline. Use the **gear icon** (top-right) to open settings and set your salon name, service types, and stylists.

## Data Files

All data is stored under the `data/` folder as plain JSON files — easy to back up or edit manually:

| File | What it stores |
|------|---------------|
| `data/data.json` | All clients and appointments |
| `data/site_settings.json` | Salon name, service types, stylist list |
| `data/revisions.json` | Change history (auto-trimmed to 30 days) |

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

## File Permissions

The web server needs write access to the `data/` folder and its files. If saves fail, check that Apache's user (`www-data`) can write to:

```
data/         (chmod 777)
backups/      (chmod 777)
```

## Requirements

- Web server with PHP (any version that supports `json_encode`/`json_decode`)
