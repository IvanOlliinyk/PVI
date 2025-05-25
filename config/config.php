<?php
// Параметри підключення до бази даних
define('DB_HOST', 'localhost');
define('DB_NAME', 'student_db');
define('DB_USER', 'root');
define('DB_PASS', 'root');

// Функція для створення PDO з'єднання
function getDbConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        die("Помилка підключення до бази даних: " . $e->getMessage());
    }
}
?>