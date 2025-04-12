<?php
require_once '../config/config.php';
require_once '../models/Student.php';
require_once '../models/StudentModel.php';

header('Content-Type: application/json');

// Отримати з'єднання з базою даних
$pdo = getDbConnection();

// Створити екземпляр моделі студента
$studentModel = new StudentModel($pdo);

// Запис у лог про дату та користувача
function logActivity($action) {
    $date = gmdate('Y-m-d H:i:s');
    $user = isset($_SESSION['username']) ? $_SESSION['username'] : 'IvanOlliinyk';

    error_log("[$date] $user performed action: $action");
    return ['date' => $date, 'user' => $user];
}

// Функція для валідації даних
function validateStudentData($data, $studentModel, $isUpdate = false) {
    $errors = [];

    // Перевірка обов'язкових полів
    $requiredFields = ['firstname', 'lastname', 'gender', 'birthday', 'student_group'];
    foreach ($requiredFields as $field) {
        if (empty($data[$field])) {
            $errors[$field] = ucfirst($field) . ' is required';
        }
    }

    // Якщо це оновлення, перевіряємо наявність ID
    if ($isUpdate && empty($data['id'])) {
        $errors['id'] = 'Student ID is required for update';
    }

    // Якщо є помилки з обов'язковими полями, повертаємо їх
    if (!empty($errors)) {
        return $errors;
    }

    // Валідація імені та прізвища
    $namePattern = '/^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ\' -]+$/u';
    if (!preg_match($namePattern, $data['firstname'])) {
        $errors['firstname'] = 'First name can only contain letters, spaces, hyphens and apostrophes';
    }
    if (!preg_match($namePattern, $data['lastname'])) {
        $errors['lastname'] = 'Last name can only contain letters, spaces, hyphens and apostrophes';
    }

    // Перевірка статі
    if (!in_array($data['gender'], ['Male', 'Female'])) {
        $errors['gender'] = 'Gender must be either Male or Female';
    }

    // Валідація дати народження
    $birthdayDate = strtotime($data['birthday']);
    $currentDate = time();

    if ($birthdayDate === false) {
        $errors['birthday'] = 'Invalid date format';
    } else {
        // Перевірка що дата не в майбутньому
        if ($birthdayDate > $currentDate) {
            $errors['birthday'] = 'Birthday cannot be in the future';
        }

        // Перевірка віку (15-100 років)
        $minAgeDate = strtotime('-100 years');
        $maxAgeDate = strtotime('-15 years');

        if ($birthdayDate < $minAgeDate) {
            $errors['birthday'] = 'Age cannot be more than 100 years';
        }

        if ($birthdayDate > $maxAgeDate) {
            $errors['birthday'] = 'Student must be at least 15 years old';
        }
    }

    // Перевірка групи (формат PZ-XX)
    if (!preg_match('/^PZ-\d{1,2}$/', $data['student_group'])) {
        $errors['student_group'] = 'Invalid group format (must be PZ-XX where XX is 1-2 digits)';
    }

    // Перевірка на дублювання студентів
    $existingStudents = $studentModel->getAllStudents();
    foreach ($existingStudents as $existingStudent) {
        $sameNames = $existingStudent->getFirstname() === $data['firstname'] &&
            $existingStudent->getLastname() === $data['lastname'];

        // Якщо це оновлення і це той самий студент - пропускаємо перевірку
        if ($isUpdate && $existingStudent->getId() == $data['id']) {
            continue;
        }

        // Якщо знайдено студента з таким же ім'ям і прізвищем
        if ($sameNames) {
            $errors['duplicate'] = 'Student with this name already exists';
            break;
        }
    }

    return $errors;
}

// Обробка запиту залежно від методу
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Отримання студентів
        if (isset($_GET['id'])) {
            // Отримання конкретного студента за ID
            $student = $studentModel->getStudentById($_GET['id']);

            if ($student) {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'id' => $student->getId(),
                        'firstname' => $student->getFirstname(),
                        'lastname' => $student->getLastname(),
                        'fullname' => $student->getFullName(),
                        'gender' => $student->getGender(),
                        'birthday' => $student->getBirthday(),
                        'student_group' => $student->getStudentGroup()
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Student not found']);
            }
        } else {
            // Отримання всіх студентів
            $students = $studentModel->getAllStudents();
            $result = [];

            foreach ($students as $student) {
                $result[] = [
                    'id' => $student->getId(),
                    'firstname' => $student->getFirstname(),
                    'lastname' => $student->getLastname(),
                    'fullname' => $student->getFullName(),
                    'gender' => $student->getGender(),
                    'birthday' => $student->getBirthday(),
                    'student_group' => $student->getStudentGroup()
                ];
            }

            echo json_encode(['success' => true, 'data' => $result]);
        }
        break;

    case 'POST':
        // Додавання нового студента
        $data = json_decode(file_get_contents('php://input'), true);

        // Валідація даних
        $errors = validateStudentData($data, $studentModel);

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit;
        }

        // Створення студента
        $student = new Student([
            'firstname' => $data['firstname'],
            'lastname' => $data['lastname'],
            'gender' => $data['gender'],
            'birthday' => $data['birthday'],
            'student_group' => $data['student_group']
        ]);

        // Додавання студента
        $result = $studentModel->addStudent($student);

        if ($result) {
            // Логування дії
            $logInfo = logActivity('Added new student: ' . $data['firstname'] . ' ' . $data['lastname']);

            echo json_encode([
                'success' => true,
                'message' => 'Student added successfully',
                'timestamp' => $logInfo['date'],
                'user' => $logInfo['user']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add student']);
        }
        break;

    case 'PUT':
        // Оновлення студента
        $data = json_decode(file_get_contents('php://input'), true);

        // Валідація даних
        $errors = validateStudentData($data, $studentModel, true);

        if (!empty($errors)) {
            echo json_encode(['success' => false, 'errors' => $errors]);
            exit;
        }

        // Створення студента
        $student = new Student([
            'id' => $data['id'],
            'firstname' => $data['firstname'],
            'lastname' => $data['lastname'],
            'gender' => $data['gender'],
            'birthday' => $data['birthday'],
            'student_group' => $data['student_group']
        ]);

        // Оновлення студента
        $result = $studentModel->updateStudent($student);

        if ($result) {
            // Логування дії
            $logInfo = logActivity('Updated student (ID: ' . $data['id'] . '): ' . $data['firstname'] . ' ' . $data['lastname']);

            echo json_encode([
                'success' => true,
                'message' => 'Student updated successfully',
                'timestamp' => $logInfo['date'],
                'user' => $logInfo['user']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update student']);
        }
        break;

    case 'DELETE':
        // Видалення студента
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['id'])) {
            echo json_encode(['success' => false, 'message' => 'Student ID is required']);
            exit;
        }

        // Спочатку отримуємо дані студента для логу
        $student = $studentModel->getStudentById($data['id']);
        $studentName = $student ? $student->getFullName() : "ID: {$data['id']}";

        $result = $studentModel->deleteStudent($data['id']);

        if ($result) {
            // Логування дії
            $logInfo = logActivity('Deleted student: ' . $studentName);

            echo json_encode([
                'success' => true,
                'message' => 'Student deleted successfully',
                'timestamp' => $logInfo['date'],
                'user' => $logInfo['user']
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to delete student']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        break;
}
?>