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

// Create authentication token
$token = base64_encode(json_encode([
    'user_id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'] ?? '',
    'firstname' => $_SESSION['user_firstname'] ?? '',
    'lastname' => $_SESSION['user_lastname'] ?? '',
    'timestamp' => time()
]));

echo json_encode([
    'success' => true,
    'token' => $token,
    'user' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? ''
    ]
]);
?>
