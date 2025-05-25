<?php
require_once 'User.php';

class UserModel {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Перевірка існування email
    public function emailExists($email) {
        try {
            $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM users WHERE email = :email");
            $stmt->execute(['email' => $email]);
            return $stmt->fetchColumn() > 0;
        } catch (PDOException $e) {
            error_log("EmailExists Error: " . $e->getMessage());
            return false;
        }
    }

    // Реєстрація нового користувача
    public function register($email, $password, $firstname, $lastname, $role = 'student') {
        try {
            // Хешуємо пароль
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Вставляємо користувача
            $stmt = $this->pdo->prepare(
                'INSERT INTO users (email, password_hash, firstname, lastname, role, created_at, updated_at) 
                VALUES (:email, :password_hash, :firstname, :lastname, :role, NOW(), NOW())'
            );

            $stmt->execute([
                'email' => $email,
                'password_hash' => $hashedPassword,
                'firstname' => $firstname,
                'lastname' => $lastname,
                'role' => $role
            ]);

            // Отримуємо ID нового користувача
            $userId = $this->pdo->lastInsertId();

            return [
                'success' => true,
                'user_id' => $userId,
                'message' => 'Користувач успішно зареєстрований'
            ];
        } catch (PDOException $e) {
            error_log("Register Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Помилка реєстрації: ' . $e->getMessage()
            ];
        }
    }

    // Вхід користувача
    public function login($email, $password) {
        try {
            // Отримуємо користувача за email
            $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = :email");
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();

            // Перевіряємо чи існує користувач і чи правильний пароль
            if ($user && password_verify($password, $user['password_hash'])) {
                // Оновлюємо дату останнього входу
                $updateStmt = $this->pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
                $updateStmt->execute(['id' => $user['id']]);

                return [
                    'success' => true,
                    'user' => $user,
                    'message' => 'Вхід успішний'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Невірний email або пароль'
                ];
            }
        } catch (PDOException $e) {
            error_log("Login Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Помилка входу: ' . $e->getMessage()
            ];
        }
    }

    // Інші методи...
}
?>