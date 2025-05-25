<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Обробка preflight запитів
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Початок сесії
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Підключаємо необхідні файли
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/UserModel.php';

// Перевірка авторизації
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Для доступу до повідомлень необхідно авторизуватися',
        'debug' => [
            'session_id' => session_id(),
            'session_data' => $_SESSION ?? 'empty'
        ]
    ]);
    exit;
}

try {
    $db = Database::getInstance();
    $pdo = $db->getConnection();
    $userModel = new UserModel($pdo);

    // Обробка запитів
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            if (isset($_GET['action'])) {
                switch ($_GET['action']) {
                    case 'sync-to-node':
                        syncUserToNodeJS();
                        break;
                    case 'get-students':
                        getAllStudentsForMessaging();
                        break;
                    case 'debug-session':
                        debugSession();
                        break;
                    default:
                        http_response_code(400);
                        echo json_encode(['success' => false, 'message' => 'Невідома дія']);
                }
            } else {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Дія не вказана']);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['action'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Дія не вказана']);
                exit;
            }

            switch ($data['action']) {
                case 'sync-to-node':
                    syncUserToNodeJS();
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Невідома дія']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Метод не дозволено']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Помилка сервера: ' . $e->getMessage()
    ]);
}

// Функція для відлагодження сесії
function debugSession() {
    echo json_encode([
        'success' => true,
        'session_id' => session_id(),
        'session_data' => $_SESSION,
        'php_session_cookie' => $_COOKIE[session_name()] ?? 'not found'
    ]);
}

// Функція для синхронізації користувача з Node.js
function syncUserToNodeJS() {
    $userData = [
        'id' => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'],
        'firstname' => $_SESSION['user_firstname'],
        'lastname' => $_SESSION['user_lastname'],
        'role' => $_SESSION['user_role']
    ];

    // Відправляємо дані на Node.js сервер з cookie сесії
    $nodeUrl = 'http://localhost:3000/api/sync-user';
    $postData = json_encode(['phpUser' => $userData]);

    // Отримуємо cookie сесії для передачі в Node.js
    $sessionCookie = session_name() . '=' . session_id();

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($postData),
                'Cookie: ' . $sessionCookie
            ],
            'content' => $postData
        ]
    ]);

    $result = @file_get_contents($nodeUrl, false, $context);

    if ($result !== false) {
        $response = json_decode($result, true);
        echo json_encode([
            'success' => true,
            'message' => 'Користувач синхронізований',
            'nodeResponse' => $response,
            'debug' => [
                'session_cookie' => $sessionCookie,
                'user_data' => $userData
            ]
        ]);
    } else {
        $error = error_get_last();
        echo json_encode([
            'success' => false,
            'message' => 'Не вдалося синхронізувати з сервером повідомлень',
            'debug' => [
                'error' => $error,
                'session_cookie' => $sessionCookie
            ]
        ]);
    }
}

// Функція для отримання всіх студентів для вибору в повідомленнях
function getAllStudentsForMessaging() {
    global $pdo;

    try {
        // Отримуємо всіх студентів разом з даними користувачів
        $stmt = $pdo->prepare(
            'SELECT s.*, u.email, u.role 
             FROM students s 
             LEFT JOIN users u ON s.user_id = u.id 
             WHERE u.id IS NOT NULL 
             ORDER BY s.firstname, s.lastname'
        );
        $stmt->execute();
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'students' => $students
        ]);

    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Помилка отримання студентів: ' . $e->getMessage()
        ]);
    }
}
?>