<?php
class User {
    private $id;
    private $email;
    private $firstname;
    private $lastname;
    private $role;

    // Конструктор
    public function __construct($data = []) {
        $this->id = $data['id'] ?? null;
        $this->email = $data['email'] ?? '';
        $this->firstname = $data['firstname'] ?? '';
        $this->lastname = $data['lastname'] ?? '';
        $this->role = $data['role'] ?? 'student';
    }

    // Геттери
    public function getId() {
        return $this->id;
    }

    public function getEmail() {
        return $this->email;
    }

    public function getFirstname() {
        return $this->firstname;
    }

    public function getLastname() {
        return $this->lastname;
    }

    public function getRole() {
        return $this->role;
    }

    public function getFullName() {
        return $this->firstname . ' ' . $this->lastname;
    }
}
?>