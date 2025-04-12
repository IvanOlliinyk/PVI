<?php
class Student {
    private $id;
    private $firstname;
    private $lastname;
    private $gender;
    private $birthday;
    private $student_group;

    // Конструктор
    public function __construct($data = []) {
        $this->id = $data['id'] ?? null;
        $this->firstname = $data['firstname'] ?? '';
        $this->lastname = $data['lastname'] ?? '';
        $this->gender = $data['gender'] ?? '';
        $this->birthday = $data['birthday'] ?? '';
        $this->student_group = $data['student_group'] ?? '';
    }

    // Геттери
    public function getId() {
        return $this->id;
    }

    public function getFirstname() {
        return $this->firstname;
    }

    public function getLastname() {
        return $this->lastname;
    }

    public function getFullName() {
        return $this->firstname . ' ' . $this->lastname;
    }

    public function getGender() {
        return $this->gender;
    }

    public function getBirthday() {
        return $this->birthday;
    }

    public function getStudentGroup() {
        return $this->student_group;
    }

    // Сеттери
    public function setFirstname($firstname) {
        $this->firstname = $firstname;
    }

    public function setLastname($lastname) {
        $this->lastname = $lastname;
    }

    public function setGender($gender) {
        $this->gender = $gender;
    }

    public function setBirthday($birthday) {
        $this->birthday = $birthday;
    }

    public function setStudentGroup($student_group) {
        $this->student_group = $student_group;
    }
}
?>