<?php
header('Content-Type: application/json');
session_start();

// Check authentication
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Not logged in'
    ]);
    exit;
}

// Include database configuration
require_once __DIR__ . '/../config/config.php';

try {
    // Get database connection
    $pdo = getDbConnection();

    // Query to get all students from the MySQL database
    $stmt = $pdo->query('SELECT * FROM students');
    $students = [];

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $students[] = [
            'user_id' => $row['user_id'] ?? $row['id'],  // Use user_id if available, otherwise use id
            'id' => $row['id'],
            'firstname' => $row['firstname'],
            'lastname' => $row['lastname'],
            'student_group' => $row['student_group'],
            'email' => '' // The email might not be available in students table
        ];
    }

    // Sync these students to Node.js for messaging
    $token = base64_encode(json_encode([
        'user_id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'timestamp' => time()
    ]));

    // Sync each student to Node.js for chat functionality
    foreach ($students as $student) {
        // Only sync if there's a user_id (students should be linked to users)
        if (!empty($student['user_id'])) {
            $nodeUrl = 'http://localhost:3000/api/sync-mysql-student';
            $ch = curl_init($nodeUrl);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($student));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json',
                'Authorization: Bearer ' . $token
            ]);
            curl_exec($ch);
            curl_close($ch);
        }
    }

    echo json_encode([
        'success' => true,
        'students' => $students
    ]);

} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
