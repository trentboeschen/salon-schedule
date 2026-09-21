## Data Cleanup / Export Tooling

These scripts convert the salon's old CSV exports into the `data.json` payload the app reads. No build step is involved — the app is plain static files.

```bash
python3 scripts/clean_clients.py csv/CLIENTS.TXT \
  --json-fallback clients.json -o csv/CLIENTS_CLEAN.TXT && \
python3 scripts/combine_csv_export.py csv/CLIENTS_CLEAN.TXT csv/PPAPP003.TXT \
  --no-empty -o data.json
```

Run them whenever a fresh CSV export is dropped in, to regenerate `data.json`.

- `clean_clients.py` — dedupe/clean the clients CSV export.
- `combine_csv_export.py` — merge clients + appointments CSVs into `data.json`.
- The retired generator (`build_csv_viewer.py`) is kept under `scripts/archive/` for reference; it is no longer used.

## App Files (static, no build)

```
/var/www/html/
  index.html      static page shell
  css/app.css     styles
  js/app.js       app logic
  api/data.php    data read/write API
  data/*.json     data files
```
