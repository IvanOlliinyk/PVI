<?php
// Додаємо на початку файлу:
error_reporting(E_ALL);
ini_set('display_errors', 0); // Вимикаємо відображення помилок у відповіді

// Переконуємося, що нічого не виводиться перед встановленням заголовків
ob_start(); // Починаємо буферизацію виводу

session_start();

header('Content-Type: application/json'); // Встановлюємо заголовок JSON

// Опрацювання CORS
header('Access-Control-Allow-Origin: http://localhost:3001');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Якщо це OPTIONS запит (preflight), завершуємо обробку
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Основна функція для синхронізації
function syncUserToNodeJS() {
    // Перевіряємо авторизацію
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'User not authenticated'
        ]);
        exit;
    }

    // Підготовка даних користувача
    $userData = [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'firstname' => $_SESSION['user_firstname'] ?? '',
        'lastname' => $_SESSION['user_lastname'] ?? '',
        'role' => $_SESSION['user_role'] ?? 'student'
    ];

    // Для відлагодження запишемо інформацію в лог
    error_log("Syncing user data: " . json_encode($userData));

    // URL до Node.js сервера
    $nodeUrl = 'http://localhost:3001/api/sync-user'; // використовуємо порт 3001

    // Отримуємо сесійне cookie
    $sessionCookie = session_name() . '=' . session_id();

    // Підготовка даних для відправки
    $postData = json_encode(['phpUser' => $userData]);

    // Відправляємо дані за допомогою cURL
    $ch = curl_init($nodeUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($postData)
    ]);
    curl_setopt($ch, CURLOPT_COOKIE, $sessionCookie);

    // Виконуємо запит
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    // Записуємо результат у лог
    error_log("Node.js sync result: HTTP code: $httpCode, Response: $result, Error: $error");

    // Перевіряємо результат
    if ($httpCode == 200 && $result) {
        echo $result; // Повертаємо відповідь від Node.js серверу
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to sync with messaging server',
            'debug' => [
                'httpCode' => $httpCode,
                'error' => $error
            ]
        ]);
    }
}

// Обробка різних дій
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'sync-to-node':
        syncUserToNodeJS();
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Unknown action'
        ]);
}

// Закінчуємо буферизацію і надсилаємо результат
ob_end_flush();
?>