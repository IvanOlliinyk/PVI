// Auth related functionality
const authApi = {
  login: async function(credentials) {
    try {
      const response = await fetch('/api/auth_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          email: credentials.email,
          password: credentials.password
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Помилка мережі' };
    }
  },

  register: async function(userData) {
    try {
      const response = await fetch('/api/auth_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register',
          ...userData
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Помилка мережі' };
    }
  },

  logout: async function() {
    try {
      const response = await fetch('/api/auth_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'logout'
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Помилка мережі' };
    }
  },

  checkLoginStatus: async function() {
    try {
      const response = await fetch('/api/auth_api.php?action=status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return await response.json();
    } catch (error) {
      console.error('Status check error:', error);
      return { success: false, isLoggedIn: false };
    }
  }
};

const authUI = {
  showLoginPopup: function() {
    document.getElementById('login-popup').style.display = 'block';
    document.getElementById('auth-window').style.display = 'block';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
  },

  hideLoginPopup: function() {
    document.getElementById('login-popup').style.display = 'none';
    document.getElementById('auth-window').style.display = 'none';
  },

  showRegisterPopup: function() {
    document.getElementById('register-popup').style.display = 'block';
    document.getElementById('auth-window').style.display = 'block';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    document.getElementById('register-firstname').value = '';
    document.getElementById('register-lastname').value = '';
    document.getElementById('register-group').value = '';
    document.getElementById('register-gender').value = '';
    document.getElementById('register-birthday').value = '';
  },

  hideRegisterPopup: function() {
    document.getElementById('register-popup').style.display = 'none';
    document.getElementById('auth-window').style.display = 'none';
  },

  // Оновлений метод updateUIForLoggedInUser
  updateUIForLoggedInUser: function(user) {
    document.getElementById('auth-buttons').style.display = 'none';
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('username').textContent = `${user.firstname} ${user.lastname}`;

    // Показуємо основний контент і ховаємо повідомлення про авторизацію
    document.getElementById('main-content').style.display = 'flex';
    document.getElementById('auth-required-message').style.display = 'none';

    localStorage.setItem('currentUser', JSON.stringify(user));
  },

// Оновлений метод updateUIForLoggedOutUser
  updateUIForLoggedOutUser: function() {
    document.getElementById('auth-buttons').style.display = 'flex';
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('username').textContent = '';

    // Ховаємо основний контент і показуємо повідомлення про авторизацію
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('auth-required-message').style.display = 'block';

    localStorage.removeItem('currentUser');
  },

// Додаємо метод для ініціалізації доступу до сторінки
  initPageAccess: function() {
    // Перевіряємо статус авторизації при завантаженні сторінки
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.updateUIForLoggedInUser(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.updateUIForLoggedOutUser();
      }
    } else {
      this.updateUIForLoggedOutUser();
    }
  },

  checkStoredLoginState: function() {
    const storedUser = localStorage.getItem('currentUser');

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.updateUIForLoggedInUser(user);
        return true;
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
      }
    }

    return false;
  }
};

const authValidation = {
  validateLoginForm: function() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    // Clear previous errors
    errorElement.textContent = '';

    // Basic validation
    if (!email) {
      errorElement.textContent = 'Email є обов\'язковим полем';
      return false;
    }

    if (!this.isValidEmail(email)) {
      errorElement.textContent = 'Введіть правильний email';
      return false;
    }

    if (!password) {
      errorElement.textContent = 'Пароль є обов\'язковим полем';
      return false;
    }

    return true;
  },

  validateRegisterForm: function() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const firstName = document.getElementById('register-firstname').value.trim();
    const lastName = document.getElementById('register-lastname').value.trim();
    const group = document.getElementById('register-group').value;
    const gender = document.getElementById('register-gender').value;
    const birthday = document.getElementById('register-birthday').value;
    const errorElement = document.getElementById('register-error');

    // Clear previous errors
    errorElement.textContent = '';

    // Email validation
    if (!email) {
      errorElement.textContent = 'Email є обов\'язковим полем';
      return false;
    }

    if (!this.isValidEmail(email)) {
      errorElement.textContent = 'Введіть правильний email';
      return false;
    }

    // Password validation
    if (!password) {
      errorElement.textContent = 'Пароль є обов\'язковим полем';
      return false;
    }

    if (password.length < 6) {
      errorElement.textContent = 'Пароль має містити мінімум 6 символів';
      return false;
    }

    if (password !== confirmPassword) {
      errorElement.textContent = 'Паролі не співпадають';
      return false;
    }

    // Name validation
    if (!firstName) {
      errorElement.textContent = 'Ім\'я є обов\'язковим полем';
      return false;
    }

    if (!lastName) {
      errorElement.textContent = 'Прізвище є обов\'язковим полем';
      return false;
    }

    // Group validation
    if (!group) {
      errorElement.textContent = 'Будь ласка, виберіть групу';
      return false;
    }

    // Gender validation
    if (!gender) {
      errorElement.textContent = 'Будь ласка, виберіть стать';
      return false;
    }

    // Birthday validation
    if (!birthday) {
      errorElement.textContent = 'Дата народження є обов\'язковим полем';
      return false;
    } else {
      const selectedDate = new Date(birthday);
      const currentDate = new Date();

      if (selectedDate > currentDate) {
        errorElement.textContent = 'Дата народження не може бути в майбутньому';
        return false;
      }

      const minAgeDate = new Date();
      minAgeDate.setFullYear(currentDate.getFullYear() - 100);

      const maxAgeDate = new Date();
      maxAgeDate.setFullYear(currentDate.getFullYear() - 15);

      if (selectedDate < minAgeDate) {
        errorElement.textContent = 'Вік не може бути більше 100 років';
        return false;
      }

      if (selectedDate > maxAgeDate) {
        errorElement.textContent = 'Студент має бути старше 15 років';
        return false;
      }
    }

    return true;
  },

  isValidEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

// Event handlers
document.addEventListener('DOMContentLoaded', async function() {
  console.log("Auth.js loaded and running");

  // Перевіряємо змінну PHP_AUTH_STATUS, передану з сервера
  if (typeof PHP_AUTH_STATUS !== 'undefined') {
    if (!PHP_AUTH_STATUS) {
      // Якщо не авторизований на сервері, оновлюємо UI відповідно
      authUI.updateUIForLoggedOutUser();
    }
  }


  // First check if user is logged in from localStorage
  const isLoggedIn = authUI.checkStoredLoginState();

  if (!isLoggedIn) {
    const statusResponse = await authApi.checkLoginStatus();
    if (statusResponse.success && statusResponse.isLoggedIn) {
      authUI.updateUIForLoggedInUser(statusResponse.user);
    } else {
      authUI.updateUIForLoggedOutUser();
    }
  }

  // Login button click event
  document.getElementById('login-button').addEventListener('click', function() {
    authUI.showLoginPopup();
  });

  // Register button click event
  document.getElementById('register-button').addEventListener('click', function() {
    authUI.showRegisterPopup();
  });

  // Close login popup buttons
  document.getElementById('close-login').addEventListener('click', function() {
    authUI.hideLoginPopup();
  });

  document.getElementById('cancel-login').addEventListener('click', function() {
    authUI.hideLoginPopup();
  });

  // Close register popup buttons
  document.getElementById('close-register').addEventListener('click', function() {
    authUI.hideRegisterPopup();
  });

  document.getElementById('cancel-register').addEventListener('click', function() {
    authUI.hideRegisterPopup();
  });

  // Registration form submission
  document.getElementById('proceed-register').addEventListener('click', async function() {
    if (authValidation.validateRegisterForm()) {
      const userData = {
        email: document.getElementById('register-email').value.trim(),
        password: document.getElementById('register-password').value,
        firstname: document.getElementById('register-firstname').value.trim(),
        lastname: document.getElementById('register-lastname').value.trim(),
        student_group: document.getElementById('register-group').value,
        gender: document.getElementById('register-gender').value,
        birthday: document.getElementById('register-birthday').value
      };

      const response = await authApi.register(userData);

      if (response.success) {
        authUI.hideRegisterPopup();
        authUI.updateUIForLoggedInUser(response.user);

        // Refresh the students list to include the new student
        if (typeof loadStudents === 'function') {
          loadStudents();
        }

        // Show success notification
        alert('Реєстрація успішна!');
      } else {
        // Display error message
        document.getElementById('register-error').textContent = response.message || 'Помилка реєстрації. Спробуйте ще раз.';
      }
    }
  });

  // Logout button click event
  document.getElementById('logout-btn').addEventListener('click', async function() {
    const response = await authApi.logout();

    if (response.success) {
      authUI.updateUIForLoggedOutUser();

      // Show logout notification
      alert('Вихід успішний!');
    }
  });

  // Toggle profile popup
  document.getElementById('profile-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    const profilePopup = document.getElementById('profile-popup');
    profilePopup.style.display = profilePopup.style.display === 'block' ? 'none' : 'block';
  });

  // Close profile popup when clicking elsewhere
  document.addEventListener('click', function(event) {
    const profileBtn = document.getElementById('profile-btn');
    const profilePopup = document.getElementById('profile-popup');

    if (profilePopup && profilePopup.style.display === 'block' &&
      !profileBtn.contains(event.target) &&
      !profilePopup.contains(event.target)) {
      profilePopup.style.display = 'none';
    }
  });

  // Extra: Close popups when clicking on the auth-window backdrop
  document.getElementById('auth-window').addEventListener('click', function(e) {
    if (e.target === this) {
      authUI.hideLoginPopup();
      authUI.hideRegisterPopup();
    }
  });
  // Ініціалізуємо доступ до сторінки
  authUI.initPageAccess();

// Додаємо обробники подій для кнопок на сторінці обмеженого доступу
  const authLoginButton = document.getElementById('auth-login-button');
  const authRegisterButton = document.getElementById('auth-register-button');

  if (authLoginButton) {
    authLoginButton.addEventListener('click', function() {
      authUI.showLoginPopup();
    });
  }

  if (authRegisterButton) {
    authRegisterButton.addEventListener('click', function() {
      authUI.showRegisterPopup();
    });
  }

  document.getElementById('proceed-login').addEventListener('click', async function() {
    if (authValidation.validateLoginForm()) {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      const response = await authApi.login({
        email: email,
        password: password
      });

      if (response.success) {
        authUI.hideLoginPopup();
        authUI.updateUIForLoggedInUser(response.user);

        // Показуємо повідомлення про успіх
        alert('Вхід успішний!');

        // Оновлюємо таблицю щоб відобразити правильні статуси активності
        if (typeof loadStudents === 'function') {
          loadStudents();
        }
      } else {
        // Показуємо повідомлення про помилку
        document.getElementById('login-error').textContent = response.message || 'Помилка входу. Перевірте ваші дані.';
      }
    }
  });

// Після виходу з системи
  document.getElementById('logout-btn').addEventListener('click', async function() {
    const response = await authApi.logout();

    if (response.success) {
      authUI.updateUIForLoggedOutUser();

      // Показуємо повідомлення про успіх
      alert('Вихід успішний!');

      // При можливості, оновлюємо таблицю
      if (typeof loadStudents === 'function' && document.getElementById('main-content').style.display !== 'none') {
        loadStudents();
      }
    }
  });
});

