// Chat functionality for the messaging system
const chatClient = {
  socket: null,
  currentChatId: null,
  currentUserId: null, // Will be string
  typing: false,
  typingTimeout: null,
  eventListenersInitialized: false,
  knownOnlineUsers: new Set(), // Cache for online user IDs

  // Initialize chat client
  init: function () {
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    this.currentUserId = currentUser.id ? String(currentUser.id) : null; // Ensure string

    // Initialize Socket.IO connection using our shared socket manager
    try {
      console.log("Getting shared Socket.IO connection...");

      // Перевіряємо, чи вже доступний socket-manager
      if (window.socketManager) {
        this.socket = window.socketManager.getSocket();
        console.log("Using shared socket connection:", this.socket ? this.socket.id : "not connected");
      } else {
        // Fallback якщо з якихось причин socket-manager недоступний
        console.log("Socket manager not available, creating direct connection");

        this.socket = io("http://localhost:3001", {
          reconnectionAttempts: 5,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          transports: ["websocket", "polling"],
          forceNew: false, // Важливо! Не створюємо нове з'єднання, якщо вже є
          secure: false,
        });
      }

      // Додаємо обробники для моніторингу стану з'єднання
      this.socket.on("connect", () => {
        console.log(
            "Socket.IO successfully connected with ID:",
            this.socket.id
        );

        // Якщо був показаний елемент з помилкою, видаляємо його
        const errorElements = document.querySelectorAll(".chat-error-message");
        errorElements.forEach((el) => el.remove());

        // Пробуємо завантажити чати одразу після підключення
        if (this.currentUserId) {
          this.connectUser();
          this.loadChats();
        }
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        this.showErrorInChatWindow(
            "Не вдалось підключитися до чат-сервера. Перевірте, чи запущено сервер."
        );
      });

      console.log("Socket.IO initialization attempt complete");
    } catch (error) {
      console.error("Socket.IO initialization error:", error);
      this.showErrorInChatWindow(
          "Помилка ініціалізації чат-клієнта. Перевірте, чи запущено сервер."
      );
      return this;
    }

    // Set up socket event listeners
    this.setupSocketEvents();

    // Initial UI setup only once
    if (!this.eventListenersInitialized) {
      this.setupUI.bind(this)(); // ensures correct `this`
      this.eventListenersInitialized = true;
    }

    // Connect user to socket if logged in
    if (this.currentUserId && this.socket && this.socket.connected) {
      this.connectUser();
    } else if (this.currentUserId && this.socket) {
      // Якщо користувач авторизований, але сокет ще не підключений,
      // налаштовуємо обробник для підключення, коли сокет стане активним
      this.socket.on("connect", () => {
        this.connectUser();
      });
    }

    return this;
  },

  // Set up socket event handlers
  setupSocketEvents: function () {
    // First remove any existing listeners to prevent duplicates
    this.socket.removeAllListeners("chat_message");
    this.socket.removeAllListeners("new_message_notification");
    this.socket.removeAllListeners("user_status");
    this.socket.removeAllListeners("online_users");
    this.socket.removeAllListeners("typing");
    this.socket.removeAllListeners("messages_read");
    this.socket.removeAllListeners("connect_error");
    this.socket.removeAllListeners("error");
    this.socket.removeAllListeners("new_chat");

    // Handle incoming messages
    this.socket.on("chat_message", (messageData) => {
      // Update chat UI with new message
      this.addMessageToUI(messageData);

      // Mark message as read if it's in current chat and from someone else
      if (
          messageData.chat_id === this.currentChatId &&
          String(messageData.sender) !== this.currentUserId
      ) {
        this.markMessagesAsRead(this.currentChatId);
      }
    });

    // Handle notification for new messages
    this.socket.on("new_message_notification", (data) => {
      // If we're not currently in the chat where the message arrived, show notification
      if (data.chat_id !== this.currentChatId) {
        this.showNotification(data);
      }
    });

    // Handle new chat created notification
    this.socket.on("new_chat", (data) => {
      console.log("New chat notification received:", data);
      // Reload chat list to include the new chat
      this.loadChats();
    });

    // Handle user status updates
    this.socket.on("user_status", (data) => {
      // data: { userId, status }
      const userIdStr = String(data.userId);
      if (data.status === "online") {
        this.knownOnlineUsers.add(userIdStr);
      } else {
        this.knownOnlineUsers.delete(userIdStr);
      }
      this.updateUserStatus(userIdStr, data.status);
    });

    // Handle initial online users list
    this.socket.on("online_users", (onlineUserIds) => {
      // onlineUserIds is an array of strings
      this.knownOnlineUsers = new Set(onlineUserIds.map((id) => String(id))); // Update cache, ensure strings

      this.markAllUsersAsOfflineInitially(); // Set baseline for all users on page

      this.knownOnlineUsers.forEach((userId) => {
        // userId here is a string
        this.updateUserStatus(userId, "online");
      });
    });

    // Handle typing indicators
    this.socket.on("typing", (data) => {
      if (data.chat_id === this.currentChatId) {
        this.showTypingIndicator(data.user);
      }
    });

    // Handle read receipts
    this.socket.on("messages_read", (data) => {
      if (data.chat_id === this.currentChatId) {
        this.updateReadReceipts(data.by);
      }
    });

    // Handle connection errors
    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      // Show connection error message
      this.showErrorMessage(
          "Could not connect to chat server. Please try again later."
      );
    });

    // Handle general errors
    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.showErrorMessage(error.message || "An error occurred");
    });
  },

  // Set up UI events
  setupUI: function () {
    console.log("Setting up UI event listeners");

    // Remove existing event listeners to prevent duplication
    this.removeEventListeners();

    // Chat item click event
    document.querySelectorAll(".chat-item").forEach((item) => {
      if (typeof this.handleChatItemClick === "function") {
        item.addEventListener("click", this.handleChatItemClick.bind(this));
      } else {
        console.error(
            "handleChatItemClick is not a function:",
            this.handleChatItemClick
        );
      }
    });

    // Send message button click
    const sendBtn = document.querySelector(".send-btn");
    if (sendBtn) {
      sendBtn.addEventListener("click", this.sendMessage.bind(this));
    }

    // Message input keypress (for Enter key)
    const chatInput = document.querySelector(".chat-input input");
    if (chatInput) {
      chatInput.addEventListener(
          "keypress",
          this.handleInputKeypress.bind(this)
      );
      // Typing indicator
      chatInput.addEventListener("input", this.handleTypingEvent.bind(this));
    }

    // New chat room button
    const newChatBtn = document.querySelector(".new-chat-btn");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", this.showNewChatModal.bind(this));
    }

    // Create chat button in modal
    const createChatBtn = document.getElementById("create-chat-btn");
    if (createChatBtn) {
      createChatBtn.addEventListener("click", this.createNewChat.bind(this));
    }

    // Close modal button
    const closeModal = document.getElementById("close-new-chat");
    if (closeModal) {
      closeModal.addEventListener("click", this.hideNewChatModal.bind(this));
    }

    // Add member button
    const addMemberBtn = document.querySelector(".add-member");
    if (addMemberBtn) {
      addMemberBtn.addEventListener("click", this.showAddMembersUI.bind(this));
    }

    // Setup notification click handler
    document.addEventListener("click", this.handleNotificationClick.bind(this));

    // Check for notification bell animation
    this.updateUnreadCount();
  },

  // Handler functions for event listeners
  handleChatItemClick: function (e) {
    const chatId = e.currentTarget.dataset.chatId;
    if (chatId) {
      this.selectChat(chatId);
    }
  },

  handleInputKeypress: function (e) {
    if (e.key === "Enter") {
      this.sendMessage();
    }
  },

  handleNotificationClick: function (e) {
    if (e.target.closest(".notification[data-chat-id]")) {
      const chatId = e.target.closest(".notification").dataset.chatId;
      if (chatId) {
        this.selectChat(chatId);
        // Hide notifications popup if visible
        const popup = document.getElementById("notifications-popup");
        if (popup) {
          popup.style.display = "none";
        }
      }
    }
  },

  // Remove existing event listeners to prevent duplication
  removeEventListeners: function () {
    document.querySelectorAll(".chat-item").forEach((item) => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
    });

    const sendBtn = document.querySelector(".send-btn");
    if (sendBtn) {
      const newSendBtn = sendBtn.cloneNode(true);
      sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
    }

    const chatInput = document.querySelector(".chat-input input");
    if (chatInput) {
      const newChatInput = chatInput.cloneNode(true);
      chatInput.parentNode.replaceChild(newChatInput, chatInput);
    }

    const newChatBtn = document.querySelector(".new-chat-btn");
    if (newChatBtn) {
      const newNewChatBtn = newChatBtn.cloneNode(true);
      newChatBtn.parentNode.replaceChild(newNewChatBtn, newChatBtn);
    }

    const createChatBtn = document.getElementById("create-chat-btn");
    if (createChatBtn) {
      const newCreateChatBtn = createChatBtn.cloneNode(true);
      createChatBtn.parentNode.replaceChild(newCreateChatBtn, createChatBtn);
    }

    const closeModal = document.getElementById("close-new-chat");
    if (closeModal) {
      const newCloseModal = closeModal.cloneNode(true);
      closeModal.parentNode.replaceChild(newCloseModal, closeModal);
    }

    const addMemberBtn = document.querySelector(".add-member");
    if (addMemberBtn) {
      const newAddMemberBtn = addMemberBtn.cloneNode(true);
      addMemberBtn.parentNode.replaceChild(newAddMemberBtn, addMemberBtn);
    }
  },

  // Connect user to socket
  connectUser: function () {
    if (this.currentUserId) {
      this.socket.emit("user_connected", this.currentUserId);
      console.log("Connected user to socket:", this.currentUserId);
    } else {
      console.log("No user ID available, connection limited");
    }
  },

  // Select a chat and load its messages
  selectChat: function (chatId) {
    // Update UI to show selected chat
    document.querySelectorAll(".chat-item").forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.chatId === chatId) {
        item.classList.add("active");
      }
    });

    // Leave previous chat room if any
    if (this.currentChatId) {
      // No need to explicitly leave with socket.io, it's handled automatically
    }

    // Set current chat id
    this.currentChatId = chatId;

    // Join new chat room
    this.socket.emit("join_chat", chatId);

    // Update chat header
    const chatName =
        document.querySelector(".chat-item.active .chat-name")?.textContent ||
        "Chat";
    document.querySelector(
        ".chat-header h2"
    ).textContent = `Chat room ${chatName}`;

    // Clear messages container
    document.querySelector(".chat-messages").innerHTML = "";

    // Load chat history
    this.loadChatHistory(chatId);

    // Mark messages as read
    this.markMessagesAsRead(chatId);

    // Update URL to include chat ID
    window.history.replaceState(
        null,
        "",
        `/views/messages/index.php?chat=${chatId}`
    );

    // After selecting chat, remove notification highlight for this chat
    this.clearNotificationForChat(chatId);
  },

  // Clear notification for a specific chat
  clearNotificationForChat: function (chatId) {
    const notification = document.querySelector(
        `.notification[data-chat-id="${chatId}"]`
    );
    if (notification) {
      notification.remove();
    }

    // Update unread count
    this.updateUnreadCount();
  },

  // Load chat history from server
  loadChatHistory: async function (chatId) {
    try {
      const response = await fetch(
          `http://localhost:3001/api/chats/${chatId}/messages`
      );
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        // Clear existing messages first
        document.querySelector(".chat-messages").innerHTML = "";

        // Add all messages to UI
        result.data.forEach((message) => {
          this.addMessageToUI(message, true); // true means this is from history
        });

        // Scroll to bottom
        this.scrollToBottom();

        // Load and display chat members
        this.loadChatMembers(chatId);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      this.showErrorMessage("Failed to load chat history.");
    }
  },

  // Load and display chat members
  loadChatMembers: async function (chatId) {
    try {
      // Get chat details to get member list
      const response = await fetch(
          `http://localhost:3001/api/chats/${chatId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data && Array.isArray(result.data.members)) {
        const membersList = document.querySelector(".members-list");
        if (!membersList) {
          console.error("Members list container not found");
          return;
        }
        // Clear existing members except add button
        const addMemberBtn = membersList.querySelector(".add-member");
        membersList.innerHTML = "";

        if (addMemberBtn) {
          membersList.appendChild(addMemberBtn);
        }

        // Display each member
        for (const memberId of result.data.members) {
          await this.addMemberToUI(memberId, membersList);
        }
      }
    } catch (error) {
      console.error("Error loading chat members:", error);
    }
  },

  // Add a member to the UI
  addMemberToUI: async function (memberId, container) {
    try {
      // Get user info from API
      let memberName = "Unknown User";
      let memberStatus = "offline";

      // Try to get member info from local storage users or students API
      let memberInfo = await this.getMemberInfo(memberId);
      if (memberInfo) {
        memberName = `${memberInfo.firstname} ${memberInfo.lastname}`;
      }

      // Create member element
      const memberDiv = document.createElement("div");
      memberDiv.className = `member ${memberStatus}`;
      memberDiv.dataset.userId = memberId;

      // Check if this is the current user
      const isCurrentUser = memberId === this.currentUserId;
      if (isCurrentUser) {
        memberDiv.classList.add("current-user");
      }

      // Create avatar and name elements
      const avatar = document.createElement("img");
      avatar.src = "/public/src/assets/avatar-placeholder.png";
      avatar.alt = memberName;

      const nameSpan = document.createElement("span");
      nameSpan.textContent = isCurrentUser ? `${memberName} (You)` : memberName;

      memberDiv.appendChild(avatar);
      memberDiv.appendChild(nameSpan);

      // Add status indicator
      const statusIndicator = document.createElement("div");
      statusIndicator.className = "status-indicator";
      memberDiv.appendChild(statusIndicator);

      // Insert before the add button
      const addButton = container.querySelector(".add-member");
      if (addButton) {
        container.insertBefore(memberDiv, addButton);
      } else {
        container.appendChild(memberDiv);
      }
    } catch (error) {
      console.error("Error adding member to UI:", error);
    }
  },

  // Get member info from available sources
  getMemberInfo: async function (memberId) {
    const memberIdStr = String(memberId); // memberId is expected to be a user_id

    // Check localStorage for current user (currentUser.id is a user_id)
    const currentUserData = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
    );
    if (
        currentUserData.id !== undefined &&
        String(currentUserData.id) === memberIdStr
    ) {
      // Ensure a consistent object structure is returned, similar to what a student object might provide
      return {
        id: currentUserData.id, // or user_id, depending on consistency needs
        user_id: currentUserData.id, // Explicitly add user_id if needed elsewhere
        firstname: currentUserData.firstname,
        lastname: currentUserData.lastname,
        // Add other fields if your UI expects them, e.g., student_group
      };
    }

    try {
      // studentsApi.getAllStudents() returns an array of student objects.
      // Each student object should have .user_id, .firstname, .lastname
      const students = await studentsApi.getAllStudents(); // Ensure this API is robust and returns user_id
      if (!Array.isArray(students)) {
        console.error(
            "studentsApi.getAllStudents() did not return an array.",
            students
        );
        throw new Error("Invalid data from student API");
      }

      const student = students.find(
          (s) => s.user_id !== undefined && String(s.user_id) === memberIdStr
      );

      if (student) {
        // Return an object that includes firstname and lastname, and user_id
        // Ensure the returned object structure is what addMessageToUI and addMemberToUI expect
        return {
          id: student.id, // This is student's own PK, might be useful
          user_id: student.user_id,
          firstname: student.firstname,
          lastname: student.lastname,
          student_group: student.student_group,
          // include other student properties if needed by the UI
        };
      }

      console.warn(
          `Student info not found for user_id: ${memberIdStr} via studentsApi. Defaulting to generic name.`
      );
      return {
        user_id: memberIdStr,
        firstname: "User",
        lastname: memberIdStr.substring(0, 5),
      };
    } catch (error) {
      console.error(
          `Error getting student info for user_id ${memberIdStr}:`,
          error
      );
      // Return a more informative placeholder in case of error
      return {
        user_id: memberIdStr,
        firstname: "Error",
        lastname: "Loading User",
      };
    }
  },

  // Send a message
  sendMessage: function () {
    const inputField = document.querySelector(".chat-input input");
    const message = inputField.value.trim();

    if (!message || !this.currentChatId) return;

    // Prepare message data
    const messageData = {
      chat_id: this.currentChatId,
      sender: this.currentUserId,
      content: message,
    };

    // Send via socket
    this.socket.emit("chat_message", messageData);

    // Clear input field
    inputField.value = "";

    // Stop typing indicator
    clearTimeout(this.typingTimeout);
    this.typing = false;
  },

  // Add a message to the UI
  addMessageToUI: function (messageData, isHistory = false) {
    const chatMessages = document.querySelector(".chat-messages");

    // Convert IDs to strings for reliable comparison
    const currentUserIdStr = String(this.currentUserId);
    const messageSenderStr = String(messageData.sender);

    // Check if this is a message sent by the current user
    const isOutgoing = messageSenderStr === currentUserIdStr;

    // For incoming messages, try to find the sender's name
    let senderName = "Unknown User";

    if (isOutgoing) {
      senderName = "Me";
    } else {
      // Try to get the sender's name asynchronously
      this.getMemberInfo(messageData.sender)
          .then((memberInfo) => {
            if (memberInfo) {
              senderName = `${memberInfo.firstname} ${memberInfo.lastname}`;
              // Update the sender name in the DOM
              const senderElement = document.querySelector(
                  `.message[data-id="${messageData._id}"] .message-sender`
              );
              if (senderElement) {
                senderElement.textContent = this.escapeHtml(senderName);
              }
            }
          })
          .catch((err) => console.error("Error getting sender info:", err));
    }

    // Format timestamp
    const timestamp = new Date(messageData.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create message HTML - ensure avatar is on the correct side based on message type
    const messageHTML = `
      <div class="message ${isOutgoing ? "outgoing" : "incoming"}" data-id="${
        messageData._id
    }">
        ${
        !isOutgoing
            ? `
          <div class="message-avatar">
            <img src="/public/src/assets/avatar-placeholder.png" alt="User">
          </div>
        `
            : ""
    }
        <div class="message-content">
          <div class="message-bubble">
            <p>${this.escapeHtml(messageData.content)}</p>
            <span class="message-time">${timestamp}</span>
          </div>
          <span class="message-sender">${this.escapeHtml(senderName)}</span>
        </div>
        ${
        isOutgoing
            ? `
          <div class="message-avatar">
            <img src="/public/src/assets/avatar-placeholder.png" alt="Me">
          </div>
        `
            : ""
    }
      </div>
    `;

    // Add to chat window
    chatMessages.insertAdjacentHTML("beforeend", messageHTML);

    // Scroll to bottom
    if (!isHistory) {
      this.scrollToBottom();
    }
  },

  // Scroll chat window to bottom
  scrollToBottom: function () {
    const chatMessages = document.querySelector(".chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  },

  // Handle typing events
  handleTypingEvent: function () {
    if (!this.typing) {
      this.typing = true;

      // Emit typing event
      this.socket.emit("typing", {
        chat_id: this.currentChatId,
        user: this.currentUserId,
      });

      // Stop typing after some time
      this.typingTimeout = setTimeout(() => {
        this.typing = false;
      }, 3000);
    }
  },

  // Show typing indicator
  showTypingIndicator: function (userId) {
    // Only show typing indicator for someone else
    if (userId === this.currentUserId) return;

    const typingIndicator =
        document.querySelector(".typing-indicator") ||
        document.createElement("div");
    if (!typingIndicator.classList.contains("typing-indicator")) {
      typingIndicator.classList.add("typing-indicator");
      typingIndicator.innerHTML = "<span>Someone is typing...</span>";
      document.querySelector(".chat-messages").appendChild(typingIndicator);
    }

    // Auto-remove after a few seconds
    clearTimeout(this.typingIndicatorTimeout);
    this.typingIndicatorTimeout = setTimeout(() => {
      typingIndicator.remove();
    }, 3000);
  },

  // Mark messages as read
  markMessagesAsRead: function (chatId) {
    if (!this.currentUserId) return;

    this.socket.emit("mark_read", {
      chat_id: chatId,
      userId: this.currentUserId,
    });

    // Also make HTTP request to update in database
    fetch(`http://localhost:3001/api/chats/${chatId}/read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: this.currentUserId }),
    }).catch((error) =>
        console.error("Error marking messages as read:", error)
    );
  },

  // Show notification for new message
  showNotification: function (data) {
    // Update notification bell
    const notificationBtn = document.getElementById("notification-btn");
    if (notificationBtn) {
      // Add notification class if not already present
      notificationBtn.classList.add("has-notifications");

      // Add animation class for visual effect
      notificationBtn.classList.add("bell-animation");
      setTimeout(() => {
        notificationBtn.classList.remove("bell-animation");
      }, 1000);

      // Play notification sound
      this.playNotificationSound();

      // Set bell to normal (not yellow)
      notificationBtn.style.backgroundImage = "url(/public/src/assets/bell.png)";
    }

    // Add to notifications popup
    const notificationsPopup = document.getElementById("notifications-popup");
    if (notificationsPopup) {
      const popupBody = notificationsPopup.querySelector(".popup-body");

      // Try to get sender info asynchronously
      this.getMemberInfo(data.sender)
          .then((memberInfo) => {
            const senderName = memberInfo
                ? `${memberInfo.firstname} ${memberInfo.lastname}`
                : `User ${data.sender.substring(0, 5)}`;

            const notificationHTML = `
            <div class="notification" data-chat-id="${data.chat_id}">
              <div>
                <img src="/public/src/assets/avatar-placeholder.png" alt="profile">
                <p>${this.escapeHtml(senderName)}</p>
              </div>
              <p>${this.escapeHtml(data.message)}</p>
            </div>
          `;

            // Add to top of notifications (prepend)
            popupBody.insertAdjacentHTML("afterbegin", notificationHTML);

            // Keep only the last 3 notifications
            const notifications = popupBody.querySelectorAll('.notification');
            if (notifications.length > 3) {
              // Remove older notifications
              for (let i = 3; i < notifications.length; i++) {
                notifications[i].remove();
              }
            }

            // Attach click event to the newly added notification
            const newNotification = popupBody.querySelector(
                `.notification[data-chat-id="${data.chat_id}"]`
            );
            if (newNotification) {
              newNotification.addEventListener("click", () => {
                this.selectChat(data.chat_id);
                notificationsPopup.style.display = "none";
              });
            }
          })
          .catch((err) =>
              console.error("Error getting member info for notification:", err)
          );
    }

    // Update unread count
    this.updateUnreadCount();
  },

  // Play notification sound
  playNotificationSound: function () {
    try {
      // Create an audio element and play notification sound
      const audio = new Audio("/public/src/assets/notification.mp3");
      audio.volume = 0.5;
      audio
          .play()
          .catch((err) => console.log("Unable to play notification sound:", err));
    } catch (error) {
      console.log("Error playing notification sound:", error);
    }
  },

  // Update unread message count
  updateUnreadCount: async function () {
    if (!this.currentUserId) return;

    try {
      const response = await fetch(
          `http://localhost:3001/api/messages/unread/${this.currentUserId}`
      );
      const result = await response.json();

      if (result.success) {
        const count = result.count;

        // Update notification bell (add badge or change color)
        const notificationBtn = document.getElementById("notification-btn");
        if (notificationBtn) {
          if (count > 0) {
            notificationBtn.classList.add("has-notifications");
            notificationBtn.setAttribute("data-count", count);
          } else {
            notificationBtn.classList.remove("has-notifications");
            notificationBtn.removeAttribute("data-count");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  },

  // Mark all users on the page as offline initially, current user as online if connected
  markAllUsersAsOfflineInitially: function () {
    const currentUserIdStr = String(this.currentUserId);

    console.log(`Setting initial statuses, current user: ${currentUserIdStr}`);

    // Helper to update status for an element
    const updateElementStatus = (elementUserId, defaultStatus) => {
      // Спочатку перевіряємо, чи це поточний користувач
      if (elementUserId === currentUserIdStr) {
        console.log(`Found current user element with ID ${elementUserId}, setting status to online`);
        this.updateUserStatus(elementUserId, "online");

        // Оновлюємо кеш - додаємо поточного користувача до онлайн-списку
        this.knownOnlineUsers.add(currentUserIdStr);
      } else {
        // Для інших користувачів перевіряємо чи вони в списку онлайн
        const isOnline = this.knownOnlineUsers.has(elementUserId);
        const status = isOnline ? "online" : defaultStatus;
        this.updateUserStatus(elementUserId, status);
      }
    };

    // For chat items and members
    document
        .querySelectorAll(".chat-item[data-user-id], .member[data-user-id]")
        .forEach((element) => {
          updateElementStatus(element.dataset.userId, "offline");
        });

    // For students table
    document
        .querySelectorAll(".students-table tr[data-user-id]")
        .forEach((row) => {
          updateElementStatus(row.dataset.userId, "offline");
        });
  },

  // Update user status indicators
  updateUserStatus: function (userId, status) {
    const userIdStr = String(userId); // Ensure userId is a string

    console.log(`Updating status for user ${userIdStr} to ${status} in chat interface`);

    // Update status in the members list - directly targeting .member elements with the data-user-id attribute
    const memberElements = document.querySelectorAll(`.member[data-user-id="${userIdStr}"]`);

    // Also update status in chat items (for the chat list)
    const chatItemElements = document.querySelectorAll(`.chat-item[data-user-id="${userIdStr}"]`);

    // Find any other elements with the user's ID (for example, in the chat messages)
    const otherElements = document.querySelectorAll(`[data-user-id="${userIdStr}"]:not(.member):not(.chat-item)`);

    const allElements = [...memberElements, ...chatItemElements, ...otherElements];

    console.log(`Found ${allElements.length} elements to update in chat interface: ${memberElements.length} members, ${chatItemElements.length} chat items, and ${otherElements.length} other elements`);

    if (allElements.length === 0) {
      // If no specific elements found, we might need to create status elements for future reference
      console.log(`No elements found with data-user-id="${userIdStr}", adding to known online users cache only`);
      // Still update the knownOnlineUsers cache
      if (status === 'online') {
        this.knownOnlineUsers.add(userIdStr);
      } else {
        this.knownOnlineUsers.delete(userIdStr);
      }
      return;
    }

    allElements.forEach((element) => {
      // Remove all status classes first
      element.classList.remove("online", "offline", "away");

      // Add the current status class
      element.classList.add(status);

      // Update status indicator if it exists
      const statusIndicator = element.querySelector(".status-indicator");
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${status}`;
        statusIndicator.title = status.charAt(0).toUpperCase() + status.slice(1);
        console.log(`Updated status indicator for user ${userIdStr} in element:`, element);
      } else {
        // If the status indicator doesn't exist, create one
        const newStatusIndicator = document.createElement('div');
        newStatusIndicator.className = `status-indicator ${status}`;
        newStatusIndicator.title = status.charAt(0).toUpperCase() + status.slice(1);

        // Try to append it to a sensible location within the element
        const chatInfo = element.querySelector('.chat-info');
        if (chatInfo) {
          chatInfo.appendChild(newStatusIndicator);
          console.log(`Created new status indicator for user ${userIdStr} in chat-info`);
        } else {
          // For member elements, we should append it directly
          element.appendChild(newStatusIndicator);
          console.log(`Created new status indicator for user ${userIdStr} at element root`);
        }
      }
    });

    // Make sure the user status is synced with the onlineUserCache set
    if (status === 'online') {
      this.knownOnlineUsers.add(userIdStr);
    } else {
      this.knownOnlineUsers.delete(userIdStr);
    }
  },

  // Show error message in chat area
  showErrorMessage: function (message) {
    const chatMessages = document.querySelector(".chat-messages");
    const errorHTML = `
      <div class="chat-error-message">
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;

    chatMessages.insertAdjacentHTML("beforeend", errorHTML);
    this.scrollToBottom();
  },

  // Show modal for creating a new chat
  showNewChatModal: async function () {
    console.log("Showing new chat modal");
    const modal = document.getElementById("new-chat-modal");
    const studentsList = document.getElementById("students-list-for-chat");

    modal.style.display = "flex";

    // Load students for selection
    try {
      // Use the helper function to get students
      const students = window.chatHelpers
          ? await window.chatHelpers.getAllStudentsForChat()
          : await studentsApi.getAllStudents(); // Ensure this returns students with user_id

      if (students && students.length > 0) {
        studentsList.innerHTML = students
            .map((student) => {
              // Ensure student.user_id is available and used as the value
              if (student.user_id === undefined) {
                console.warn("Student object missing user_id:", student);
                return ""; // Skip this student or handle error
              }
              return `
          <label>
            <input type="checkbox" class="chat-student-checkbox" value="${
                  student.user_id
              }">
            ${this.escapeHtml(student.firstname)} ${this.escapeHtml(
                  student.lastname
              )} (${this.escapeHtml(student.student_group || "")})
          </label>
        `;
            })
            .join("");
      } else {
        studentsList.innerHTML = "<p>No students found</p>";
      }
    } catch (error) {
      console.error("Error loading students:", error);
      studentsList.innerHTML = "<p>Error loading students</p>";
    }
  },

  // Hide new chat modal
  hideNewChatModal: function () {
    document.getElementById("new-chat-modal").style.display = "none";
  },

  // Create a new chat from modal data
  createNewChat: async function () {
    console.log("Creating new chat");
    const chatName = document.getElementById("chat-name").value.trim();
    const selectedCheckboxes = document.querySelectorAll(
        ".chat-student-checkbox:checked"
    );
    const selectedIds = Array.from(selectedCheckboxes).map((cb) => cb.value);

    if (selectedIds.length === 0) {
      alert("Please select at least one participant");
      return;
    }

    // Add current user to members if not already included
    const currentUserIdStr = String(this.currentUserId);
    const selectedIdsStr = selectedIds.map((id) => String(id));
    if (currentUserIdStr && !selectedIdsStr.includes(currentUserIdStr)) {
      selectedIdsStr.push(currentUserIdStr);
    }
    // Remove duplicates just in case
    const uniqueIds = Array.from(new Set(selectedIdsStr));

    try {
      const response = await fetch("http://localhost:3001/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: chatName || undefined,
          members: uniqueIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Hide modal
        this.hideNewChatModal();

        // Emit socket event to notify members about new chat
        this.socket.emit("new_chat_created", {
          chatId: result.data._id,
          members: uniqueIds,
        });

        // Reload chat list
        this.loadChats();

        // Select the new chat
        setTimeout(() => {
          this.selectChat(result.data._id);
        }, 300);
      } else {
        alert("Error creating chat: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Network error creating chat");
    }
  },

  // Load all chats for current user
  loadChats: async function () {
    if (!this.currentUserId) {
      console.log("Cannot load chats: No current user ID");
      return;
    }

    try {
      console.log(`Fetching chats for user ID: ${this.currentUserId}`);
      const response = await fetch(
          `http://localhost:3001/api/chats?userId=${this.currentUserId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API response for user chats:", result);

      if (result.success && Array.isArray(result.data)) {
        console.log("User Chats:", result.data);
        console.log("Current User ID:", this.currentUserId);

        const userChats = result.data;
        const chatListContainer = document.querySelector(".chat-list-items");

        if (!chatListContainer) {
          console.error("Chat list container not found in the DOM");
          return;
        }

        // Clear any loading messages or previous content
        chatListContainer.innerHTML = "";

        if (userChats.length === 0) {
          chatListContainer.innerHTML =
              '<div class="no-chats-message">No chats found</div>';
          return;
        }

        // Add each chat to the list
        userChats.forEach((chat) => {
          let chatName = chat.name; // Use server-provided name if available
          let otherUserId = null;

          // For 1-on-1 chats, find the other user's ID to use for data-user-id
          if (chat.members && chat.members.length === 2) {
            const otherMemberId = chat.members.find(
                (memberId) => String(memberId) !== String(this.currentUserId)
            );
            if (otherMemberId) {
              otherUserId = String(otherMemberId);
            }
          }

          // Fallback to generated name if no specific chat name is provided
          chatName = chatName || this.generateChatName(chat);

          const chatHTML = `
            <div class="chat-item" data-chat-id="${chat._id}" ${
              otherUserId ? `data-user-id="${otherUserId}"` : ""
          }>
              <div class="chat-avatar">
                <img src="/public/src/assets/avatar-placeholder.png" alt="${this.escapeHtml(
              chatName
          )}">
              </div>
              <div class="chat-info">
                <span class="chat-name">${this.escapeHtml(chatName)}</span>
              </div>
              <div class="chat-last-message"> <!-- Moved inside chat-item -->
                <!-- Placeholder for last message - to be implemented -->
              </div>
            </div>`;
          chatListContainer.insertAdjacentHTML("beforeend", chatHTML);
        });

        // After adding chats to DOM, add event listeners to the chat items
        document.querySelectorAll(".chat-item").forEach((item) => {
          item.addEventListener("click", this.handleChatItemClick.bind(this));
        });
      } else {
        console.error("Error in API response format:", result);
        this.showErrorInChatWindow("Не вдалось завантажити список чатів");
      }
    } catch (error) {
      console.error("Error loading chats:", error);
      this.showErrorInChatWindow(
          "Помилка завантаження чатів: " + error.message
      );
    }
  },

  // Add members to an existing chat
  addMembersToChat: async function (chatId, memberIds) {
    try {
      const response = await fetch(
          `http://localhost:3001/api/chats/${chatId}/members`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ members: memberIds }),
          }
      );

      const result = await response.json();

      if (result.success) {
        // Reload chat members
        this.loadChatMembers(this.currentChatId);

        // Show success message
        this.showSuccessMessage("Учасників успішно додано до чату");
      } else {
        alert(
            "Помилка додавання учасників: " +
            (result.message || "Невідома помилка")
        );
      }
    } catch (error) {
      console.error("Error adding members to chat:", error);
      alert("Помилка мережі при додаванні учасників");
    }
  },

  // Show success message
  showSuccessMessage: function (message) {
    const chatMessages = document.querySelector(".chat-messages");
    const successHTML = `
      <div class="chat-success-message">
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;

    chatMessages.insertAdjacentHTML("beforeend", successHTML);
    this.scrollToBottom();

    // Auto-remove success message after a few seconds
    setTimeout(() => {
      const successMessage = chatMessages.querySelector(
          ".chat-success-message"
      );
      if (successMessage) {
        successMessage.remove();
      }
    }, 3000);
  },

  // Generate a chat name from members
  generateChatName: function (chat) {
    // For now just return a default name with ID
    return `Chat #${chat._id.substring(0, 6)}`;
  },

  // Helper function to escape HTML
  escapeHtml: function (unsafe) {
    if (typeof unsafe !== "string") return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  },

  // Update read receipts on messages
  updateReadReceipts: function (userId) {
    // Future implementation for showing read status
    // Will update UI to show which messages have been read
  },

  // Function to be called if student list is dynamically reloaded
  refreshAllUserStatusesOnPage: function () {
    console.log(
        "Refreshing all user statuses on page based on cached knownOnlineUsers."
    );
    this.markAllUsersAsOfflineInitially(); // Set default to offline (or current user to online)

    this.knownOnlineUsers.forEach((userId) => {
      // userId is already string from Set
      this.updateUserStatus(userId, "online");
    });

    // Final check for current user, in case they weren't in knownOnlineUsers during the iteration
    // (e.g. if knownOnlineUsers was briefly empty or stale)
    if (this.currentUserId && this.socket && this.socket.connected) {
      this.updateUserStatus(this.currentUserId, "online");
    }
  },

  // New function to display errors in the chat window
  showErrorInChatWindow: function (message) {
    const chatListContainer = document.querySelector(".chat-list-items");
    if (chatListContainer) {
      chatListContainer.innerHTML = `<div class="chat-error-message">${this.escapeHtml(
          message
      )}</div>`;
    }

    const chatMessages = document.querySelector(".chat-messages");
    if (chatMessages) {
      chatMessages.innerHTML = `<div class="chat-error-message">${this.escapeHtml(
          message
      )}</div>`;
    }
  },
};

// Initialize chat on document load - use Immediately Invoked Function Expression to prevent duplicates
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded - initializing chat system");

  // Перевіряємо наявність авторизації користувача перед ініціалізацією чату
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  if (!currentUser.id) {
    console.log("User not logged in - chat initialization skipped");
    return;
  }

  // Initialize the chat system
  console.log("User is logged in - initializing chat client");
  chatClient.init();

  // Load chats for current user with a small delay to ensure connection is established
  setTimeout(() => {
    console.log("Delayed chat loading started");
    chatClient.loadChats();

    // Check for unread messages
    chatClient.updateUnreadCount();
  }, 1000);

  // Listen for URL changes (for navigation to specific chats)
  window.addEventListener("popstate", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get("chat");

    if (chatId) {
      chatClient.selectChat(chatId);
    }
  });
});
