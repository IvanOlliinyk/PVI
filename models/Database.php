<?php
class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        // Налаштування з'єднання з базою даних
        $host = 'localhost';
        $db   = 'student_db';
        $user = 'root';      // Змініть на ваше ім'я користувача MySQL
        $pass = 'root';          // Змініть на ваш пароль (або залиште порожнім, якщо немає пароля)
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            throw new Exception("Connection failed: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->pdo;
    }

    private function __clone() {}
}
?>