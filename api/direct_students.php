<?php
// Direct students API fetch with explicit cookie handling
header('Content-Type: application/json');
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Not logged in'
    ]);
    exit;
}

// First, send a sync request to ensure the session is established
$nodeUrl = 'http://localhost:3000/api/sync-user';
$userData = [
    'phpUser' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ]
];

$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($userData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

// Enable cookie handling
curl_setopt($ch, CURLOPT_COOKIEFILE, ""); // Initialize cookie handling
curl_setopt($ch, CURLOPT_COOKIEJAR, "");  // Save cookies between redirects

$syncResponse = curl_exec($ch);
$syncInfo = curl_getinfo($ch);
curl_close($ch);

if ($syncResponse === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Sync failed: ' . curl_error($ch)
    ]);
    exit;
}

$syncData = json_decode($syncResponse, true);

// Extract session ID from the sync response
$nodeSessionId = $syncData['session']['id'] ?? null;

if (!$nodeSessionId) {
    echo json_encode([
        'success' => false,
        'message' => 'No session ID returned from sync'
    ]);
    exit;
}

// Now fetch students with the same curl handle to preserve cookies
$studentsUrl = 'http://localhost:3000/api/students';
$ch = curl_init($studentsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

// Explicitly send the session cookie from the sync response
curl_setopt($ch, CURLOPT_COOKIEFILE, "");
curl_setopt($ch, CURLOPT_COOKIEJAR, "");

// Set explicit cookie header with the session ID we just got
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Cookie: connect.sid=' . $nodeSessionId
]);

$studentsResponse = curl_exec($ch);
curl_close($ch);

if ($studentsResponse === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch students: ' . curl_error($ch)
    ]);
    exit;
}

// Return the students API response directly
echo $studentsResponse;
?>