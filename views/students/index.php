<!doctype html>
<html lang="en">
<head>
  <title>CMS</title>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/public/src/styles.css">
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
      <a id="notification-btn" class="notification" href="/views/messages/index.php">Messages</a>
      <div id="notifications-popup" class="popup">
        <div class="popup-content">
          <div class="popup-body">
            <div class="notification">
              <div>
                <img src="/public/src/assets/max.jpg" alt="profile">
                <p>Max Sakh</p>
              </div>
              <p>Nihao padoshva</p>
            </div>
            <div class="notification">
              <div>
                <img src="/public/src/assets/chef.jpg" alt="profile">
                <p>Shef</p>
              </div>
              <p>Fortnite 16:40</p>
            </div>
            <div class="notification">
              <div>
                <img src="/public/src/assets/yura.jpg" alt="profile">
                <p>Yurii Stelmakh</p>
              </div>
              <p>I'm not Grisana</p>
            </div>
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
          <button id="view-profile-btn">View Profile</button>
          <button id="logout-btn">Logout</button>
        </div>
      </div>
      <span id="username" class="username">User Name</span>
    </div>
  </div>
</header>

<!-- Rest of your HTML remains unchanged -->

<nav class="burger">
  <a href="/views/dashboard/index.php">Dashboard</a>
  <a href="/views/students/index.php" class="current">Students</a>
  <a href="/views/tasks/index.php">Tasks</a>
</nav>
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
    <a href="/views/students/index.php" class="current">Students</a>
    <a href="/views/tasks/index.php">Tasks</a>
  </nav>

  <main class="content">
    <h1>Students</h1>
    <div class="table-wrapper">
      <button class="add" onclick="addstudent()">Add student</button>
      <table class="table">
        <thead>
        <tr>
          <th>
            <label class="checkbox-container" >
              <input type="checkbox" id="selectAll" class="custom-check"/>
              <span class="custom-check"></span>
              <span class="visually-hidden">Label for the input</span>
            </label>
          </th>
          <th>Group</th>
          <th>Name</th>
          <th>Gender</th>
          <th>Birthday</th>
          <th>Status</th>
          <th>Options</th>
        </tr>
        </thead>
        <tbody class="students-table">
        <?php if (isset($students) && !empty($students)): ?>
            <?php foreach ($students as $student): ?>
            <tr data-id="<?php echo $student->getId(); ?>" data-user-id="<?php echo $student->getUserId(); ?>">
              <td>
                <label class="checkbox-container">
                  <input type="checkbox" class="student-select custom-check" data-id="<?php echo $student->getId(); ?>"/>
                  <span class="custom-check"></span>
                  <span class="visually-hidden">Select student</span>
                </label>
              </td>
              <td><?php echo htmlspecialchars($student->getStudentGroup()); ?></td>
              <td><?php echo htmlspecialchars($student->getFullName()); ?></td>
              <td><?php echo htmlspecialchars($student->getGender()); ?></td>
              <td><?php echo htmlspecialchars($student->getBirthday()); ?></td>
              <td><div class="status-indicator offline" title="Offline"></div></td>
              <td>
                <button class="edit" aria-label="Edit" onclick="editStudent(<?php echo $student->getId(); ?>)"></button>
                <button class="delete" aria-label="Delete" onclick="deleteStudentPrompt(<?php echo $student->getId(); ?>, '<?php echo htmlspecialchars($student->getFullName()); ?>')"></button>
              </td>
            </tr>
            <?php endforeach; ?>
        <?php else: ?>
          <tr>
            <td colspan="7">No students found</td>
          </tr>
        <?php endif; ?>
        </tbody>
      </table>
    </div>

    <!-- Попап для підтвердження видалення -->
    <div id="deletePopup" class="delete-popup">
      <div class="delete-popup-content">
        <p id="deleteMessage"></p>
        <button onclick="confirmDelete()">Yes</button>
        <button onclick="closeDeletePopup()">No</button>
      </div>
    </div>

    <div class="table-pages">
      <button class="prev"><span class="visually-hidden">Previous</span></button>
      <button class="num">1</button>
      <button class="num">2</button>
      <button class="num">3</button>
      <button class="num">4</button>
      <button class="num">5</button>
      <button class="next"><span class="visually-hidden">Next</span></button>
    </div>
    <div id="window">
      <div id="add-popup">
        <span id="popup-title">Add Student</span>
        <button id="close" onclick="addstudentclose()">Close</button>
        <div class="add-popup-content">
          <input type="hidden" id="student-id">
          <label for="group">Group</label>
          <select name="group" id="group">
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
          <label for="firstname">First name</label>
          <input type="text" id="firstname">
          <label for="lastname">Last name</label>
          <input type="text" id="lastname">
          <label for="gender">Gender</label>
          <select id="gender">
            <option value="" selected disabled></option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <label for="birthday">Birthday</label>
          <input type="date" id="birthday" value="">
        </div>
        <div class="add-popup-buttons">
          <button class="cancel" onclick="addstudentcancel()">Cancel</button>
          <button class="proceed" id="save-student-btn">Add</button>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- Add this right before the closing </body> tag -->
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

<script src="/public/src/students.js"></script>
<script src="/public/src/auth.js"></script>

</body>
</html>

