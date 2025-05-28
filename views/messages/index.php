<?php
// Підключаємо перевірку статусу авторизації
require_once __DIR__ . '/../../api/auth_check.php';

// Додамо перевірку авторизації через JavaScript
echo '<script>
  // Перевіряємо наявність користувача у localStorage
  document.addEventListener("DOMContentLoaded", function() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!currentUser.id) {
      // Якщо користувач не авторизований, показуємо повідомлення 
      document.getElementById("main-content").style.display = "none";
      document.getElementById("auth-required-message").style.display = "block";
    } else {
      // Якщо авторизований, показуємо вміст
      document.getElementById("main-content").style.display = "flex";
      document.getElementById("auth-required-message").style.display = "none";
    }
  });
</script>';
?>
<!doctype html>
<html lang="en">
<head>
    <title>CMS - Messages</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/public/src/styles.css">
    <link rel="stylesheet" href="/public/src/messages.css">
    <link rel="manifest" href="/public/manifest.json" />
</head>

<body class="students">
<header class="top_bar">
    <div class="left">
        <img src="/public/src/assets/burger.png" alt="burger menu" class="burger-btn" id="brgrbtn">
        <a href="/views/students/index.php" aria-label="CMS" class="title">CMS</a>
    </div>
    <div class="info">
        <div class="notification-wrapper">
            <a id="notification-btn" class="notification" aria-label="messages" href="/views/messages/index.php">Messages</a>
            <div id="notifications-popup" class="popup">
                <div class="popup-content">
                    <div class="popup-body">
                        <!-- Notifications will be dynamically inserted here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Auth buttons (shown when not logged in) -->
        <div id="auth-buttons" class="auth-buttons" style="display:none;">
            <button id="login-button" class="auth-btn login-btn">Login</button>
            <button id="register-button" class="auth-btn register-btn">Register</button>
        </div>

        <!-- User profile (shown when logged in) -->
        <div id="user-profile" class="profile-area" style="display:none;">
            <div class="profile-wrapper">
                <button id="profile-btn" class="user">Profile</button>
                <div id="profile-popup" class="popup">
                    <button id="view-profile-btn">Profile</button>
                    <button id="logout-btn">Logout</button>
                </div>
            </div>
            <span id="username" class="username">User Name</span>
        </div>
    </div>
</header>

<nav class="burger">
    <a href="/views/dashboard/index.php">Dashboard</a>
    <a href="/views/students/index.php">Students</a>
    <a href="/views/tasks/index.php">Tasks</a>
</nav>

<!-- AUTH REQUIRED MESSAGE -->
<div id="auth-required-message" style="display: none;">
  <div class="auth-required-container">
    <h2>Доступ обмежено</h2>
    <div class="neon-glow">
      <p>Для перегляду цієї сторінки необхідно авторизуватися</p>
      <div class="auth-buttons-container">
        <button id="auth-login-button" class="auth-btn login-btn">Увійти</button>
        <button id="auth-register-button" class="auth-btn register-btn">Зареєструватися</button>
      </div>
    </div>
  </div>
</div>

<div class="content-wrapper" id="main-content">
    <nav class="side_bar">
        <a href="/views/dashboard/index.php">Dashboard</a>
        <a href="/views/students/index.php">Students</a>
        <a href="/views/tasks/index.php">Tasks</a>
    </nav>

    <main class="content messages-content">
        <h1>Messages</h1>

        <div class="messages-container">
            <!-- Chat room list -->
            <div class="chat-list">
                <div class="chat-list-header">
                    <h2>Chat room</h2>
                    <button class="new-chat-btn">+ New chat room</button>
                </div>

                <div class="chat-list-items">
                    <!-- Chat items will be dynamically inserted here -->
                    <div class="loading-chats">Loading chats...</div>
                </div>
            </div>

            <!-- Chat window -->
            <div class="chat-window">
                <div class="chat-header">
                    <h2>Select a chat</h2>
                </div>

                <div class="chat-members">
                    <h3>Members</h3>
                    <div class="members-list">
                        <!-- Members will be dynamically inserted here -->
                        <div class="member add-member">
                            <span>+</span>
                        </div>
                    </div>
                </div>

                <h3 class="messages-header">Messages</h3>

                <div class="chat-messages">
                    <!-- Messages will be dynamically inserted here -->
                    <div class="chat-placeholder">
                        <p>Select a chat to start messaging</p>
                    </div>
                </div>

                <div class="chat-input">
                    <input type="text" placeholder="Type your message..." aria-label="Type your message">
                    <button class="send-btn" aria-label="Send message">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z" fill="currentColor"/></svg>
                    </button>
                </div>
            </div>
        </div>
    </main>
</div>

<!-- Modal for creating new chat room -->
<div id="new-chat-modal" class="modal" style="display:none;">
  <div class="modal-content">
    <span class="close-modal" id="close-new-chat">&times;</span>
    <h2>Створити новий чат</h2>
    <div>
      <label for="chat-name">Назва чату (опціонально):</label>
      <input type="text" id="chat-name" placeholder="Введіть назву чату">
    </div>
    <div>
      <h3>Виберіть учасників:</h3>
      <div id="students-list-for-chat">
        <p>Завантаження студентів...</p>
      </div>
    </div>
    <button id="create-chat-btn">Створити чат</button>
  </div>
</div>

<!-- AUTH POPUPS -->
<div id="auth-window">
  <!-- Login popup -->
  <div id="login-popup" class="auth-popup">
    <span>Login</span>
    <button id="close-login" class="close-popup">Close</button>
    <div class="auth-popup-content">
      <label for="login-email">Email</label>
      <input type="email" id="login-email" placeholder="Enter your email">
      <label for="login-password">Password</label>
      <input type="password" id="login-password" placeholder="Enter your password">
      <div class="form-error" id="login-error"></div>
      <div class="auth-popup-buttons">
        <button class="cancel" id="cancel-login">Cancel</button>
        <button class="proceed" id="proceed-login">Login</button>
      </div>
    </div>
  </div>

  <!-- Registration popup -->
  <div id="register-popup" class="auth-popup">
    <span>Register</span>
    <button id="close-register" class="close-popup">Close</button>
    <div class="auth-popup-content">
      <!-- Register form fields -->
      <div class="form-error" id="register-error"></div>
      <div class="auth-popup-buttons">
        <button class="cancel" id="cancel-register">Cancel</button>
        <button class="proceed" id="proceed-register">Register</button>
      </div>
    </div>
  </div>
</div>

<!-- Socket.IO client - змінюємо на CDN для надійності -->
<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
<script src="/public/src/auth.js"></script>
<script src="/public/src/students.js"></script>
<script src="/public/src/chat-helper.js"></script>
<script src="/public/src/chat.js"></script>

</body>
</html>
