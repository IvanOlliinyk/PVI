<?php
// One-time session synchronization script
header('Content-Type: application/json');
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated in PHP session'
    ]);
    exit;
}

// Prepare user data from PHP session
$userData = [
    'phpUser' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ]
];

// Send sync request to Node.js
$nodeUrl = 'http://localhost:3000/api/sync-user';
$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($userData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to connect to Node.js server: ' . $error
    ]);
    exit;
}

// Verify synchronization by checking students endpoint
$studentsUrl = 'http://localhost:3000/api/students';
$ch2 = curl_init($studentsUrl);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Accept: application/json']);
curl_setopt($ch2, CURLOPT_COOKIE, session_name() . '=' . session_id());
$studentsResponse = curl_exec($ch2);
$studentsStatus = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo json_encode([
    'sync_status' => [
        'success' => $httpCode === 200,
        'http_code' => $httpCode,
        'response' => json_decode($response, true)
    ],
    'students_check' => [
        'success' => $studentsStatus === 200,
        'http_code' => $studentsStatus,
        'response' => json_decode($studentsResponse, true)
    ]
]);
?>