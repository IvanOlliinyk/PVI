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

// Create a simple token with user data
$token = base64_encode(json_encode([
    'user_id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'] ?? '',
    'firstname' => $_SESSION['user_firstname'] ?? '',
    'lastname' => $_SESSION['user_lastname'] ?? '',
    'timestamp' => time()
]));

// Call Node.js API with token in the header
$studentsUrl = 'http://localhost:3000/api/token-students';
$ch = curl_init($studentsUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Bearer ' . $token  // Pass token directly in header
]);

$studentsResponse = curl_exec($ch);
$studentsStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($studentsResponse === false) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to connect to messaging server'
    ]);
    exit;
}

// Return the students API response directly
echo $studentsResponse;
?>