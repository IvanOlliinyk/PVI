<?php
// Підключаємо конфігурацію
require_once 'config/config.php';

// Підключаємо контролер
require_once 'controllers/StudentController.php';

// Отримуємо з'єднання з базою даних
$pdo = getDbConnection();

// Створюємо екземпляр контролера
$controller = new StudentController($pdo);

// Викликаємо метод для відображення списку студентів
$controller->index();
?>
