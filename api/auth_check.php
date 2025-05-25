<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Визначаємо, чи користувач авторизований
$isLoggedIn = isset($_SESSION['user_id']);

// Передаємо змінну в JavaScript
echo '<script>var PHP_AUTH_STATUS = ' . ($isLoggedIn ? 'true' : 'false') . ';</script>';
?>