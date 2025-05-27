<?php
// Set headers for all responses
header('Content-Type: application/json');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Check authentication for all actions except public ones
$publicActions = ['health-check'];
if (!isset($_SESSION['user_id']) && !in_array($_GET['action'] ?? '', $publicActions)) {
    echo json_encode([
        'success' => false,
        'message' => 'Authentication required'
    ]);
    exit;
}

// Get the requested action
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get-user-info':
        // Return current user information from PHP session
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $_SESSION['user_id'] ?? null,
                'email' => $_SESSION['user_email'] ?? null,
                'firstname' => $_SESSION['user_firstname'] ?? null,
                'lastname' => $_SESSION['user_lastname'] ?? null,
                'role' => $_SESSION['user_role'] ?? 'student'
            ]
        ]);
        break;

    case 'sync-to-node':
        // UPDATED PORT FROM 3001 TO 3000
        $nodeUrl = 'http://localhost:3000/api/sync-user';

        // Prepare user data from PHP session
        $userData = [
            'phpUser' => [
                'id' => $_SESSION['user_id'] ?? null,
                'email' => $_SESSION['user_email'] ?? null,
                'firstname' => $_SESSION['user_firstname'] ?? null,
                'lastname' => $_SESSION['user_lastname'] ?? null,
                'role' => $_SESSION['user_role'] ?? 'student'
            ]
        ];

        // Send request to Node.js server
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
        curl_close($ch);

        if ($response === false) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to connect to Node.js server',
                'error' => curl_error($ch)
            ]);
            exit;
        }

        echo $response; // Forward Node.js response
        break;

    case 'get-students':
        // UPDATED PORT FROM 3001 TO 3000
        $nodeUrl = 'http://localhost:3000/api/students';

        $ch = curl_init($nodeUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);
        curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to load students from Node.js server',
                'httpCode' => $httpCode
            ]);
            exit;
        }

        echo $response; // Forward Node.js response
        break;

    case 'health-check':
        // UPDATED PORT FROM 3001 TO 3000
        $nodeUrl = 'http://localhost:3000/api/health-check';

        $ch = curl_init($nodeUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        echo json_encode([
            'success' => $httpCode === 200,
            'php_session' => [
                'id' => session_id(),
                'user_id' => $_SESSION['user_id'] ?? null
            ],
            'node_status' => [
                'connected' => $response !== false,
                'http_code' => $httpCode,
                'response' => $response !== false ? json_decode($response, true) : null
            ]
        ]);
        break;

    default:
        echo json_encode([
            'success' => false,
            'message' => 'Unknown action: ' . $action
        ]);
}
?>