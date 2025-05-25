<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo json_encode([
    'success' => true,
    'message' => 'API працює',
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'php_version' => PHP_VERSION,
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'time' => date('Y-m-d H:i:s')
]);
?>