<!doctype html>
<html lang="en">
<head>
  <title>CMS - Messages</title>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/public/src/styles.css">
  <link rel="stylesheet" href="/public/src/messages.css">
  <link rel="stylesheet" href="/public/src/messages-dialogs.css">
  <link rel="manifest" href="/public/manifest.json" />
</head>

<body class="students">
<?php
// Виправлений шлях до auth_check.php
include_once __DIR__ . '/../../api/auth_check.php';
?>

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
            <!-- Повідомлення будуть додаватися динамічно -->
          </div>
        </div>
      </div>
    </div>

    <!-- Auth buttons (shown when not logged in) -->
    <div id="auth-buttons" class="auth-buttons">
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

<!-- Auth required message -->
<div id="auth-required-message" style="display: none;">
  <div class="auth-required-container">
    <h2>Доступ обмежено</h2>
    <div class="neon-glow">
      <p>Для перегляду повідомлень необхідно авторизуватися</p>
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
          <!-- Чати будуть завантажуватися динамічно -->
        </div>
      </div>

      <!-- Chat window -->
      <div class="chat-window">
        <div class="chat-header">
          <h2>Виберіть чат</h2>
        </div>

        <div class="chat-members" style="display: none;">
          <h3>Members</h3>
          <div class="members-list">
            <!-- Учасники будуть завантажуватися динамічно -->
          </div>
        </div>

        <h3 class="messages-header" style="display: none;">Messages</h3>

        <div class="chat-messages">
          <div class="no-chat-selected" style="text-align: center; padding: 50px; color: rgba(255,255,255,0.5);">
            <h3>Виберіть чат щоб почати спілкування</h3>
            <p>Або створіть новий чат натиснувши "New chat room"</p>
          </div>
        </div>

        <div class="chat-input" style="display: none;">
          <input type="text" placeholder="Type your message..." aria-label="Type your message">
          <button class="send-btn" aria-label="Send message">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
              <path fill="none" d="M0 0h24v24H0z"/>
              <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Auth popups -->
<div id="auth-window" style="display: none;">
  <!-- Login popup -->
  <div id="login-popup" class="auth-popup" style="display: none;">
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
  <div id="register-popup" class="auth-popup" style="display: none;">
    <span>Register</span>
    <button id="close-register" class="close-popup">Close</button>
    <div class="auth-popup-content">
      <label for="register-email">Email</label>
      <input type="email" id="register-email" placeholder="Enter your email">

      <label for="register-password">Password</label>
      <input type="password" id="register-password" placeholder="Enter your password">

      <label for="register-confirm">Confirm Password</label>
      <input type="password" id="register-confirm" placeholder="Confirm your password">

      <label for="register-firstname">First Name</label>
      <input type="text" id="register-firstname" placeholder="Enter your first name">

      <label for="register-lastname">Last Name</label>
      <input type="text" id="register-lastname" placeholder="Enter your last name">

      <label for="register-group">Group</label>
      <select name="group" id="register-group">
        <option value="" selected disabled></option>
        <optgroup label="PZ-1*">
          <option value="PZ-11">PZ-11</option>
          <option value="PZ-12">PZ-12</option>
          <option value="PZ-13">PZ-13</option>
          <option value="PZ-14">PZ-14</option>
          <option value="PZ-15">PZ-15</option>
          <option value="PZ-16">PZ-16</option>
          <option value="PZ-17">PZ-17</option>
        </optgroup>
        <optgroup label="PZ-2*">
          <option value="PZ-21">PZ-21</option>
          <option value="PZ-22">PZ-22</option>
          <option value="PZ-23">PZ-23</option>
          <option value="PZ-24">PZ-24</option>
          <option value="PZ-25">PZ-25</option>
          <option value="PZ-26">PZ-26</option>
        </optgroup>
        <optgroup label="PZ-3*">
          <option value="PZ-31">PZ-31</option>
          <option value="PZ-32">PZ-32</option>
          <option value="PZ-33">PZ-33</option>
          <option value="PZ-34">PZ-34</option>
          <option value="PZ-35">PZ-35</option>
          <option value="PZ-36">PZ-36</option>
          <option value="PZ-37">PZ-37</option>
        </optgroup>
        <optgroup label="PZ-4*">
          <option value="PZ-41">PZ-41</option>
          <option value="PZ-42">PZ-42</option>
          <option value="PZ-43">PZ-43</option>
          <option value="PZ-44">PZ-44</option>
          <option value="PZ-45">PZ-45</option>
          <option value="PZ-46">PZ-46</option>
        </optgroup>
      </select>

      <label for="register-gender">Gender</label>
      <select id="register-gender">
        <option value="" selected disabled></option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>

      <label for="register-birthday">Birthday</label>
      <input type="date" id="register-birthday" value="">

      <div class="form-error" id="register-error"></div>

      <div class="auth-popup-buttons">
        <button class="cancel" id="cancel-register">Cancel</button>
        <button class="proceed" id="proceed-register">Register</button>
      </div>
    </div>
  </div>
</div>

<!-- Scripts -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script src="/public/src/auth.js"></script>
<script src="/public/src/messages.js"></script>

</body>
</html>