<?php

require_once __DIR__ . '/Student.php';
class StudentModel {


    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Метод для отримання всіх студентів
    public function getAllStudents() {
        $stmt = $this->pdo->query('SELECT * FROM students');
        $students = [];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $students[] = new Student($row);
        }

        return $students;
    }

    // Метод для отримання студента за ID
    public function getStudentById($id) {
        $stmt = $this->pdo->prepare('SELECT * FROM students WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return new Student($row);
    }

    // Метод для додавання студента (з user_id)
    public function addStudent(Student $student) {
        $stmt = $this->pdo->prepare(
            'INSERT INTO students (firstname, lastname, gender, birthday, student_group, user_id) 
             VALUES (?, ?, ?, ?, ?, ?)'
        );

        return $stmt->execute([
            $student->getFirstname(),
            $student->getLastname(),
            $student->getGender(),
            $student->getBirthday(),
            $student->getStudentGroup(),
            $student->getUserId()  // Додаємо user_id
        ]);
    }

    // Метод для оновлення студента (з user_id)
    public function updateStudent(Student $student) {
        $stmt = $this->pdo->prepare(
            'UPDATE students SET 
             firstname = ?, 
             lastname = ?, 
             gender = ?, 
             birthday = ?, 
             student_group = ?,
             user_id = ?
             WHERE id = ?'
        );

        return $stmt->execute([
            $student->getFirstname(),
            $student->getLastname(),
            $student->getGender(),
            $student->getBirthday(),
            $student->getStudentGroup(),
            $student->getUserId(),  // Додаємо user_id
            $student->getId()
        ]);
    }

    // Метод для видалення студента
    public function deleteStudent($id) {
        $stmt = $this->pdo->prepare('DELETE FROM students WHERE id = ?');
        return $stmt->execute([$id]);
    }
}
?>