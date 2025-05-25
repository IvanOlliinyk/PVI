<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Початок сесії
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Підключаємо необхідні файли
require_once __DIR__ . '/../models/Database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/UserModel.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/StudentModel.php';

// Блок обробки запитів
try {
    // Створюємо з'єднання з базою даних
    $db = Database::getInstance();
    $pdo = $db->getConnection();

    // Створюємо моделі
    $userModel = new UserModel($pdo);
    $studentModel = new StudentModel($pdo);

    // Обробка GET-запитів
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['action']) && $_GET['action'] === 'status') {
            checkLoginStatus();
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Недійсний GET-запит'
            ]);
        }
    }
    // Обробка POST-запитів
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Отримуємо тіло запиту
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Дія не вказана'
            ]);
            exit;
        }

        switch ($data['action']) {
            case 'login':
                handleLogin($data);
                break;

            case 'register':
                handleRegister($data);
                break;

            case 'logout':
                handleLogout();
                break;

            default:
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Недійсна дія'
                ]);
        }
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Метод не дозволено'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Помилка сервера: ' . $e->getMessage()
    ]);
}

// Обробка запиту на вхід
function handleLogin($data) {
    global $userModel;

    if (!isset($data['email']) || !isset($data['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email та пароль обов\'язкові'
        ]);
        return;
    }

    $email = $data['email'];
    $password = $data['password'];

    $loginResult = $userModel->login($email, $password);

    if ($loginResult['success']) {
        $_SESSION['user_id'] = $loginResult['user']['id'];
        $_SESSION['user_email'] = $loginResult['user']['email'];
        $_SESSION['user_firstname'] = $loginResult['user']['firstname'];
        $_SESSION['user_lastname'] = $loginResult['user']['lastname'];
        $_SESSION['user_role'] = $loginResult['user']['role'] ?? 'student';

        echo json_encode([
            'success' => true,
            'message' => 'Вхід успішний',
            'user' => [
                'id' => $loginResult['user']['id'],
                'email' => $loginResult['user']['email'],
                'firstname' => $loginResult['user']['firstname'],
                'lastname' => $loginResult['user']['lastname'],
                'role' => $loginResult['user']['role'] ?? 'student'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $loginResult['message']
        ]);
    }
}

// Обробка запиту на реєстрацію
function handleRegister($data) {
    global $userModel, $pdo;

    $requiredFields = ['email', 'password', 'firstname', 'lastname', 'student_group', 'gender', 'birthday'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            echo json_encode([
                'success' => false,
                'message' => ucfirst($field) . ' є обов\'язковим полем'
            ]);
            return;
        }
    }

    if ($userModel->emailExists($data['email'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Цей email вже зареєстрований'
        ]);
        return;
    }

    $registrationResult = $userModel->register(
        $data['email'],
        $data['password'],
        $data['firstname'],
        $data['lastname'],
        'student'
    );

    if ($registrationResult['success']) {
        $userId = $registrationResult['user_id'];
        $firstname = $data['firstname'];
        $lastname = $data['lastname'];

        if ($userId) {
            try {
                $stmt = $pdo->prepare(
                    'INSERT INTO students (firstname, lastname, gender, birthday, student_group, user_id) 
                     VALUES (?, ?, ?, ?, ?, ?)'
                );

                $stmt->execute([
                    $firstname,
                    $lastname,
                    $data['gender'] ?? 'Male',
                    $data['birthday'] ?? date('Y-m-d', strtotime('-18 years')),
                    $data['student_group'] ?? 'PZ-1',
                    $userId
                ]);

                error_log("Auto-created student for user ID $userId: $firstname $lastname");
            } catch (PDOException $e) {
                error_log("Failed to auto-create student: " . $e->getMessage());
            }
        }

        $_SESSION['user_id'] = $userId;
        $_SESSION['user_email'] = $data['email'];
        $_SESSION['user_firstname'] = $firstname;
        $_SESSION['user_lastname'] = $lastname;
        $_SESSION['user_role'] = 'student';

        echo json_encode([
            'success' => true,
            'message' => 'Реєстрація успішна',
            'user' => [
                'id' => $userId,
                'email' => $data['email'],
                'firstname' => $firstname,
                'lastname' => $lastname,
                'role' => 'student'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $registrationResult['message']
        ]);
    }
}

// Обробка запиту на вихід
function handleLogout() {
    session_unset();
    session_destroy();

    echo json_encode([
        'success' => true,
        'message' => 'Вихід успішний'
    ]);
}

// Перевірка статусу входу
function checkLoginStatus() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => true,
            'isLoggedIn' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'email' => $_SESSION['user_email'],
                'firstname' => $_SESSION['user_firstname'],
                'lastname' => $_SESSION['user_lastname'],
                'role' => $_SESSION['user_role']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'isLoggedIn' => false
        ]);
    }
}
?>
