<?php
header('Content-Type: application/json');
session_start();

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Not logged in'
    ]);
    exit;
}

// Get request body
$requestData = json_decode(file_get_contents('php://input'), true);

if (!$requestData || !isset($requestData['name']) || !isset($requestData['memberIds'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing required data'
    ]);
    exit;
}

// Create authentication token
$token = base64_encode(json_encode([
    'user_id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'] ?? '',
    'firstname' => $_SESSION['user_firstname'] ?? '',
    'lastname' => $_SESSION['user_lastname'] ?? '',
    'timestamp' => time()
]));

// Forward request to Node.js
$nodeUrl = 'http://localhost:3000/api/chat-rooms';
$ch = curl_init($nodeUrl);

// Set request options
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Handle response
if ($response === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Connection error: ' . $error
    ]);
    exit;
}

// Forward the Node.js response directly
echo $response;
?>