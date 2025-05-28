// Основні функції для роботи з API студентів
const studentsApi = {
  // Отримання всіх студентів
  getAllStudents: async function() {
    try {
      const response = await fetch('/api/student_api.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        console.error('Error fetching students:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  },

  // Отримання студента за ID
  getStudentById: async function(id) {
    try {
      const response = await fetch(`/api/student_api.php?id=${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        console.error('Error fetching student:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  },

  // Додавання нового студента
  addStudent: async function(studentData) {
    try {
      console.log("Початок запиту на додавання студента з даними:", studentData);

      const response = await fetch('/api/student_api.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      const responseText = await response.text();
      console.log("Сирий текст відповіді:", responseText);

      // Перевіряємо, чи відповідь є валідним JSON
      try {
        const result = JSON.parse(responseText);
        console.log("Результат додавання студента:", result);
        return result;
      } catch (jsonError) {
        console.error("Помилка парсингу JSON відповіді:", jsonError);
        return {
          success: false,
          message: 'Отримано некоректну відповідь від сервера',
          rawResponse: responseText
        };
      }
    } catch (error) {
      console.error('Помилка мережі при додаванні студента:', error);
      return { success: false, message: 'Сталася помилка мережі: ' + error.message };
    }
  },

  // Оновлення студента
  updateStudent: async function(studentData) {
    try {
      const response = await fetch('/api/student_api.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      return await response.json();
    } catch (error) {
      console.error('Error updating student:', error);
      return { success: false, message: 'Network error occurred' };
    }
  },

  // Видалення студента
  deleteStudent: async function(id) {
    try {
      const response = await fetch('/api/student_api.php', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      return await response.json();
    } catch (error) {
      console.error('Error deleting student:', error);
      return { success: false, message: 'Network error occurred' };
    }
  },

  // Видалення кількох студентів
  deleteMultipleStudents: async function(ids) {
    const results = [];
    for (const id of ids) {
      const result = await this.deleteStudent(id);
      results.push(result);
    }
    return results;
  }
};

// Змінні для пагінації
let currentPage = 1;
const studentsPerPage = 5;
let totalStudents = [];
let totalPages = 1;
// Кеш для зберігання онлайн-статусів користувачів
let onlineUserCache = new Set();

// Функція для очищення повідомлень про помилки
function clearValidationErrors() {
  const errorMessages = document.querySelectorAll(".error-message");
  errorMessages.forEach(el => el.remove());

  // Видаляємо клас invalid-input з усіх полів
  const formFields = document.querySelectorAll(".add-popup-content input, .add-popup-content select");
  formFields.forEach(field => field.classList.remove("invalid-input"));
}

// Функція для відображення помилок валідації
function displayValidationErrors(errors) {
  // Очищаємо попередні повідомлення про помилки
  clearValidationErrors();

  // Відображаємо помилки для кожного поля
  for (const field in errors) {
    if (field === 'duplicate') {
      // Це особливий випадок - відображаємо помилку вгорі форми
      const formContent = document.querySelector(".add-popup-content");
      const errorElement = document.createElement("div");
      errorElement.className = "error-message global-error";
      errorElement.textContent = errors[field];
      formContent.prepend(errorElement);
    } else {
      // Для інших полів відображаємо помилку біля поля
      const inputElement = document.getElementById(field);
      if (inputElement) {
        inputElement.classList.add("invalid-input");

        const errorElement = document.createElement("div");
        errorElement.className = "error-message";
        errorElement.textContent = errors[field];

        inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
      }
    }
  }
}

// Функція для форматування дати з БД у формат для відображення (YYYY-MM-DD -> DD-MM-YYYY)
function formatDateToDisplay(dateString) {
  if (!dateString) return '';

  // Перевірка формату дати
  try {
    if (dateString.includes('-')) {
      // Якщо формат YYYY-MM-DD
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
      }
      // Інакше повертаємо як є
      return dateString;
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }

  return dateString;
}

// Функція для форматування дати з формату відображення у формат для форми (YYYY-MM-DD)
function formatDateForForm(dateString) {
  if (!dateString) return '';

  // Перевірка формату дати
  if (dateString.includes('-')) {
    // Якщо формат DD-MM-YYYY
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateString.split('-');
      return `${year}-${month}-${day}`;
    }
    // Якщо формат YYYY-MM-DD, залишаємо як є
    else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
  }

  return dateString;
}

// Функція для відкриття форми додавання студента
function openAddStudentForm() {
  const popup = document.getElementById("add-popup");
  const proceedButton = document.querySelector("#add-popup button.proceed");
  const popupTitle = document.querySelector("#add-popup #popup-title");

  // Очищаємо попередні дані форми
  document.getElementById("group").value = "";
  document.getElementById("firstname").value = "";
  document.getElementById("lastname").value = "";
  document.getElementById("gender").value = "";
  document.getElementById("birthday").value = "";
  document.getElementById("student-id").value = "";

  // Очищаємо повідомлення про помилки
  clearValidationErrors();

  // Налаштовуємо для додавання нового студента
  proceedButton.textContent = "Add";
  popupTitle.textContent = "Add Student";

  // Показуємо попап
  popup.style.visibility = "visible";
  document.querySelector('#window').style.display = "block";
}

// Функція для закриття форми
function closeAddStudentForm() {
  document.getElementById("add-popup").style.visibility = "hidden";
  document.querySelector('#window').style.display = "none";
}

// Функція для редагування студента
async function editStudent(id) {
  try {
    // Перевіряємо, чи вибрано якісь чекбокси
    const selectedCheckboxes = document.querySelectorAll('.student-select:checked');

    // Якщо вибрано один чекбокс, редагуємо цього студента
    if (selectedCheckboxes.length === 1) {
      id = selectedCheckboxes[0].getAttribute('data-id');
    }

    // Якщо вибрано більше одного чекбоксу або id не передано, виходимо
    if (selectedCheckboxes.length > 1 || !id) {
      return;
    }

    // Отримуємо дані студента
    const student = await studentsApi.getStudentById(id);

    if (!student) {
      console.error("Student not found with ID:", id);
      return;
    }

    // Заповнюємо форму даними
    document.getElementById("student-id").value = student.id;
    document.getElementById("firstname").value = student.firstname;
    document.getElementById("lastname").value = student.lastname;
    document.getElementById("gender").value = student.gender;
    document.getElementById("group").value = student.student_group;

    // Форматуємо дату для відображення у формі
    const birthdayForForm = formatDateForForm(student.birthday);
    document.getElementById("birthday").value = birthdayForForm;

    // Змінюємо текст кнопки і заголовок
    document.querySelector("#add-popup button.proceed").textContent = "Save";
    document.querySelector("#add-popup #popup-title").textContent = "Edit Student";

    // Очищаємо повідомлення про помилки
    clearValidationErrors();

    // Показуємо попап
    document.getElementById("add-popup").style.visibility = "visible";
    document.querySelector('#window').style.display = "block";
  } catch (error) {
    console.error("Error loading student data for editing:", error);
  }
}

// Функція для видалення студента - показ попапу підтвердження
function deleteStudentPrompt(id, fullname) {
  const popup = document.getElementById('deletePopup');
  const message = document.getElementById('deleteMessage');

  // Перевіряємо, чи вибрано чекбокси
  const selectedCheckboxes = document.querySelectorAll('.student-select:checked');

  if (selectedCheckboxes.length === 0 && id) {
    // Видалення через кнопку видалення - отримуємо ім'я студента
    message.textContent = `Are you sure you want to delete "${fullname}"?`;
    // Зберігаємо посилання на ID студента
    popup.setAttribute("data-delete-id", id);
  } else if (selectedCheckboxes.length > 0) {
    // Видалення декількох вибраних студентів
    const studentIds = Array.from(selectedCheckboxes).map(checkbox =>
        checkbox.getAttribute('data-id')
    );

    // Отримуємо імена вибраних студентів для повідомлення
    const selectedNames = [];
    studentIds.forEach(id => {
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        const nameCell = row.cells[2]; // Третя колонка з іменем
        if (nameCell) {
          selectedNames.push(nameCell.textContent.trim());
        }
      }
    });

    const namesText = selectedNames.join(', ');
    message.textContent = `Are you sure you want to delete "${namesText}"?`;

    // Зберігаємо посилання на ID студентів
    popup.setAttribute("data-delete-ids", JSON.stringify(studentIds));
  } else {
    message.textContent = 'No students selected for deletion.';
  }

  popup.style.display = 'block';
  document.querySelector('#window').style.display = "block";
}

// Функція підтвердження видалення
async function confirmDelete() {
  const popup = document.getElementById('deletePopup');

  // Перевіряємо, чи видаляємо декількох студентів
  const deleteIds = popup.getAttribute("data-delete-ids");
  if (deleteIds) {
    const ids = JSON.parse(deleteIds);

    try {
      // Видаляємо студентів
      const results = await studentsApi.deleteMultipleStudents(ids);

      // Перевіряємо, чи всі студенти успішно видалені
      const allSuccessful = results.every(r => r.success);

      if (allSuccessful) {
        // Виводимо дату і час у спеціальному форматі
        console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${getCurrentDateTime()}`);
        console.log(`Current User's Login: ${getCurrentUser()}`);
      } else {
        console.error("Error deleting some students");
      }

      // Оновлюємо таблицю
      loadStudents();
    } catch (error) {
      console.error("Error deleting students:", error);
    }
  } else {
    // Видаляємо одного студента
    const deleteId = popup.getAttribute("data-delete-id");
    if (deleteId) {
      try {
        const result = await studentsApi.deleteStudent(deleteId);

        if (result.success) {
          // Виводимо дату і час у спеціальному форматі
          console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${getCurrentDateTime()}`);
          console.log(`Current User's Login: ${getCurrentUser()}`);

          loadStudents();
        } else {
          console.error("Error deleting student:", result.message);
        }
      } catch (error) {
        console.error("Error in confirmDelete:", error);
      }
    }
  }

  // Очищаємо атрибути
  popup.removeAttribute("data-delete-id");
  popup.removeAttribute("data-delete-ids");

  // Закриваємо попап
  closeDeletePopup();
}

// Функція для закриття попапу видалення
function closeDeletePopup() {
  const popup = document.getElementById('deletePopup');
  popup.style.display = 'none';
  document.querySelector('#window').style.display = "none";
}

// Клієнтська валідація форми
function validateForm() {
  const firstName = document.getElementById("firstname").value.trim();
  const lastName = document.getElementById("lastname").value.trim();
  const group = document.getElementById("group").value;
  const gender = document.getElementById("gender").value;
  const birthday = document.getElementById("birthday").value;

  // Очищаємо попередні повідомлення про помилки
  clearValidationErrors();

  let isValid = true;

  // Базова клієнтська валідація
  if (!firstName) {
    showError(document.getElementById("firstname"), "First name is required");
    isValid = false;
  } else if (!/^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ' -]+$/.test(firstName)) {
    showError(document.getElementById("firstname"), "First name can only contain letters, spaces, hyphens and apostrophes");
    isValid = false;
  }

  if (!lastName) {
    showError(document.getElementById("lastname"), "Last name is required");
    isValid = false;
  } else if (!/^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ' -]+$/.test(lastName)) {
    showError(document.getElementById("lastname"), "Last name can only contain letters, spaces, hyphens and apostrophes");
    isValid = false;
  }

  if (!group) {
    showError(document.getElementById("group"), "Please select group");
    isValid = false;
  }

  if (!gender) {
    showError(document.getElementById("gender"), "Please select gender");
    isValid = false;
  }

  if (!birthday) {
    showError(document.getElementById("birthday"), "Birthday is required");
    isValid = false;
  } else {
    const selectedDate = new Date(birthday);
    const currentDate = new Date();

    if (selectedDate > currentDate) {
      showError(document.getElementById("birthday"), "Birthday cannot be in the future");
      isValid = false;
    }

    const minAgeDate = new Date();
    minAgeDate.setFullYear(currentDate.getFullYear() - 100);

    const maxAgeDate = new Date();
    maxAgeDate.setFullYear(currentDate.getFullYear() - 15);

    if (selectedDate < minAgeDate) {
      showError(document.getElementById("birthday"), "Age cannot be more than 100 years");
      isValid = false;
    }

    if (selectedDate > maxAgeDate) {
      showError(document.getElementById("birthday"), "Student must be at least 15 years old");
      isValid = false;
    }
  }

  return isValid;
}

// Функція для відображення помилки біля поля
function showError(element, message) {
  element.classList.add("invalid-input");

  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.textContent = message;

  element.parentNode.insertBefore(errorElement, element.nextSibling);
}

// Функція для збереження/додавання студента
async function saveStudent() {
  // Спочатку валідуємо форму на клієнті
  if (!validateForm()) {
    return;
  }

  const studentId = document.getElementById("student-id").value;
  const firstName = document.getElementById("firstname").value.trim();
  const lastName = document.getElementById("lastname").value.trim();
  const group = document.getElementById("group").value.trim();
  const gender = document.getElementById("gender").value.trim();
  const birthdayValue = document.getElementById("birthday").value.trim();

  // Отримуємо ID поточного користувача
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const currentUserId = currentUser.id;

  // Підготовка даних студента
  const studentData = {
    firstname: firstName,
    lastname: lastName,
    gender: gender,
    birthday: birthdayValue,
    student_group: group,
    user_id: currentUserId  // Додаємо user_id поточного користувача
  };

  try {
    let result;

    if (studentId) {
      // Оновлюємо існуючого студента
      studentData.id = studentId;
      result = await studentsApi.updateStudent(studentData);
    } else {
      // Додаємо нового студента
      result = await studentsApi.addStudent(studentData);
    }

    if (result.success) {
      // Записуємо в логи в консоль дані про час та користувача
      console.log(`Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): ${getCurrentDateTime()}`);
      console.log(`Current User's Login: ${getCurrentUser()}`);

      // Оновлюємо таблицю і закриваємо форму
      loadStudents();
      closeAddStudentForm();
    } else {
      // Відображаємо помилки валідації від сервера
      if (result.errors) {
        displayValidationErrors(result.errors);
      } else {
        console.error("Error saving student:", result.message);
        // Показуємо загальну помилку
        alert("Error saving student: " + (result.message || "Unknown error"));
      }
    }
  } catch (error) {
    console.error("Error in saveStudent function:", error);
    alert("Network error while saving student");
  }
}

// Функція для завантаження студентів з сервера
async function loadStudents() {
  const students = await studentsApi.getAllStudents();
  totalStudents = students;
  totalPages = Math.ceil(students.length / studentsPerPage);

  // Перевіряємо, чи не вийшла поточна сторінка за межі після видалення
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  } else if (totalPages === 0) {
    currentPage = 1;
  }

  renderStudentsTable();
  updatePaginationButtons();
}

// Функція для відображення студентів у таблиці
function renderStudentsTable() {
  const tbody = document.querySelector(".students-table");
  tbody.innerHTML = "";

  if (!totalStudents || totalStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No students found</td></tr>';
    return;
  }

  // Запит на оновлення статусів користувачів
  // Виконуємо запит статусів перед рендерингом
  refreshUserStatuses();

  // Обчислюємо студентів для поточної сторінки
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = Math.min(startIndex + studentsPerPage, totalStudents.length);
  const currentPageStudents = totalStudents.slice(startIndex, endIndex);

  currentPageStudents.forEach(student => {
    const formattedBirthday = formatDateToDisplay(student.birthday);

    // Визначення статусу на основі user_id та кешу онлайн-користувачів
    let statusClass = 'inactive';

    if (student.user_id) {
      // Перевіряємо, чи користувач онлайн по його ID
      const isOnline = onlineUserCache.has(String(student.user_id));
      statusClass = isOnline ? 'active' : 'inactive';
    }

    tbody.insertAdjacentHTML("beforeend", `
      <tr data-id="${student.id}" ${student.user_id ? `data-user-id="${student.user_id}"` : ''}>
        <td>
          <label class="checkbox-container">
            <input type="checkbox" class="student-select custom-check" data-id="${student.id}"/>
            <span class="custom-check"></span>
            <span class="visually-hidden">Select student</span>
          </label>
        </td>
        <td>${student.student_group || ""}</td>
        <td>${student.fullname || `${student.firstname} ${student.lastname}`}</td>
        <td>${student.gender || ""}</td>
        <td>${formattedBirthday}</td>
        <td><div class="${statusClass}"></div></td>
        <td>
          <button class="edit" aria-label="Edit" onclick="editStudent(${student.id})"></button>
          <button class="delete" aria-label="Delete" onclick="deleteStudentPrompt(${student.id}, '${(student.fullname || `${student.firstname} ${student.lastname}`).replace(/'/g, "\\'")}')"></button>
        </td>
      </tr>
    `);
  });

  // Оновлюємо обробники чекбоксів
  updateCheckboxes();
}

// Функція для оновлення кнопок пагінації
function updatePaginationButtons() {
  const paginationContainer = document.querySelector(".table-pages");
  paginationContainer.innerHTML = "";

  // Кнопка "Назад"
  const prevButton = document.createElement("button");
  prevButton.classList.add("prev");
  prevButton.innerHTML = '<span class="visually-hidden">Previous</span>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => goToPage(currentPage - 1));
  paginationContainer.appendChild(prevButton);

  // Кнопки з номерами сторінок
  // Визначаємо діапазон кнопок для відображення
  const maxVisibleButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

  if (endPage - startPage < maxVisibleButtons - 1) {
    startPage = Math.max(1, endPage - maxVisibleButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => goToPage(i));
    paginationContainer.appendChild(pageButton);
  }

  // Кнопка "Вперед"
  const nextButton = document.createElement("button");
  nextButton.classList.add("next");
  nextButton.innerHTML = '<span class="visually-hidden">Next</span>';
  nextButton.disabled = currentPage === totalPages || totalPages === 0;
  nextButton.addEventListener("click", () => goToPage(currentPage + 1));
  paginationContainer.appendChild(nextButton);
}

// Функція для переходу на певну сторінку
function goToPage(page) {
  if (page < 1 || page > totalPages) {
    return;
  }

  currentPage = page;
  renderStudentsTable();
  updatePaginationButtons();
}

// Функція для оновлення обробників подій чекбоксів
function updateCheckboxes() {
  const selectAllCheckbox = document.getElementById('selectAll');
  const studentCheckboxes = document.querySelectorAll('.student-select');

  // Перевіряємо наявність головного чекбокса
  if (!selectAllCheckbox) return;

  // Очищаємо попередні обробники перед додаванням нових
  selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
  studentCheckboxes.forEach((checkbox) => {
    checkbox.replaceWith(checkbox.cloneNode(true));
  });

  // Заново отримуємо оновлений головний чекбокс і чекбокси студентів
  const updatedSelectAllCheckbox = document.getElementById('selectAll');
  const updatedStudentCheckboxes = document.querySelectorAll('.student-select');

  // Додаємо обробник для головного чекбокса
  updatedSelectAllCheckbox.addEventListener('change', function () {
    const isChecked = this.checked;
    updatedStudentCheckboxes.forEach((checkbox) => {
      checkbox.checked = isChecked;
    });
  });

  // Додаємо обробники для кожного студентського чекбокса
  updatedStudentCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function () {
      const allChecked = Array.from(updatedStudentCheckboxes).every((cb) => cb.checked);
      const anyUnchecked = Array.from(updatedStudentCheckboxes).some((cb) => !cb.checked);

      // Оновлюємо стан головного чекбокса
      updatedSelectAllCheckbox.checked = allChecked;
      updatedSelectAllCheckbox.indeterminate = !allChecked && !anyUnchecked;
    });
  });
}

// Функція для ввімкнення/вимкнення кнопок редагування
function toggleEditButtons() {
  const studentCheckboxes = document.querySelectorAll('.student-select:checked');
  const editButtons = document.querySelectorAll('.edit');

  // Якщо вибрано більше одного чекбоксу, вимикаємо кнопки редагування
  if (studentCheckboxes.length > 1) {
    editButtons.forEach(button => {
      button.disabled = true;
      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";
    });
  } else {
    // Інакше робимо всі кнопки активними
    editButtons.forEach(button => {
      button.disabled = false;
      button.style.opacity = "";
      button.style.cursor = "";
    });
  }
}

// Функція для отримання даних про онлайн-статуси користувачів
async function refreshUserStatuses() {
  try {
    // Перевіряємо наявність Socket.io-клієнта
    if (window.chatClient && window.chatClient.socket && window.chatClient.socket.connected) {
      // Викликаємо існуючу функцію з чат-системи
      window.chatClient.socket.emit('request_user_statuses');
      console.log('Requested user statuses from chat server');
    } else if (window.io) {
      // Якщо Socket.io підключений, але chatClient не ініціалізований
      console.log('Chat client not initialized but Socket.io available, trying to fetch statuses');
      await initMinimalChatConnection();
    } else {
      console.log('Socket.IO not available, cannot fetch real-time statuses');
    }
  } catch (error) {
    console.error('Error refreshing user statuses:', error);
  }
}

// Функція для ініціалізації мінімального підключення до чат-сервера для отримання статусів
async function initMinimalChatConnection() {
  try {
    console.log("Initializing minimal chat connection for status updates");

    // Перевіряємо наявність socket-manager
    if (window.socketManager) {
      console.log("Using shared socket manager for status updates");

      // Отримуємо спільне підключення
      const sharedSocket = window.socketManager.getSocket();

      if (sharedSocket) {
        // Додаємо обробник статусів користувачів, якщо ще не додано
        sharedSocket.on("online_users", (onlineUserIds) => {
          console.log('Received online users list in students page:', onlineUserIds);
          // Оновлюємо кеш онлайн-користувачів
          onlineUserCache = new Set(onlineUserIds.map(id => String(id)));
          // Оновлюємо таблицю студентів з новими статусами
          updateStudentTableStatuses();
        });

        // Запитуємо поточні статуси
        sharedSocket.emit('request_user_statuses');

        // Повертаємо успіх
        return true;
      }
    }

    // Якщо немає socket-manager, використовуємо старий код створення нового підключення
    if (window.statusSocket && window.statusSocket.connected) {
      console.log("Using existing status socket connection");
      window.statusSocket.emit('request_user_statuses');
      return true;
    }

    // Створюємо тимчасове з'єднання для отримання статусів
    window.statusSocket = io("http://localhost:3001", {
      reconnectionAttempts: 3,
      timeout: 5000,
      transports: ["websocket", "polling"],
      forceNew: false // Важливо! Дозволяємо використовувати існуюче з'єднання
    });

    // Додаємо обробники подій
    window.statusSocket.on('connect', () => {
      console.log('Status socket connected successfully with ID:', window.statusSocket.id);
      window.statusSocket.emit('request_user_statuses');
    });

    // Обробляємо помилки підключення
    window.statusSocket.on('connect_error', (error) => {
      console.error('Status socket connection error:', error);
    });

    // Обробляємо статуси користувачів
    window.statusSocket.on('online_users', (onlineUserIds) => {
      console.log('Received online users list:', onlineUserIds);
      // Оновлюємо кеш онлайн-користувачів
      onlineUserCache = new Set(onlineUserIds.map(id => String(id)));
      // Оновлюємо таблицю студентів з новими статусами
      updateStudentTableStatuses();
    });

    // Обробляємо роз'єднання
    window.statusSocket.on('disconnect', () => {
      console.log('Status socket disconnected');
    });

    // Встановлюємо ідентифікатор користувача після підключення
    window.statusSocket.on('connect', () => {
      try {
        // Отримуємо ID поточного користувача
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && currentUser.id) {
          // Реєструємо користувача як онлайн
          window.statusSocket.emit('user_connected', currentUser.id);
          console.log('Registered current user as online:', currentUser.id);
        }
      } catch (error) {
        console.error('Error identifying current user:', error);
      }
    });

    return true;
  } catch (error) {
    console.error('Error initializing minimal chat connection:', error);
    return false;
  }
}

// Функція для оновлення статусів у таблиці студентів
function updateStudentTableStatuses() {
  const rows = document.querySelectorAll('.students-table tr[data-id]');

  rows.forEach(row => {
    const studentId = row.getAttribute('data-id');
    const student = totalStudents.find(s => s.id == studentId);

    if (student && student.user_id) {
      const isOnline = onlineUserCache.has(String(student.user_id));
      // Використовуємо правильний селектор - елемент div у 6-й колонці
      const statusCell = row.querySelector('td:nth-child(6) div');

      if (statusCell) {
        // Просто встановлюємо відповідний клас
        statusCell.className = isOnline ? 'active' : 'inactive';
        console.log(`Оновлюємо статус для студента ${student.firstname} ${student.lastname} (${student.user_id}): ${isOnline ? 'online' : 'offline'}`);
      } else {
        console.warn(`Не знайдено елемент для відображення статусу для студента з ID ${studentId}`);
      }
    }
  });
}

// Функція для отримання поточних онлайн-статусів через API
async function fetchOnlineStatusesFromServer() {
  try {
    const response = await fetch('http://localhost:3001/api/users/online');
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.onlineUsers)) {
        // Оновлюємо кеш онлайн-користувачів
        onlineUserCache = new Set(data.onlineUsers.map(id => String(id)));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error fetching online statuses:', error);
    return false;
  }
}

// Завантажуємо студентів при завантаженні сторінки
document.addEventListener("DOMContentLoaded", function() {
  // Завантажуємо студентів
  loadStudents();

  // Налаштовуємо обробники подій для форми
  setupFormHandlers();

  // Ініціалізуємо підключення для отримання статусів
  console.log("Initializing status connection on page load");
  setTimeout(() => {
    // Додаткова спроба підключення до серверу через 2 секунди після завантаження
    refreshUserStatuses();

    // Періодично оновлюємо статуси
    setInterval(() => {
      console.log("Periodic status refresh");
      refreshUserStatuses();
    }, 30000); // Кожні 30 секунд
  }, 2000);
});

// Функція для налаштування обробників подій форми
function setupFormHandlers() {
  // Кнопка додавання студента
  const addButton = document.querySelector("button.add");
  if (addButton) {
    addButton.addEventListener("click", openAddStudentForm);
  }

  // Кнопка збереження студента (Add/Save)
  const saveButton = document.getElementById("save-student-btn");
  if (saveButton) {
    saveButton.addEventListener("click", function(e) {
      e.preventDefault();
      saveStudent();
    });
  }

  // Кнопки закриття форми
  const closeButton = document.getElementById("close");
  if (closeButton) {
    closeButton.addEventListener("click", closeAddStudentForm);
  }

  const cancelButton = document.querySelector(".add-popup-buttons .cancel");
  if (cancelButton) {
    cancelButton.addEventListener("click", closeAddStudentForm);
  }

  // Налаштування обробників для кнопок видалення
  const yesDeleteBtn = document.querySelector("#deletePopup button:nth-child(1)");
  if (yesDeleteBtn) {
    yesDeleteBtn.addEventListener("click", confirmDelete);
  }

  const noDeleteBtn = document.querySelector("#deletePopup button:nth-child(2)");
  if (noDeleteBtn) {
    noDeleteBtn.addEventListener("click", closeDeletePopup);
  }

  // Додаємо обробники подій для валідації полів форми в реальному часі
  document.getElementById("firstname").addEventListener("input", function() {
    const errorElement = this.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error-message")) {
      errorElement.remove();
    }
    this.classList.remove("invalid-input");
  });

  document.getElementById("lastname").addEventListener("input", function() {
    const errorElement = this.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error-message")) {
      errorElement.remove();
    }
    this.classList.remove("invalid-input");
  });

  document.getElementById("group").addEventListener("change", function() {
    const errorElement = this.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error-message")) {
      errorElement.remove();
    }
    this.classList.remove("invalid-input");
  });

  document.getElementById("gender").addEventListener("change", function() {
    const errorElement = this.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error-message")) {
      errorElement.remove();
    }
    this.classList.remove("invalid-input");
  });

  document.getElementById("birthday").addEventListener("change", function() {
    const errorElement = this.nextElementSibling;
    if (errorElement && errorElement.classList.contains("error-message")) {
      errorElement.remove();
    }
    this.classList.remove("invalid-input");
  });
}

// Додаємо функції для роботи з повідомленнями і бічним меню
function updateNotification() {
  const notification = document.querySelector("#notification-btn.notification");
  if (notification) {
    notification.style.backgroundImage = "url(/public/src/assets/bell.png)";
  }
}

// Додаємо обробник для кнопки бургер-меню
document.addEventListener('DOMContentLoaded', function() {
  const burgerBtn = document.getElementById('brgrbtn');
  if (burgerBtn) {
    burgerBtn.addEventListener('click', () => {
      const burger = document.querySelector(".burger");
      if (burger.style.display === 'flex') {
        burger.style.display = 'none';
      } else {
        burger.style.display = 'flex';
      }
    });
  }
});

// Функція для отримання поточної дати і часу у форматі UTC (YYYY-MM-DD HH:MM:SS)
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Функція для отримання поточного користувача
function getCurrentUser() {
  // В реальному додатку це може бути взято з сесії або API
  return "IvanOlliinyk";
}

document.addEventListener("DOMContentLoaded", function () {
  const selectAllCheckbox = document.getElementById("selectAll");
  const studentCheckboxes = document.querySelectorAll(".student-select");

  // Обробник для головного чекбокса
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const isChecked = this.checked;
      studentCheckboxes.forEach((checkbox) => {
        checkbox.checked = isChecked;
      });
    });
  }

  // Оновлення стану головного чекбокса, якщо змінюється стан окремих чекбоксів
  studentCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const allChecked = Array.from(studentCheckboxes).every((cb) => cb.checked);
      const anyUnchecked = Array.from(studentCheckboxes).some((cb) => !cb.checked);

      // Автоматично оновлюємо стан головного чекбокса
      selectAllCheckbox.checked = allChecked;
      selectAllCheckbox.indeterminate = !allChecked && !anyUnchecked;
    });
  });
});

// Make sure notification button navigation works properly
document.addEventListener('DOMContentLoaded', function() {
  const notificationBtn = document.getElementById('notification-btn');

  if (notificationBtn) {
    // Remove any existing click event listeners
    const newNotificationBtn = notificationBtn.cloneNode(true);
    notificationBtn.parentNode.replaceChild(newNotificationBtn, notificationBtn);

    // Add a click event directly to navigate to messages page
    newNotificationBtn.addEventListener('click', function(e) {
      // This will force navigation even if there are other event listeners
      window.location.href = '/views/messages/index.php';
      e.preventDefault(); // Prevent other handlers from running
    });

    // Make sure it looks clickable
    newNotificationBtn.style.cursor = 'pointer';
  }
});

