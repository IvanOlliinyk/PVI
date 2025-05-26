<?php
// Цей файл просто передає інформацію про користувача в JavaScript
error_reporting(E_ALL);
ini_set('display_errors', 0);
session_start();

header('Content-Type: application/json');

// Перевірка авторизації
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Користувач не авторизований',
        'session_data' => [
            'id' => session_id(),
            'name' => session_name()
        ]
    ]);
    exit;
}

// Отримуємо дані користувача з сесії
echo json_encode([
    'success' => true,
    'user' => [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ]
]);
?>