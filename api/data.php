<?php
header('Content-Type: application/json; charset=utf-8');
$dataFile = __DIR__ . '/../data/data.json';
$settingsFile = __DIR__ . '/../data/site_settings.json';
$revisionsFile = __DIR__ . '/../data/revisions.json';
$backupDir = __DIR__ . '/../backups';

function maybeBackup() {
    global $dataFile, $settingsFile, $backupDir;
    if (!is_dir($backupDir)) mkdir($backupDir, 0777, true);
    $today = date('Ymd');
    $files = glob("$backupDir/data_{$today}_*.json");
    if (!empty($files)) {
        maybePurgeBackups();
        return false;
    }
    $ts = date('Ymd_His');
    if (file_exists($dataFile)) {
        copy($dataFile, "$backupDir/data_$ts.json");
    }
    if (file_exists($settingsFile)) {
        copy($settingsFile, "$backupDir/site_settings_$ts.json");
    }
    maybePurgeBackups();
    return true;
}

function maybePurgeBackups() {
    global $backupDir;
    $cutoff = strtotime('-60 days');
    foreach (glob("$backupDir/*.json") as $f) {
        $mtime = filemtime($f);
        if ($mtime !== false && $mtime < $cutoff) unlink($f);
    }
}

function addRevision($type, $clientId, $snapshot, $description) {
    global $revisionsFile;
    $revs = [];
    if (file_exists($revisionsFile)) {
        $revs = json_decode(file_get_contents($revisionsFile), true);
        if (!is_array($revs)) $revs = [];
    }
    $cutoff = strtotime('-30 days');
    $filtered = [];
    foreach ($revs as $r) {
        $ts = strtotime($r['timestamp'] ?? '');
        if ($ts !== false && $ts >= $cutoff) $filtered[] = $r;
    }
    $maxId = 0;
    foreach ($filtered as $r) { if (($r['id'] ?? 0) > $maxId) $maxId = $r['id']; }
    $filtered[] = ['id' => $maxId + 1, 'timestamp' => date('c'), 'type' => $type, 'clientId' => $clientId, 'snapshot' => $snapshot, 'description' => $description];
    file_put_contents($revisionsFile, json_encode($filtered, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['action']) && $_GET['action'] === 'get_revisions') {
        $revs = [];
        if (file_exists($revisionsFile)) {
            $revs = json_decode(file_get_contents($revisionsFile), true);
            if (!is_array($revs)) $revs = [];
        }
        echo json_encode(['revisions' => $revs], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!file_exists($dataFile)) { http_response_code(404); echo json_encode(['error' => 'Data file not found']); exit; }
    $data = json_decode(file_get_contents($dataFile), true);
    if (!$data) { http_response_code(500); echo json_encode(['error' => 'Failed to read data']); exit; }
    if (file_exists($settingsFile)) {
        $settings = json_decode(file_get_contents($settingsFile), true);
        if (is_array($settings)) {
            if (isset($settings['siteName'])) {
                $data['siteName'] = $settings['siteName'];
            }
            if (isset($settings['stylists']) && is_array($settings['stylists'])) {
                $data['stylists'] = $settings['stylists'];
            }
        }
    }
    if (!isset($data['stylists']) || !is_array($data['stylists'])) {
        $data['stylists'] = [['machine' => 'stylist1', 'display' => 'Stylist 1', 'active' => true]];
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['action'])) { http_response_code(400); echo json_encode(['error' => 'Invalid request']); exit; }
    $raw = file_get_contents($dataFile);
    $data = json_decode($raw, true);
    if (!$data) { http_response_code(500); echo json_encode(['error' => 'Failed to read data']); exit; }
    switch ($input['action']) {
        case 'update_client':
            $clientId = $input['id'] ?? null;
            $fields  = $input['fields'] ?? [];
            if (!$clientId || !$fields) { http_response_code(400); echo json_encode(['error' => 'Missing id or fields']); exit; }
            $found = false;
            foreach ($data['clients'] as &$c) {
                if ((int)$c['id'] === (int)$clientId) {
                    foreach ($fields as $key => $value) {
                        if ($key !== 'id' && $key !== 'appointments' && $key !== '_name' && $key !== 'totalAppointments') {
                            $c[$key] = $value;
                        }
                    }
                    $found = true; break;
                }
            }
            if (!$found) { http_response_code(404); echo json_encode(['error' => 'Client not found']); exit; }
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $client = null;
            foreach ($data['clients'] as $c) { if ((int)$c['id'] === (int)$clientId) { $client = $c; break; } }
            if ($client) addRevision('client_edit', $clientId, $client, 'Updated client');
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'update_service_types':
            $types = $input['serviceTypes'] ?? [];
            if (!is_array($types)) { http_response_code(400); echo json_encode(['error' => 'Invalid serviceTypes']); exit; }
            $data['serviceTypes'] = $types;
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $settings = [];
            if (file_exists($settingsFile)) {
                $settings = json_decode(file_get_contents($settingsFile), true);
                if (!is_array($settings)) $settings = [];
            }
            if (isset($input['siteName'])) {
                $settings['siteName'] = $input['siteName'];
            }
            if (isset($input['stylists']) && is_array($input['stylists'])) {
                $settings['stylists'] = $input['stylists'];
            } elseif (!isset($settings['stylists'])) {
                $settings['stylists'] = [['machine' => 'stylist1', 'display' => 'Stylist 1', 'active' => true]];
            }
            file_put_contents($settingsFile, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'move_appointment':
            $clientId = $input['clientId'] ?? null;
            $oldDate = $input['oldDate'] ?? null;
            $oldTime = $input['oldTime'] ?? null;
            $newDate = $input['newDate'] ?? null;
            $newTime = $input['newTime'] ?? null;
            if (!$clientId || !$oldDate || !$oldTime || !$newDate || !$newTime) { http_response_code(400); echo json_encode(['error' => 'Missing fields']); exit; }
            $found = false;
            foreach ($data['clients'] as &$c) {
                if ((int)$c['id'] === (int)$clientId) {
                    foreach ($c['appointments'] as &$a) {
                        if ($a['date'] === $oldDate && $a['time'] === $oldTime) {
                            $a['date'] = $newDate;
                            $a['time'] = $newTime;
                            $found = true; break 2;
                        }
                    }
                }
            }
            if (!$found) { http_response_code(404); echo json_encode(['error' => 'Appointment not found']); exit; }
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $appt = null;
            foreach ($data['clients'] as $c) { if ((int)$c['id'] === (int)$clientId) { foreach ($c['appointments'] as $a) { if ($a['date'] === $newDate && $a['time'] === $newTime) { $appt = $a; break 2; } } } }
            if ($appt) { $appt['clientId'] = $clientId; addRevision('appointment_move', $clientId, $appt, "Moved appointment from $oldDate $oldTime to $newDate $newTime"); }
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'update_appointment':
            $clientId = $input['clientId'] ?? null;
            $date = $input['date'] ?? null;
            $time = $input['time'] ?? null;
            $fields = $input['fields'] ?? [];
            if (!$clientId || !$date || !$time || !is_array($fields)) { http_response_code(400); echo json_encode(['error' => 'Missing fields']); exit; }
            $found = false;
            foreach ($data['clients'] as &$c) {
                if ((int)$c['id'] === (int)$clientId) {
                    foreach ($c['appointments'] as &$a) {
                        if ($a['date'] === $date && $a['time'] === $time) {
                            foreach ($fields as $k => $v) { $a[$k] = $v; }
                            $found = true; break 2;
                        }
                    }
                }
            }
            if (!$found) { http_response_code(404); echo json_encode(['error' => 'Appointment not found']); exit; }
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            $appt = null;
            foreach ($data['clients'] as $c) { if ((int)$c['id'] === (int)$clientId) { foreach ($c['appointments'] as $a) { if ($a['date'] === $fields['date'] && $a['time'] === $fields['time']) { $appt = $a; break 2; } } } }
            if ($appt) { $appt['clientId'] = $clientId; addRevision('appointment_edit', $clientId, $appt, 'Updated appointment'); }
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'create_appointment':
            $clientId = $input['clientId'] ?? null;
            $date = $input['date'] ?? null;
            $time = $input['time'] ?? null;
            $service = $input['service'] ?? '';
            $price = $input['price'] ?? '';
            $duration = $input['duration'] ?? '60';
            $stylist = $input['stylist'] ?? 'stylist1';
            if (!$clientId || !$date || !$time) { http_response_code(400); echo json_encode(['error' => 'Missing required fields']); exit; }
            $found = false;
            foreach ($data['clients'] as &$c) {
                if ((int)$c['id'] === (int)$clientId) {
                    if (!isset($c['appointments']) || !is_array($c['appointments'])) $c['appointments'] = [];
                    $c['appointments'][] = ['date' => $date, 'time' => $time, 'service' => $service, 'price' => $price, 'duration' => $duration, 'stylist' => $stylist];
                    $found = true; break;
                }
            }
            if (!$found) { http_response_code(404); echo json_encode(['error' => 'Client not found']); exit; }
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            addRevision('appointment_create', $clientId, ['clientId' => $clientId, 'date' => $date, 'time' => $time, 'service' => $service, 'price' => $price, 'duration' => $duration, 'stylist' => $stylist], "Created appointment on $date at $time");
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'delete_appointment':
            $clientId = $input['clientId'] ?? null;
            $date = $input['date'] ?? null;
            $time = $input['time'] ?? null;
            if (!$clientId || !$date || !$time) { http_response_code(400); echo json_encode(['error' => 'Missing fields']); exit; }
            $found = false;
            foreach ($data['clients'] as &$c) {
                if ((int)$c['id'] === (int)$clientId && isset($c['appointments'])) {
                    foreach ($c['appointments'] as $i => $a) {
                        if ($a['date'] === $date && $a['time'] === $time) {
                            array_splice($c['appointments'], $i, 1);
                            $found = true; break 2;
                        }
                    }
                }
            }
            if (!$found) { http_response_code(404); echo json_encode(['error' => 'Appointment not found']); exit; }
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            addRevision('appointment_delete', $clientId, ['clientId' => $clientId, 'date' => $date, 'time' => $time], "Deleted appointment on $date at $time");
            maybeBackup(); echo json_encode(['success' => true]);
            break;
        case 'create_client':
            $firstName = $input['firstName'] ?? '';
            $lastName = $input['lastName'] ?? '';
            $phone = $input['phone'] ?? '';
            if (!trim($firstName) && !trim($lastName)) { http_response_code(400); echo json_encode(['error' => 'Name required']); exit; }
            $maxId = 0;
            foreach ($data['clients'] as $c) { if ((int)$c['id'] > $maxId) $maxId = (int)$c['id']; }
            $newId = $maxId + 1;
            $newClient = ['id' => $newId, 'firstName' => $firstName, 'lastName' => $lastName, 'phone1' => $phone, 'appointments' => []];
            $data['clients'][] = $newClient;
            file_put_contents($dataFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            addRevision('client_create', $newId, $newClient, "Created client: " . trim("$firstName $lastName"));
            maybeBackup(); echo json_encode(['success' => true, 'clientId' => $newId]);
            break;
        case 'create_backup':
            maybePurgeBackups();
            $ts = date('Ymd_His');
            $ok = true;
            if (!is_dir($backupDir)) mkdir($backupDir, 0777, true);
            if (file_exists($dataFile)) copy($dataFile, "$backupDir/data_$ts.json"); else $ok = false;
            if (file_exists($settingsFile)) copy($settingsFile, "$backupDir/site_settings_$ts.json"); else $ok = false;
            echo json_encode(['success' => $ok, 'file' => "data_$ts.json"]);
            break;
        default: http_response_code(400); echo json_encode(['error' => 'Unknown action']);
    }
    exit;
}
http_response_code(405); echo json_encode(['error' => 'Method not allowed']);
