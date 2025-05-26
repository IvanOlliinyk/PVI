<?php
// Файл для діагностики проблем з API
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

header('Content-Type: application/json');

// Перевірка сесії та користувача
$sessionData = [
    'session_id' => session_id(),
    'session_name' => session_name(),
    'user_id' => $_SESSION['user_id'] ?? 'not set',
    'user_email' => $_SESSION['user_email'] ?? 'not set',
    'user_firstname' => $_SESSION['user_firstname'] ?? 'not set',
    'user_lastname' => $_SESSION['user_lastname'] ?? 'not set'
];

// Перевірка доступності Node.js сервера
$nodeStatus = 'unknown';
$nodeUrl = 'http://localhost:3001/api/health-check';
$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
$nodeResponse = curl_exec($ch);
$nodeHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($nodeResponse !== false) {
    $nodeStatus = "Connected (HTTP $nodeHttpCode)";
} else {
    $nodeStatus = "Failed to connect";
}

// Результат
echo json_encode([
    'success' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'session_data' => $sessionData,
    'node_server' => [
        'status' => $nodeStatus,
        'url' => $nodeUrl,
        'response' => $nodeResponse ? json_decode($nodeResponse) : null
    ],
    'cookies' => $_COOKIE
]);