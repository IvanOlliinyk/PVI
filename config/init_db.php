<?php
require_once '../config.php';

try {
    // Підключення до MySQL без вибору бази даних
    $dsn = "mysql:host=" . DB_HOST;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Створення бази даних, якщо не існує
    $sql = "CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    $pdo->exec($sql);

    echo "Database created successfully or already exists<br>";

    // Вибір створеної бази даних
    $pdo->exec("USE " . DB_NAME);

    // Створення таблиці студентів
    $sql = file_get_contents(__DIR__ . '/create_table.sql');
    $pdo->exec($sql);

    echo "Table 'students' created successfully or already exists<br>";

    echo "Database initialization completed successfully";

} catch(PDOException $e) {
    die("Database initialization failed: " . $e->getMessage());
}
?>