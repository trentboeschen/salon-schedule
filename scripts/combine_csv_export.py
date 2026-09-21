import csv, json, os, sys, re
from collections import defaultdict

def parse_clients(path):
    clients = {}
    with open(path, newline='') as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            cid = int(row[0])
            if cid in clients:
                continue
            clients[cid] = {
                'id': cid,
                'title': row[1],
                'firstName': row[2],
                'lastName': row[3],
                'address1': row[4],
                'address2': row[5],
                'city': row[6],
                'state': row[7],
                'zip': row[8],
                'phone1': row[9],
                'phone2': row[10],
                'phone3': row[11],
                'birthday': row[16],
                'firstVisit': row[14],
                'status': row[19],
            }
    return clients

def parse_appointments(path):
    appts = []
    with open(path, newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 6:
                continue
            date_str = row[0].strip()
            time_str = row[1].strip()
            duration = int(row[2].strip())
            client_name = row[3].strip()
            service = row[4].strip()
            price = row[5].strip()

            # Parse time
            try:
                import datetime
                t = datetime.datetime.strptime(time_str, '%I:%M %p')
                hour_min = f'{t.hour:02d}:{t.minute:02d}'
            except:
                hour_min = time_str

            # Parse date to standard format
            try:
                parts = date_str.split('/')
                iso_date = f'{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}'
            except:
                iso_date = date_str

            appts.append({
                'date': iso_date,
                'time': hour_min,
                'timeRaw': time_str,
                'duration': duration,
                'clientName': client_name,
                'service': service,
                'price': price,
            })
    return appts

def build_name_index(clients):
    index = defaultdict(list)
    for c in clients.values():
        full = f'{c["firstName"]} {c["lastName"]}'.strip().lower()
        index[full].append(c)
    return index

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Combine cleaned clients with CSV appointment export')
    parser.add_argument('clients_csv', help='Cleaned CLIENTS CSV file')
    parser.add_argument('appointments_csv', help='PPAPP003.TXT export file')
    parser.add_argument('--output', '-o', default='combined_export.json', help='Output JSON path')
    parser.add_argument('--client-ids', help='Comma-separated list of client IDs to filter (optional)')
    parser.add_argument('--no-empty', action='store_true', help='Exclude clients with no appointments')
    args = parser.parse_args()

    for p in [args.clients_csv, args.appointments_csv]:
        if not os.path.exists(p):
            print(f"Error: {p} not found", flush=True)
            sys.exit(1)

    filter_ids = None
    if args.client_ids:
        filter_ids = {int(x.strip()) for x in args.client_ids.split(',')}

    # Parse inputs
    print("Parsing clients...", flush=True)
    clients = parse_clients(args.clients_csv)
    print(f"  {len(clients)} unique clients", flush=True)

    print("Parsing appointments...", flush=True)
    appts = parse_appointments(args.appointments_csv)
    print(f"  {len(appts)} appointment rows", flush=True)

    # Build name → client index
    name_index = build_name_index(clients)

    # Match appointments to clients
    unmatched_names = set()
    multi_match_names = set()
    appt_count = 0

    # Per-client appointment lists
    client_appts = defaultdict(list)

    for a in appts:
        name_key = a['clientName'].lower().strip()
        matching = name_index.get(name_key, [])
        if not matching:
            unmatched_names.add(a['clientName'])
            continue

        appt_count += 1
        entry = {
            'date': a['date'],
            'time': a['time'],
            'duration': a['duration'],
            'service': a['service'],
            'price': a['price'],
        }

        for c in matching:
            cid = c['id']
            if filter_ids and cid not in filter_ids:
                continue
            client_appts[cid].append(entry)

        if len(matching) > 1:
            multi_match_names.add(a['clientName'])

    # Filter out empty clients if requested
    if args.no_empty:
        clients = {cid: c for cid, c in clients.items() if len(client_appts.get(cid, [])) > 0}

    # Build output structure
    output = {
        'source': 'ProSalon CSV Export (CLIENTS_CLEAN.TXT + PPAPP003.TXT)',
        'totalClients': len(clients) if not filter_ids else len(filter_ids),
        'totalAppointments': appt_count,
        'unmatchedAppointmentNames': sorted(unmatched_names) if unmatched_names else [],
        'ambiguousNameClients': len(multi_match_names),
        'clients': [],
    }

    for cid in sorted(clients.keys()):
        if filter_ids and cid not in filter_ids:
            continue
        c = clients[cid]
        entry = dict(c)
        entry['totalAppointments'] = len(client_appts.get(cid, []))
        entry['appointments'] = sorted(client_appts.get(cid, []),
                                       key=lambda x: (x['date'], x['time']))
        output['clients'].append(entry)

    with open(args.output, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {args.output}", flush=True)
    print(f"  {len(output['clients'])} clients with appointments", flush=True)
    print(f"  Total matched appointments: {appt_count}", flush=True)

    if unmatched_names:
        print(f"\nUnmatched appointment names ({len(unmatched_names)}):", flush=True)
        for n in sorted(unmatched_names)[:10]:
            print(f"  '{n}'", flush=True)

    if multi_match_names:
        print(f"\nAmbiguous (multiple clients share name, {len(multi_match_names)} names):", flush=True)
        for n in sorted(multi_match_names)[:10]:
            name_key = n.lower()
            ids = [c['id'] for c in name_index[name_key]]
            print(f"  '{n}' -> IDs {ids}", flush=True)

if __name__ == '__main__':
    main()
