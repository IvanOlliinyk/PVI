<?php
class Student {
    private $id;
    private $firstname;
    private $lastname;
    private $gender;
    private $birthday;
    private $student_group;
    private $user_id;  // Нове поле

    public function __construct(array $data) {
        $this->id = isset($data['id']) ? $data['id'] : null;
        $this->firstname = $data['firstname'];
        $this->lastname = $data['lastname'];
        $this->gender = $data['gender'];
        $this->birthday = $data['birthday'];
        $this->student_group = $data['student_group'];
        $this->user_id = isset($data['user_id']) ? $data['user_id'] : null;  // Ініціалізація нового поля
    }

    // Getters
    public function getId() {
        return $this->id;
    }

    public function getFirstname() {
        return $this->firstname;
    }

    public function getLastname() {
        return $this->lastname;
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

    public function getUserId() {  // Новий метод
        return $this->user_id;
    }

    public function getFullName() {
        return $this->firstname . ' ' . $this->lastname;
    }

    // Setters
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

    public function setUserId($user_id) {  // Новий метод
        $this->user_id = $user_id;
    }
}
?>