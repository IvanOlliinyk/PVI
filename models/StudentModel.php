<?php
require_once 'Student.php';

class StudentModel {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Отримання всіх студентів
    public function getAllStudents() {
        try {
            $stmt = $this->pdo->query('SELECT * FROM students ORDER BY lastname, firstname');
            $studentsData = $stmt->fetchAll();

            $students = [];
            foreach ($studentsData as $studentData) {
                $students[] = new Student($studentData);
            }

            return $students;
        } catch (PDOException $e) {
            die("Помилка отримання даних студентів: " . $e->getMessage());
        }
    }

    // Отримання студента за ID
    public function getStudentById($id) {
        try {
            $stmt = $this->pdo->prepare('SELECT * FROM students WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $studentData = $stmt->fetch();

            if ($studentData) {
                return new Student($studentData);
            }

            return null;
        } catch (PDOException $e) {
            die("Помилка отримання даних студента: " . $e->getMessage());
        }
    }

    // Додавання нового студента
    public function addStudent(Student $student) {
        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO students (firstname, lastname, gender, birthday, student_group) 
                 VALUES (:firstname, :lastname, :gender, :birthday, :student_group)'
            );

            $result = $stmt->execute([
                'firstname' => $student->getFirstname(),
                'lastname' => $student->getLastname(),
                'gender' => $student->getGender(),
                'birthday' => $student->getBirthday(),
                'student_group' => $student->getStudentGroup()
            ]);

            return $result;
        } catch (PDOException $e) {
            die("Помилка додавання студента: " . $e->getMessage());
        }
    }

    // Оновлення даних студента
    public function updateStudent(Student $student) {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE students 
                 SET firstname = :firstname, 
                     lastname = :lastname, 
                     gender = :gender, 
                     birthday = :birthday, 
                     student_group = :student_group 
                 WHERE id = :id'
            );

            $result = $stmt->execute([
                'id' => $student->getId(),
                'firstname' => $student->getFirstname(),
                'lastname' => $student->getLastname(),
                'gender' => $student->getGender(),
                'birthday' => $student->getBirthday(),
                'student_group' => $student->getStudentGroup()
            ]);

            return $result;
        } catch (PDOException $e) {
            die("Помилка оновлення даних студента: " . $e->getMessage());
        }
    }

    // Видалення студента
    public function deleteStudent($id) {
        try {
            $stmt = $this->pdo->prepare('DELETE FROM students WHERE id = :id');
            $result = $stmt->execute(['id' => $id]);

            return $result;
        } catch (PDOException $e) {
            die("Помилка видалення студента: " . $e->getMessage());
        }
    }
}
?>