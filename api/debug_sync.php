<?php
header('Content-Type: application/json');
session_start();

// Log function to record each step
function logStep($step, $details = null) {
    return [
        'step' => $step,
        'time' => date('H:i:s'),
        'details' => $details
    ];
}

$logs = [];
$logs[] = logStep("Started debug process");

// Check PHP session
if (!isset($_SESSION['user_id'])) {
    $logs[] = logStep("PHP session check", "No user_id in session");
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated in PHP session',
        'logs' => $logs
    ]);
    exit;
}

$logs[] = logStep("PHP session check", [
    'user_id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'] ?? 'not set',
    'name' => ($_SESSION['user_firstname'] ?? '') . ' ' . ($_SESSION['user_lastname'] ?? ''),
    'session_id' => session_id()
]);

// Prepare user data for sync
$userData = [
    'phpUser' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ]
];

$logs[] = logStep("Prepared user data", $userData);

// First check if Node.js server is running
$healthUrl = 'http://localhost:3000/api/health-check';
$logs[] = logStep("Checking Node.js server", $healthUrl);

$ch = curl_init($healthUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
$healthResponse = curl_exec($ch);
$healthCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$healthError = curl_error($ch);
curl_close($ch);

if ($healthResponse === false) {
    $logs[] = logStep("Node.js server check failed", [
        'error' => $healthError
    ]);
    echo json_encode([
        'success' => false,
        'message' => 'Node.js server is not accessible: ' . $healthError,
        'logs' => $logs
    ]);
    exit;
}

$logs[] = logStep("Node.js server check succeeded", [
    'http_code' => $healthCode,
    'response' => json_decode($healthResponse, true)
]);

// Try direct sync to Node.js
$nodeUrl = 'http://localhost:3000/api/sync-user';
$logs[] = logStep("Attempting to sync with Node.js", $nodeUrl);

$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($userData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());

$syncResponse = curl_exec($ch);
$syncInfo = curl_getinfo($ch);
$syncError = curl_error($ch);
curl_close($ch);

$logs[] = logStep("Sync attempt completed", [
    'success' => $syncResponse !== false,
    'http_code' => $syncInfo['http_code'],
    'curl_error' => $syncError,
    'request_size' => $syncInfo['request_size'],
    'total_time' => $syncInfo['total_time']
]);

if ($syncResponse === false) {
    $logs[] = logStep("Sync failed", [
        'error' => $syncError
    ]);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to connect to Node.js sync endpoint: ' . $syncError,
        'logs' => $logs
    ]);
    exit;
}

$syncData = json_decode($syncResponse, true);
$logs[] = logStep("Sync response parsed", $syncData);

if ($syncInfo['http_code'] !== 200 || !isset($syncData['success']) || $syncData['success'] !== true) {
    $logs[] = logStep("Sync unsuccessful", [
        'http_code' => $syncInfo['http_code'],
        'response' => $syncData
    ]);
    echo json_encode([
        'success' => false,
        'message' => 'Node.js rejected the sync request',
        'sync_status' => [
            'http_code' => $syncInfo['http_code'],
            'response' => $syncData
        ],
        'logs' => $logs
    ]);
    exit;
}

$logs[] = logStep("Sync successful", $syncData);

// Verify synced session by calling students API
$studentsUrl = 'http://localhost:3000/api/students';
$logs[] = logStep("Verifying sync with students API", $studentsUrl);

$ch = curl_init($studentsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

$studentsResponse = curl_exec($ch);
$studentsInfo = curl_getinfo($ch);
$studentsError = curl_error($ch);
curl_close($ch);

if ($studentsResponse === false) {
    $logs[] = logStep("Students API check failed", [
        'error' => $studentsError
    ]);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to verify sync with students API: ' . $studentsError,
        'sync_status' => [
            'success' => true,
            'response' => $syncData
        ],
        'logs' => $logs
    ]);
    exit;
}

$studentsData = json_decode($studentsResponse, true);
$logs[] = logStep("Students API response", [
    'http_code' => $studentsInfo['http_code'],
    'success' => isset($studentsData['success']) ? $studentsData['success'] : false,
    'student_count' => isset($studentsData['students']) ? count($studentsData['students']) : 0
]);

echo json_encode([
    'success' => $studentsInfo['http_code'] === 200 && isset($studentsData['success']) && $studentsData['success'] === true,
    'message' => $studentsInfo['http_code'] === 200 && isset($studentsData['success']) && $studentsData['success'] === true
        ? 'Session successfully synchronized and verified'
        : 'Sync completed but verification failed',
    'sync_status' => [
        'success' => true,
        'response' => $syncData
    ],
    'students_check' => [
        'http_code' => $studentsInfo['http_code'],
        'response' => $studentsData
    ],
    'logs' => $logs
]);
?>