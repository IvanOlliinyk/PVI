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

        <!-- User profile (shown when logged in) -->
        <div id="user-profile" class="profile-area">
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
                    <div class="chat-item active">
                        <div class="chat-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Admin">
                        </div>
                        <div class="chat-info">
                            <span class="chat-name">Admin</span>
                        </div>
                    </div>

                    <div class="chat-item">
                        <div class="chat-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Ann Smith">
                        </div>
                        <div class="chat-info">
                            <span class="chat-name">Ann Smith</span>
                        </div>
                    </div>

                    <div class="chat-item">
                        <div class="chat-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="John Bond">
                        </div>
                        <div class="chat-info">
                            <span class="chat-name">John Bond</span>
                        </div>
                    </div>

                    <div class="chat-item">
                        <div class="chat-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Ivan Stan">
                        </div>
                        <div class="chat-info">
                            <span class="chat-name">Ivan Stan</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat window -->
            <div class="chat-window">
                <div class="chat-header">
                    <h2>Chat room Admin</h2>
                </div>

                <div class="chat-members">
                    <h3>Members</h3>
                    <div class="members-list">
                        <div class="member">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Member">
                        </div>
                        <div class="member">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Member">
                        </div>
                        <div class="member">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Member">
                        </div>
                        <div class="member add-member">
                            <span>+</span>
                        </div>
                    </div>
                </div>

                <h3 class="messages-header">Messages</h3>

                <div class="chat-messages">
                    <div class="message incoming">
                        <div class="message-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Admin">
                        </div>
                        <div class="message-content">
                            <div class="message-bubble">
                                <p>Welcome to the chat room!</p>
                            </div>
                            <span class="message-sender">Admin</span>
                        </div>
                    </div>

                    <div class="message outgoing">
                        <div class="message-content">
                            <div class="message-bubble">
                                <p>Hello everyone!</p>
                            </div>
                        </div>
                        <div class="message-avatar">
                            <img src="/public/src/assets/avatar-placeholder.png" alt="Me">
                            <span class="message-sender">Me</span>
                        </div>
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

<script src="/public/src/notifications.js"></script>
<script>
  // Basic chat functionality for demonstration
  document.addEventListener('DOMContentLoaded', function() {
    const chatItems = document.querySelectorAll('.chat-item');
    const sendBtn = document.querySelector('.send-btn');
    const chatInput = document.querySelector('.chat-input input');
    const chatMessages = document.querySelector('.chat-messages');

    // Switch between chat rooms
    chatItems.forEach(item => {
      item.addEventListener('click', function() {
        chatItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');

        // Update chat header with selected chat name
        const chatName = this.querySelector('.chat-name').textContent;
        document.querySelector('.chat-header h2').textContent = 'Chat room ' + chatName;
      });
    });

    // Send message functionality
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    function sendMessage() {
      const message = chatInput.value.trim();
      if (message) {
        const messageHTML = `
          <div class="message outgoing">
            <div class="message-content">
              <div class="message-bubble">
                <p>${message}</p>
              </div>
            </div>
            <div class="message-avatar">
              <img src="/public/src/assets/avatar-placeholder.png" alt="Me">
              <span class="message-sender">Me</span>
            </div>
          </div>
        `;

        chatMessages.insertAdjacentHTML('beforeend', messageHTML);
        chatInput.value = '';

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }
  });
</script>

</body>
</html>