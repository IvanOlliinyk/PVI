<?php
header('Content-Type: application/json');
session_start();

// Test basic PHP session info
$sessionData = [
    'exists' => isset($_SESSION),
    'id' => session_id(),
    'user' => [
        'id' => $_SESSION['user_id'] ?? 'not set',
        'email' => $_SESSION['user_email'] ?? 'not set',
        'name' => isset($_SESSION['user_firstname']) ?
            $_SESSION['user_firstname'] . ' ' . $_SESSION['user_lastname'] : 'not set'
    ]
];

// UPDATED PORT FROM 3001 TO 3000
$nodeUrl = 'http://localhost:3000/api/health-check';
$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
$nodeResponse = curl_exec($ch);
$nodeStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// UPDATED PORT FROM 3001 TO 3000
$studentsUrl = 'http://localhost:3000/api/students';
$ch2 = curl_init($studentsUrl);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_CONNECTTIMEOUT, 3);
curl_setopt($ch2, CURLOPT_COOKIE, session_name() . '=' . session_id());
$studentsResponse = curl_exec($ch2);
$studentsStatus = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
$studentsError = curl_error($ch2);
curl_close($ch2);

echo json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'php_session' => $sessionData,
    'node_server_health' => [
        'url' => $nodeUrl,
        'connected' => $nodeResponse !== false,
        'http_code' => $nodeStatus,
        'error' => $curlError,
        'response' => $nodeResponse ? json_decode($nodeResponse, true) : null
    ],
    'students_endpoint' => [
        'url' => $studentsUrl,
        'connected' => $studentsResponse !== false,
        'http_code' => $studentsStatus,
        'error' => $studentsError,
        'response' => $studentsResponse ? json_decode($studentsResponse, true) : null
    ]
]);
?>