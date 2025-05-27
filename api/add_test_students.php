<?php
header('Content-Type: application/json');
session_start();

// Check if user is logged in (as security measure)
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Please log in first'
    ]);
    exit;
}

// Define test students
$testStudents = [
    [
        'email' => 'john.doe@example.com',
        'firstname' => 'John',
        'lastname' => 'Doe',
        'student_group' => 'PZ-11'
    ],
    [
        'email' => 'jane.smith@example.com',
        'firstname' => 'Jane',
        'lastname' => 'Smith',
        'student_group' => 'PZ-12'
    ],
    [
        'email' => 'alex.brown@example.com',
        'firstname' => 'Alex',
        'lastname' => 'Brown',
        'student_group' => 'PZ-21'
    ],
    [
        'email' => 'maria.garcia@example.com',
        'firstname' => 'Maria',
        'lastname' => 'Garcia',
        'student_group' => 'PZ-22'
    ],
    [
        'email' => 'david.wang@example.com',
        'firstname' => 'David',
        'lastname' => 'Wang',
        'student_group' => 'PZ-31'
    ]
];

// Create a token for authentication
$token = base64_encode(json_encode([
    'user_id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'] ?? '',
    'firstname' => $_SESSION['user_firstname'] ?? '',
    'lastname' => $_SESSION['user_lastname'] ?? '',
    'timestamp' => time(),
    'admin' => true // Mark as admin for this operation
]));

// Add each student to the Node.js database
$results = [];
foreach ($testStudents as $index => $student) {
    // Create a unique phpUserId for each test student (starting from 100)
    $phpUserId = 100 + $index;

    // Create a data structure with phpUserId
    $userData = array_merge($student, [
        'phpUserId' => $phpUserId,
        'role' => 'student'
    ]);

    // Send to Node.js API
    $url = 'http://localhost:3000/api/add-test-student';
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($userData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $token
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $results[] = [
        'student' => $student['firstname'] . ' ' . $student['lastname'],
        'success' => $httpCode === 200,
        'http_code' => $httpCode,
        'response' => $response ? json_decode($response, true) : null
    ];
}

// Return results
echo json_encode([
    'success' => true,
    'message' => 'Test students operation completed',
    'results' => $results
]);
?>