// Messaging functionality
class MessagingClient {
  constructor() {
    this.socket = null;
    this.currentRoom = null;
    this.currentUser = null;
    this.isConnected = false;
  }


  async initializeMessaging() {
    try {
      console.log('Initializing messaging system...');

      // 1. Спочатку отримаємо дані користувача з PHP сесії
      const userInfoResponse = await fetch('/api/user-info.php');
      if (!userInfoResponse.ok) {
        throw new Error(`Failed to get user info: ${userInfoResponse.status}`);
      }

      const userInfo = await userInfoResponse.json();
      console.log('User info from PHP:', userInfo);

      if (!userInfo.success) {
        throw new Error(userInfo.message || 'Failed to get user data');
      }

      // 2. Напряму синхронізуємося з Node.js сервером
      const syncResponse = await fetch('http://localhost:3001/api/sync-user', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phpUser: {
            id: userInfo.user.id,
            email: userInfo.user.email,
            firstname: userInfo.user.firstname,
            lastname: userInfo.user.lastname,
            role: userInfo.user.role || 'student'
          }
        })
      });

      if (!syncResponse.ok) {
        throw new Error(`Node.js sync failed: ${syncResponse.status}`);
      }

      const syncResult = await syncResponse.json();
      console.log('Node.js sync result:', syncResult);

      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Sync failed');
      }

      // 3. Запам'ятовуємо дані користувача
      this.currentUser = {
        id: syncResult.user._id,
        phpUserId: syncResult.user.phpUserId,
        email: syncResult.user.email,
        firstname: syncResult.user.firstname,
        lastname: syncResult.user.lastname
      };

      // 4. Завантажуємо список чатів
      await this.loadChatRooms();

      // 5. Підключаємо сокети
      this.initializeWebSockets();

      return true;
    } catch (error) {
      console.error('Error initializing messaging:', error);
      this.showError(`Помилка підключення до сервера повідомлень: ${error.message}`);
      return false;
    }
  }

// Метод для перевірки з'єднання з Node.js
  async checkNodeJSConnection() {
    try {
      const response = await fetch('http://localhost:3001/api/health-check', {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });

      if (!response.ok) {
        return {
          connected: false,
          status: response.status,
          message: `HTTP error ${response.status}`
        };
      }

      const data = await response.json();
      return {
        connected: true,
        status: 200,
        message: 'Connected to Node.js server',
        data: data
      };
    } catch (error) {
      console.error('Node.js connection error:', error);
      return {
        connected: false,
        status: 0,
        message: error.message
      };
    }
  }
  // Ініціалізація підключення
  async init() {
    try {
      // First sync PHP user to Node.js
      const syncSuccess = await this.syncUserToNode();

      if (!syncSuccess) {
        console.error("Failed to sync user with messaging server. Chat functionality may be limited.");
        // Continue anyway - don't return, as partial functionality may still work
      }

      // Now connect to Socket.IO server
      this.socket = io('http://localhost:3000', {
        withCredentials: true // Important! This ensures cookies are sent with socket
      });

      console.log('Connected to messaging server');

      // Setup socket event listeners
      this.setupSocketListeners();

      // Load chat rooms for the user
      await this.loadChatRooms();

      // Setup UI event handlers
      this.setupUI();

      // Request notification permissions
      this.requestNotificationPermission();

      return true;
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      this.showError('Failed to connect to messaging server');
      return false;
    }
  }

  // Синхронізація користувача з Node.js
  // Модифікуйте метод syncUserToNode для кращої обробки помилок
  async syncUserToNode() {
    console.log('Starting user sync to Node.js...');

    try {
      // Спочатку спробуємо отримати інформацію про користувача
      const userResponse = await fetch('/api/messages_api_fixed.php?action=get-user-info', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!userResponse.ok) {
        console.error(`User info error: ${userResponse.status}`);
        this.showError('Не вдалося отримати інформацію про користувача');
        return false;
      }

      const userData = await userResponse.json();
      console.log('User info:', userData);

      if (!userData.success || !userData.user || !userData.user.id) {
        console.error('Invalid user data');
        this.showError('Некоректні дані користувача');
        return false;
      }

      // Тепер виконуємо синхронізацію з Node.js
      const response = await fetch('/api/messages_api_fixed.php?action=sync-to-node', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error(`Sync error HTTP: ${response.status}`);
        // Для діагностики отримаємо текст помилки
        const errorText = await response.text();
        console.error('Error response:', errorText);
        this.showError(`Помилка синхронізації: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log('Sync response:', data);

      if (!data.success) {
        console.error('Sync failed:', data.message);
        this.showError(`Помилка синхронізації: ${data.message}`);
        return false;
      }

      // Запам'ятовуємо інформацію про користувача
      this.currentUser = {
        id: data.user._id,
        phpUserId: data.user.phpUserId,
        email: data.user.email,
        firstname: data.user.firstname,
        lastname: data.user.lastname
      };

      console.log('User successfully synced with Node.js');
      return true;
    } catch (error) {
      console.error('Error syncing user to Node.js:', error);
      this.showError(`Помилка з'єднання: ${error.message}`);
      return false;
    }
  }

  // Налаштування Socket.IO слухачів
  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to messaging server');
      this.isConnected = true;

      // Повідомляємо сервер що користувач онлайн
      if (this.currentUser) {
        this.socket.emit('user-online', {
          phpUserId: this.currentUser.phpUserId
        });
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from messaging server');
      this.isConnected = false;
    });

    this.socket.on('new-message', (message) => {
      this.handleNewMessage(message);
    });

    this.socket.on('user-status-change', (statusData) => {
      this.updateUserStatus(statusData);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.showError('Помилка підключення до сервера');
    });
  }

  // Завантаження чат-кімнат
  async loadChatRooms() {
    try {
      const response = await fetch('http://localhost:3000/api/chat-rooms', {
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        this.renderChatRooms(result.chatRooms);
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error);
    }
  }

  // Рендеринг чат-кімнат
  renderChatRooms(chatRooms) {
    const chatListItems = document.querySelector('.chat-list-items');
    if (!chatListItems) return;

    chatListItems.innerHTML = '';

    chatRooms.forEach(room => {
      const roomElement = document.createElement('div');
      roomElement.className = 'chat-item';
      roomElement.dataset.roomId = room._id;

      // Визначаємо ім'я чату
      let roomName = room.name;
      if (!room.isGroup && room.members.length === 2) {
        // Для приватних чатів показуємо ім'я співрозмовника
        const otherMember = room.members.find(m => m.phpUserId !== this.currentUser.phpUserId);
        if (otherMember) {
          roomName = `${otherMember.firstname} ${otherMember.lastname}`;
        }
      }

      roomElement.innerHTML = `
                <div class="chat-avatar">
                    <img src="/public/src/assets/avatar-placeholder.png" alt="${roomName}">
                </div>
                <div class="chat-info">
                    <span class="chat-name">${roomName}</span>
                    <span class="chat-members">${room.members.length} учасників</span>
                </div>
            `;

      roomElement.addEventListener('click', () => {
        this.selectChatRoom(room);
      });

      chatListItems.appendChild(roomElement);
    });
  }

  // Вибір чат-кімнати
  async selectChatRoom(room) {
    // Залишаємо попередню кімнату
    if (this.currentRoom) {
      this.socket.emit('leave-room', this.currentRoom._id);
    }

    this.currentRoom = room;

    // Приєднуємося до нової кімнати
    this.socket.emit('join-room', room._id);

    // Оновлюємо UI
    this.updateChatHeader(room);
    this.updateChatMembers(room);
    await this.loadMessages(room._id);

    // Оновлюємо активний елемент
    document.querySelectorAll('.chat-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-room-id="${room._id}"]`)?.classList.add('active');
  }

  // Оновлення заголовка чату
  updateChatHeader(room) {
    const chatHeader = document.querySelector('.chat-header h2');
    if (chatHeader) {
      let roomName = room.name;
      if (!room.isGroup && room.members.length === 2) {
        const otherMember = room.members.find(m => m.phpUserId !== this.currentUser.phpUserId);
        if (otherMember) {
          roomName = `${otherMember.firstname} ${otherMember.lastname}`;
        }
      }
      chatHeader.textContent = roomName;
    }
  }

  // Оновлення списку учасників
  updateChatMembers(room) {
    const membersList = document.querySelector('.members-list');
    if (!membersList) return;

    membersList.innerHTML = '';

    room.members.forEach(member => {
      const memberElement = document.createElement('div');
      memberElement.className = 'member';
      memberElement.title = `${member.firstname} ${member.lastname}`;

      // Виділяємо поточного користувача
      if (member.phpUserId === this.currentUser.phpUserId) {
        memberElement.classList.add('current-user');
      }

      memberElement.innerHTML = `
                <img src="/public/src/assets/avatar-placeholder.png" alt="${member.firstname}">
                <div class="member-status ${member.isOnline ? 'online' : 'offline'}"></div>
            `;

      membersList.appendChild(memberElement);
    });

    // Додаємо кнопку для додавання учасників
    const addMemberBtn = document.createElement('div');
    addMemberBtn.className = 'member add-member';
    addMemberBtn.innerHTML = '<span>+</span>';
    addMemberBtn.addEventListener('click', () => {
      this.showAddMemberDialog();
    });
    membersList.appendChild(addMemberBtn);
  }

  // Завантаження повідомлень
  async loadMessages(roomId) {
    try {
      const response = await fetch(`http://localhost:3000/api/chat-rooms/${roomId}/messages`, {
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        this.renderMessages(result.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  // Рендеринг повідомлень
  renderMessages(messages) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = '';

    messages.forEach(message => {
      this.addMessageToUI(message);
    });

    // Прокручуємо до низу
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Додавання повідомлення до UI
  addMessageToUI(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    const isOwnMessage = message.sender.phpUserId === this.currentUser.phpUserId;
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isOwnMessage ? 'outgoing' : 'incoming'}`;

    const timestamp = new Date(message.timestamp).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (isOwnMessage) {
      messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${this.escapeHtml(message.content)}</p>
                    </div>
                    <span class="message-sender">Ви • ${timestamp}</span>
                </div>
                <div class="message-avatar">
                    <img src="/public/src/assets/avatar-placeholder.png" alt="Me">
                </div>
            `;
    } else {
      messageElement.innerHTML = `
                <div class="message-avatar">
                    <img src="/public/src/assets/avatar-placeholder.png" alt="${message.sender.firstname}">
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        <p>${this.escapeHtml(message.content)}</p>
                    </div>
                    <span class="message-sender">${message.sender.firstname} ${message.sender.lastname} • ${timestamp}</span>
                </div>
            `;
    }

    chatMessages.appendChild(messageElement);
  }

  // Обробка нового повідомлення
  handleNewMessage(message) {
    // Якщо повідомлення для поточної кімнати, додаємо до UI
    if (this.currentRoom && message.chatRoom === this.currentRoom._id) {
      this.addMessageToUI(message);

      // Прокручуємо до низу
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }

    // Показуємо сповіщення якщо не в поточній кімнаті або сторінка не активна
    if (!this.currentRoom || message.chatRoom !== this.currentRoom._id || document.hidden) {
      this.showNotification(message);
    }
  }

  // Відправка повідомлення
  sendMessage(content) {
    if (!this.currentRoom || !content.trim()) return;

    this.socket.emit('send-message', {
      roomId: this.currentRoom._id,
      content: content.trim()
    });
  }

  // Створення нового чату
  async createNewChat(name, description, memberPhpIds, isGroup = true) {
    try {
      const response = await fetch('http://localhost:3000/api/chat-rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name,
          description,
          memberIds: memberPhpIds,
          isGroup
        })
      });

      const result = await response.json();
      if (result.success) {
        // Оновлюємо список чатів
        await this.loadChatRooms();
        // Вибираємо новий чат
        this.selectChatRoom(result.chatRoom);
        return true;
      } else {
        this.showError(result.message || 'Не вдалося створити чат');
        return false;
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      this.showError('Помилка створення чату');
      return false;
    }
  }

  // Налаштування UI
  setupUI() {
    // Обробник відправки повідомлення
    const sendBtn = document.querySelector('.send-btn');
    const chatInput = document.querySelector('.chat-input input');

    if (sendBtn && chatInput) {
      sendBtn.addEventListener('click', () => {
        this.sendMessage(chatInput.value);
        chatInput.value = '';
      });

      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage(chatInput.value);
          chatInput.value = '';
        }
      });
    }

    // Обробник створення нового чату
    const newChatBtn = document.querySelector('.new-chat-btn');
    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        this.showNewChatDialog();
      });
    }
  }

  // Показ діалогу нового чату
  async showNewChatDialog() {
    try {
      // Завантажуємо список студентів
      const response = await fetch('/api/messages_api.php?action=get-students');
      const result = await response.json();

      if (!result.success) {
        this.showError('Не вдалося завантажити список студентів');
        return;
      }

      // Створюємо діалог
      const dialog = this.createNewChatDialog(result.students);
      document.body.appendChild(dialog);

    } catch (error) {
      console.error('Failed to show new chat dialog:', error);
      this.showError('Помилка завантаження діалогу');
    }
  }

  // Створення діалогу нового чату
  createNewChatDialog(students) {
    const dialog = document.createElement('div');
    dialog.className = 'new-chat-dialog';
    dialog.innerHTML = `
            <div class="dialog-overlay">
                <div class="dialog-content">
                    <h3>Створити новий чат</h3>
                    <form id="new-chat-form">
                        <label for="chat-name">Назва чату:</label>
                        <input type="text" id="chat-name" required>
                        
                        <label for="chat-description">Опис (необов'язково):</label>
                        <textarea id="chat-description"></textarea>
                        
                        <label>Учасники:</label>
                        <div class="students-list">
                            ${students.map(student => `
                                <label class="student-option">
                                    <input type="checkbox" value="${student.user_id}" data-name="${student.firstname} ${student.lastname}">
                                    <span>${student.firstname} ${student.lastname} (${student.student_group})</span>
                                </label>
                            `).join('')}
                        </div>
                        
                        <div class="dialog-buttons">
                            <button type="button" class="cancel-btn">Скасувати</button>
                            <button type="submit" class="create-btn">Створити</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

    // Обробники подій
    const form = dialog.querySelector('#new-chat-form');
    const cancelBtn = dialog.querySelector('.cancel-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = dialog.querySelector('#chat-name').value.trim();
      const description = dialog.querySelector('#chat-description').value.trim();
      const selectedStudents = Array.from(dialog.querySelectorAll('.student-option input:checked'));

      if (!name) {
        alert('Введіть назву чату');
        return;
      }

      if (selectedStudents.length === 0) {
        alert('Виберіть хоча б одного учасника');
        return;
      }

      const memberIds = selectedStudents.map(input => parseInt(input.value));

      const success = await this.createNewChat(name, description, memberIds, true);
      if (success) {
        document.body.removeChild(dialog);
      }
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog.querySelector('.dialog-overlay')) {
        document.body.removeChild(dialog);
      }
    });

    return dialog;
  }

  // Показ сповіщення
  showNotification(message) {
    // Анімація дзвіночка
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
      notificationBtn.style.animation = 'neonShake 0.5s ease-in-out';
      setTimeout(() => {
        notificationBtn.style.animation = '';
      }, 500);
    }

    // Показуємо сповіщення в попапі
    this.addNotificationToPopup({
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp
    });

    // Браузерне сповіщення (якщо дозволено)
    if (Notification.permission === 'granted') {
      new Notification(`${message.sender.firstname} ${message.sender.lastname}`, {
        body: message.content,
        icon: '/public/src/assets/avatar-placeholder.png'
      });
    }
  }

  // Додавання сповіщення до попапу
  addNotificationToPopup(notification) {
    const popupBody = document.querySelector('#notifications-popup .popup-body');
    if (!popupBody) return;

    const notificationElement = document.createElement('div');
    notificationElement.className = 'notification';
    notificationElement.innerHTML = `
            <div>
                <img src="/public/src/assets/avatar-placeholder.png" alt="${notification.sender.firstname}">
                <p>${notification.sender.firstname} ${notification.sender.lastname}</p>
            </div>
            <p>${this.escapeHtml(notification.content)}</p>
        `;

    // Додаємо обробник кліку для переходу до чату
    notificationElement.addEventListener('click', () => {
      // Перенаправляємо на сторінку повідомлень, якщо не на ній
      if (!window.location.pathname.includes('/messages/')) {
        window.location.href = '/views/messages/index.php';
      }
    });

    popupBody.insertBefore(notificationElement, popupBody.firstChild);

    // Обмежуємо кількість сповіщень
    const notifications = popupBody.querySelectorAll('.notification');
    if (notifications.length > 10) {
      popupBody.removeChild(notifications[notifications.length - 1]);
    }
  }

  // Оновлення статусу користувача
  updateUserStatus(statusData) {
    // Оновлюємо статус в списку учасників поточного чату
    if (this.currentRoom) {
      const member = this.currentRoom.members.find(m => m.phpUserId === statusData.phpUserId);
      if (member) {
        member.isOnline = statusData.isOnline;
        member.lastSeen = statusData.lastSeen;
        this.updateChatMembers(this.currentRoom);
      }
    }

    // Оновлюємо статус в таблиці студентів, якщо знаходимося на сторінці студентів
    const studentRow = document.querySelector(`tr[data-id="${statusData.phpUserId}"]`);
    if (studentRow) {
      const statusCell = studentRow.querySelector('.active, .inactive');
      if (statusCell) {
        statusCell.className = statusData.isOnline ? 'active' : 'inactive';
      }
    }
  }

  // Екранування HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Показ помилки
  showError(message) {
    console.error(message);
    // Тут можна додати більш красиве відображення помилок
    alert(message);
  }

  // Запит дозволу на сповіщення
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// Ініціалізація клієнта повідомлень
let messagingClient;

document.addEventListener('DOMContentLoaded', function() {
  // Ініціалізуємо клієнт тільки якщо користувач авторизований
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  if (currentUser.id) {
    messagingClient = new MessagingClient();
    messagingClient.requestNotificationPermission();

    // Затримка для забезпечення повної ініціалізації сторінки
    setTimeout(() => {
      messagingClient.init().catch(error => {
        console.error('Failed to initialize messaging client:', error);
      });
    }, 1000);
  }
});

// Експортуємо для використання в інших файлах
window.MessagingClient = MessagingClient;
window.messagingClient = messagingClient;

