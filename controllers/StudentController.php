<?php
require_once 'models/StudentModel.php';

class StudentController {
    private $studentModel;

    public function __construct($pdo) {
        $this->studentModel = new StudentModel($pdo);
    }

    // Метод для показу списку студентів
    public function index() {
        // Отримуємо всіх студентів з моделі
        $students = $this->studentModel->getAllStudents();

        // Підключаємо відображення та передаємо йому дані
        require_once 'views/students/index.php';
    }

    // Додаткові методи (для додавання, редагування, видалення)
    // можна додати пізніше
}
?>