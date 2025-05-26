<?php
// Новий файл API для повідомлень з детальною обробкою помилок
error_reporting(E_ALL);
ini_set('display_errors', 0); // Не показуємо помилки в вихідному JSON

// Буферизуємо вивід
ob_start();

// Запускаємо сесію
session_start();

// Встановлюємо заголовки
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');

// Записуємо в лог для відлагодження
$logFile = __DIR__ . '/api_log.txt';
$logMessage = date('Y-m-d H:i:s') . " - API Request: " . $_SERVER['REQUEST_URI'] . "\n";
file_put_contents($logFile, $logMessage, FILE_APPEND);

try {
    // Перевіряємо чи є користувач в сесії
    if (!isset($_SESSION['user_id'])) {
        throw new Exception("Користувач не авторизований. Сесія не містить user_id.");
    }

    // Отримуємо дію
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    // Виконуємо відповідну дію
    switch ($action) {
        case 'sync-to-node':
            syncUserToNodeJS();
            break;

        case 'get-user-info':
            getUserInfo();
            break;

        default:
            throw new Exception("Невідома дія: $action");
    }
} catch (Exception $e) {
    // Записуємо помилку в лог
    $errorMessage = date('Y-m-d H:i:s') . " - ERROR: " . $e->getMessage() . "\n";
    file_put_contents($logFile, $errorMessage, FILE_APPEND);

    // Повертаємо помилку у JSON форматі
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
}

// Функція для синхронізації з Node.js
function syncUserToNodeJS() {
    global $logFile;

    // Підготовка даних користувача
    $userData = [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ];

    // Записуємо дані в лог
    $userDataLog = date('Y-m-d H:i:s') . " - User Data: " . json_encode($userData) . "\n";
    file_put_contents($logFile, $userDataLog, FILE_APPEND);

    // Підготовка запиту до Node.js
    $nodeUrl = 'http://localhost:3001/api/sync-user';
    $sessionCookie = session_name() . '=' . session_id();
    $postData = json_encode(['phpUser' => $userData]);

    // Налаштування cURL
    $ch = curl_init($nodeUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_COOKIE, $sessionCookie);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    // Виконання запиту
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    // Запис результату в лог
    $resultLog = date('Y-m-d H:i:s') . " - Node.js Response: Code=$httpCode, Error=$error, Result=$result\n";
    file_put_contents($logFile, $resultLog, FILE_APPEND);

    // Перевірка на успішний запит
    if ($httpCode == 200 && $result) {
        // Передаємо відповідь від Node.js
        echo $result;
    } else {
        // Формуємо нашу відповідь при помилці
        echo json_encode([
            'success' => false,
            'message' => 'Помилка з\'єднання з сервером повідомлень',
            'debug' => [
                'httpCode' => $httpCode,
                'error' => $error,
                'url' => $nodeUrl
            ]
        ]);
    }
}

// Функція для отримання інформації про користувача
function getUserInfo() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Користувач не авторизований'
        ]);
        return;
    }

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'] ?? '',
            'firstname' => $_SESSION['user_firstname'] ?? '',
            'lastname' => $_SESSION['user_lastname'] ?? ''
        ]
    ]);
}

// Очищення буфера та відправка результату
ob_end_flush();