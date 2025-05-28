// Централізоване керування Socket.IO підключеннями
const socketManager = {
  socket: null,
  currentUserId: null,
  isInitialized: false,
  connectionListeners: [],
  disconnectionListeners: [],
  statusListeners: [],
  reconnecting: false,

  // Ініціалізація Socket.IO з'єднання
  init: function() {
    if (this.isInitialized && this.socket && this.socket.connected) {
      console.log("Socket connection already initialized");

      // Навіть якщо підключення вже ініціалізовано, примусово синхронізуємо онлайн-статус поточного користувача
      if (this.currentUserId && this.socket.connected) {
        this.forceCurrentUserOnline();
      }

      return this.socket;
    }

    console.log("Initializing shared Socket.IO connection");

    try {
      // Отримуємо ID користувача
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
      this.currentUserId = currentUser.id ? String(currentUser.id) : null;

      if (!this.currentUserId) {
        console.log("No user ID available, skipping socket connection");
        return null;
      }

      // Створюємо з'єднання для використання на всіх сторінках
      this.socket = io("http://localhost:3001", {
        reconnectionAttempts: 5,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ["websocket", "polling"],
        forceNew: false, // Важливо! Дозволяє повторно використовувати існуюче з'єднання
        secure: false,
      });

      // Налаштування базових обробників
      this.socket.on("connect", () => {
        console.log("Shared socket connection established with ID:", this.socket.id);

        // Повідомляємо серверу про підключення користувача
        this.socket.emit("user_connected", this.currentUserId);
        console.log("Registered user as online:", this.currentUserId);

        // Сповіщаємо всіх слухачів про підключення
        this.connectionListeners.forEach(listener => listener());
      });

      // Додаємо обробник події reconnecting
      this.socket.io.on("reconnect_attempt", (attempt) => {
        console.log("Attempting to reconnect, attempt #", attempt);
        this.reconnecting = true;
      });

      // Додаємо обробник успішного перепідключення
      this.socket.io.on("reconnect", () => {
        console.log("Successfully reconnected to socket server");
        this.reconnecting = false;

        // При перепідключенні одразу повідомляємо сервер, що користувач онлайн
        if (this.currentUserId) {
          this.socket.emit("user_connected", this.currentUserId);
          console.log("Re-registered user as online after reconnect:", this.currentUserId);
        }
      });

      this.socket.on("disconnect", () => {
        console.log("Shared socket disconnected");

        // Сповіщаємо всіх слухачів про відключення
        this.disconnectionListeners.forEach(listener => listener());
      });

      // Обробка оновлень статусів користувачів
      this.socket.on("user_status", (data) => {
        console.log("User status update received:", data);

        // Захист від випадкової зміни статусу свого користувача на offline
        if (data.userId === this.currentUserId && data.status === "offline" && this.socket && this.socket.connected) {
          console.log("Ignoring offline status for current user because we are connected");
          this.forceCurrentUserOnline(); // Повторно встановлюємо статус онлайн
          return; // Не передаємо подію слухачам
        }

        this.statusListeners.forEach(listener => listener(data));
      });

      this.socket.on("online_users", (onlineUsers) => {
        console.log("Online users list received:", onlineUsers);

        // Захист від випадкової відсутності поточного користувача в списку онлайн
        let updatedOnlineUsers = [...onlineUsers];

        if (this.currentUserId && this.socket && this.socket.connected) {
          if (!updatedOnlineUsers.includes(String(this.currentUserId))) {
            console.log("Adding current user to online users list");
            updatedOnlineUsers.push(String(this.currentUserId));

            // Повторно повідомляємо сервер про те, що користувач онлайн
            this.forceCurrentUserOnline();
          }
        }

        // Передаємо оновлений список слухачам
        this.statusListeners.forEach(listener => listener({
          type: "online_users",
          users: updatedOnlineUsers
        }));
      });

      this.isInitialized = true;
      return this.socket;
    } catch (error) {
      console.error("Error initializing shared socket connection:", error);
      return null;
    }
  },

  // Нова функція для примусової відправки онлайн-статусу поточного користувача
  forceCurrentUserOnline: function() {
    if (this.currentUserId && this.socket && this.socket.connected) {
      console.log("Forcing current user online status:", this.currentUserId);
      this.socket.emit("user_connected", this.currentUserId);

      // Додатково генеруємо локальну подію статусу для всіх слухачів
      this.statusListeners.forEach(listener => listener({
        userId: this.currentUserId,
        status: "online"
      }));

      // Повертаємо true, якщо було успішно виконано
      return true;
    }
    return false;
  },

  // Додавання слухачів підключення
  addConnectionListener: function(listener) {
    this.connectionListeners.push(listener);
    // Якщо вже підключено, викликаємо слухача одразу
    if (this.socket && this.socket.connected) {
      listener();
    }
  },

  // Додавання слухачів відключення
  addDisconnectionListener: function(listener) {
    this.disconnectionListeners.push(listener);
  },

  // Додавання слухачів статусів
  addStatusListener: function(listener) {
    this.statusListeners.push(listener);
  },

  // Отримання поточного з'єднання або створення нового
  getSocket: function() {
    if (!this.socket || !this.isInitialized) {
      return this.init();
    }

    // Навіть при отриманні існуючого сокета, перевіряємо статус поточного користувача
    if (this.currentUserId && this.socket && this.socket.connected) {
      // Викликаємо функцію примусового встановлення статусу поточного користувача як онлайн
      setTimeout(() => this.forceCurrentUserOnline(), 100);
    }

    return this.socket;
  },

  // Перевірка чи користувач онлайн
  isUserOnline: function(userId) {
    // Якщо це поточний користувач і є підключений сокет, вважаємо онлайн
    if (userId === this.currentUserId && this.socket && this.socket.connected) {
      return true;
    }
    // Інакше перевіряємо стан підключення
    return this.socket && this.socket.connected;
  },

  // Запит статусів користувачів
  requestUserStatuses: function() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('request_user_statuses');

      // Додаткова гарантія, що власний статус буде онлайн
      setTimeout(() => this.forceCurrentUserOnline(), 100);
      return true;
    }
    return false;
  },

  // Відправка повідомлення через сокет
  emit: function(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }
};

// Ініціалізуємо сокет-менеджер одразу при завантаженні скрипта
document.addEventListener('DOMContentLoaded', function() {
  socketManager.init();

  // Додатково встановлюємо періодичну перевірку та підтримку онлайн-статусу
  setInterval(() => {
    if (socketManager.currentUserId && socketManager.socket && socketManager.socket.connected) {
      socketManager.forceCurrentUserOnline();
    }
  }, 10000); // Кожні 10 секунд
});

// Експорт для використання в інших скриптах
window.socketManager = socketManager;
