import csv, io, json, os, re, sys

CLIENTS_TXT_FIELDS = [
    'id', 'title', 'firstName', 'lastName', 'address1', 'address2',
    'city', 'state', 'zip', 'phone1', 'phone2', 'phone3',
    'field13', 'field14', 'dateField1', 'dateField2', 'dateField3',
    'field18', 'field19', 'status',
]

def read_clients_json(path):
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        data = json.load(f)
    clients_list = data.get('clients', data if isinstance(data, list) else [])
    return {c['id']: c for c in clients_list if 'id' in c}

def try_parse_csv_line(raw_line):
    text = raw_line.decode('latin-1').rstrip('\r\n')
    if not text or text[0] != '"':
        return None
    try:
        reader = csv.reader(io.StringIO(text))
        fields = next(reader)
    except:
        return None
    if len(fields) != len(CLIENTS_TXT_FIELDS):
        return None
    if not fields[0].isdigit():
        return None
    return dict(zip(CLIENTS_TXT_FIELDS, fields))

def build_from_json(json_client):
    c = json_client
    return {
        'id': str(c.get('id', '')),
        'title': c.get('title', ''),
        'firstName': c.get('firstName', ''),
        'lastName': c.get('lastName', ''),
        'address1': c.get('address1', ''),
        'address2': c.get('address2', ''),
        'city': c.get('city', ''),
        'state': c.get('state', ''),
        'zip': c.get('zip', ''),
        'phone1': c.get('phone1', ''),
        'phone2': c.get('phone2', ''),
        'phone3': c.get('phone3', ''),
        'field13': '0',
        'field14': ' ',
        'dateField1': c.get('firstVisit', ''),
        'dateField2': '',
        'dateField3': c.get('birthday', ''),
        'field18': c.get('referredBy', ''),
        'field19': c.get('notes', ''),
        'status': c.get('status', '') if c.get('status') in ('A', 'I', 'D', 'M') else 'A',
    }

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Clean CLIENTS.TXT export from ProSalon')
    parser.add_argument('input', help='Path to CLIENTS.TXT')
    parser.add_argument('--output', '-o', default='CLIENTS_CLEAN.TXT', help='Output CSV path')
    parser.add_argument('--json-fallback', default=None, help='Path to clients.json')
    parser.add_argument('--summary', '-s', action='store_true', help='Show summary only')
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: {args.input} not found", flush=True)
        sys.exit(1)

    # Auto-detect fallback
    if args.json_fallback is None:
        for p in [os.path.join(os.path.dirname(args.input), '..', 'clients.json'),
                  os.path.join(os.path.dirname(os.path.dirname(args.input)), 'clients.json')]:
            if os.path.exists(p):
                args.json_fallback = p
                break

    json_clients = read_clients_json(args.json_fallback) if args.json_fallback else {}
    max_fallback_id = max(json_clients.keys()) if json_clients else 0
    print(f"Loaded {len(json_clients)} client profiles from fallback (max ID={max_fallback_id})", flush=True)

    with open(args.input, 'rb') as f:
        raw = f.read()

    lines = raw.split(b'\n')
    if lines and lines[-1] == b'':
        lines = lines[:-1]

    results = []
    stats = {'clean': 0, 'salvaged': 0, 'unrecoverable': 0, 'warnings': []}

    for i, line in enumerate(lines):
        if not line.strip():
            continue

        record = try_parse_csv_line(line)
        if record:
            results.append(record)
            stats['clean'] += 1
            continue

        # Try to extract client ID from the wreckage
        id_match = re.search(rb'"(\d+)"', line)
        cid = int(id_match.group(1)) if id_match else None

        if cid and cid in json_clients:
            record = build_from_json(json_clients[cid])
            results.append(record)
            stats['salvaged'] += 1
            stats['warnings'].append(f"Line {i}: ID {cid} corrupted, rebuilt from fallback")
        else:
            reason = f'no ID found' if cid is None else f'ID {cid} not in fallback (>max={max_fallback_id})'
            stats['warnings'].append(f"Line {i}: unrecoverable ({reason})")
            stats['unrecoverable'] += 1

    print(f"\nResults:", flush=True)
    print(f"  Clean records parsed:      {stats['clean']}", flush=True)
    print(f"  Recovered from fallback:   {stats['salvaged']}", flush=True)
    print(f"  Unrecoverable:             {stats['unrecoverable']}", flush=True)
    print(f"  Total output records:      {len(results)}", flush=True)

    if stats['warnings']:
        print(f"\nWarnings ({len(stats['warnings'])}):", flush=True)
        for w in stats['warnings'][:5]:
            print(f"  {w}", flush=True)
        if len(stats['warnings']) > 5:
            print(f"  ... and {len(stats['warnings']) - 5} more", flush=True)

    if args.summary:
        return

    with open(args.output, 'w', newline='') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(CLIENTS_TXT_FIELDS)
        for rec in results:
            row = [rec[f] for f in CLIENTS_TXT_FIELDS]
            writer.writerow(row)

    print(f"\nWrote {args.output}", flush=True)

if __name__ == '__main__':
    main()
