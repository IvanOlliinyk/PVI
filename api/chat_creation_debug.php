<?php
// Set proper headers for JSON
header('Content-Type: application/json');
session_start();

// Enable detailed error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display in browser but capture them

// Log function
function writeLog($message, $data = null) {
    $log = date('Y-m-d H:i:s') . " - " . $message;
    if ($data !== null) {
        $log .= " - " . (is_string($data) ? $data : json_encode($data));
    }
    file_put_contents(__DIR__ . '/../logs/chat_debug.log', $log . "\n", FILE_APPEND);
}

writeLog("Chat debug script started");

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Not authenticated',
        'session_data' => $_SESSION
    ]);
    exit;
}

writeLog("User is authenticated", $_SESSION['user_id']);

// Get request data
$rawInput = file_get_contents('php://input');
writeLog("Raw input received", $rawInput);

try {
    // Parse request
    $requestData = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON parse error: " . json_last_error_msg());
    }

    writeLog("Request decoded", $requestData);

    // Validate request
    if (!isset($requestData['name']) || !isset($requestData['memberIds'])) {
        throw new Exception("Missing required fields: name and/or memberIds");
    }

    // Prepare chat request
    $chatData = [
        'name' => $requestData['name'],
        'description' => $requestData['description'] ?? '',
        'memberIds' => array_map('intval', $requestData['memberIds']),
        'isGroup' => isset($requestData['isGroup']) ? (bool)$requestData['isGroup'] : true
    ];

    // Create token
    $tokenData = [
        'user_id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'timestamp' => time()
    ];
    $token = base64_encode(json_encode($tokenData));
    writeLog("Token created", $tokenData);

    // Initialize curl connection to Node.js server
    $nodeUrl = 'http://localhost:3000/api/chat-rooms';
    writeLog("Making request to", $nodeUrl);

    $ch = curl_init($nodeUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => json_encode($chatData),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . $token
        ]
    ]);

    // Execute the request
    $response = curl_exec($ch);
    $curlInfo = curl_getinfo($ch);
    $curlError = curl_error($ch);
    curl_close($ch);

    writeLog("curl response code", $curlInfo['http_code']);

    if ($curlError) {
        throw new Exception("curl error: " . $curlError);
    }

    if ($curlInfo['http_code'] >= 400) {
        writeLog("HTTP error response", ['code' => $curlInfo['http_code'], 'response' => $response]);
        throw new Exception("HTTP error: " . $curlInfo['http_code']);
    }

    // Check for HTML response instead of JSON
    if (strpos($response, '<!DOCTYPE') !== false || strpos($response, '<html') !== false) {
        writeLog("Received HTML instead of JSON", substr($response, 0, 500));
        throw new Exception("Server returned HTML instead of JSON");
    }

    // Try to parse the response
    $result = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        writeLog("JSON parse error", ['error' => json_last_error_msg(), 'response' => $response]);
        throw new Exception("Failed to parse response as JSON: " . json_last_error_msg());
    }

    writeLog("Successfully parsed response", $result);

    // Return the result as JSON
    echo $response;

} catch (Exception $e) {
    writeLog("Error occurred", $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug_info' => [
            'time' => date('Y-m-d H:i:s'),
            'request_data' => $requestData ?? null,
            'curl_info' => $curlInfo ?? null,
            'curl_error' => $curlError ?? null,
            'response_preview' => $response ? substr($response, 0, 1000) : null
        ]
    ]);
}
?>