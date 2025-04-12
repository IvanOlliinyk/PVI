// Отримуємо потрібні елементи
const notificationLink = document.getElementById("notification-btn");
const notificationsPopup = document.getElementById("notifications-popup");
const addStudentPopup = document.getElementById("add-popup");

// Створюємо масив для збереження студентів
let students = [
  {
    id: 1,
    group: "PZ-25",
    name: "Oliinyk Ivan",
    gender: "Male",
    birthday: "02-02-2006",
    status: "active"
  },
  {
    id: 2,
    group: "PZ-25",
    name: "Yurii Stelmakh",
    gender: "Male",
    birthday: "06-05-2006",
    status: "inactive"
  },
  {
    id: 3,
    group: "PZ-35",
    name: "Max Sakh",
    gender: "Male",
    birthday: "12-06-2005",
    status: "inactive"
  }
];

// Функція для відображення студентів з масиву в таблиці
function renderStudents() {
  const tbody = document.querySelector(".students-table");
  tbody.innerHTML = "";

  students.forEach(student => {
    tbody.insertAdjacentHTML("beforeend", `
      <tr data-id="${student.id}">
        <td>
          <label class="checkbox-container">
            <input type="checkbox" class="student-checkbox"/>
            <span class="custom-check"></span>
            <span class="visually-hidden">Label for the input</span>
          </label>
        </td>
        <td>${student.group}</td>
        <td>${student.name}</td>
        <td>${student.gender}</td>
        <td>${student.birthday}</td>
        <td><div class="${student.status}"></div></td>
        <td class="options">
          <button class="edit" aria-label="Edit" onclick="addstudent(event)"></button>
          <button class="delete" aria-label="Delete" onclick="showDeletePopup(event)"></button>
        </td>
      </tr>
    `);
  });

  // Оновлюємо обробники подій для чекбоксів
  updateCheckboxes();
}

// Показати попап, якщо курсор наведений на кнопку (<a>)
notificationLink.addEventListener("mouseenter", (e) => {
  e.preventDefault(); // Якщо потрібно, запобігаємо переходу за посиланням
  notificationsPopup.style.display = "block"; // Показуємо попап
});

// Ховати попап, якщо курсор залишив кнопку або попап
notificationLink.addEventListener("mouseleave", () => {
  setTimeout(() => {
    if (!notificationsPopup.matches(":hover")) {
      notificationsPopup.style.display = "none";
    }
  }, 200); // Додаємо невелику затримку, щоб уникнути швидкого зникання
});

notificationsPopup.addEventListener("mouseenter", () => {
  notificationsPopup.style.display = "block"; // Залишити попап відкритим, якщо курсор над ним
});

notificationsPopup.addEventListener("mouseleave", () => {
  notificationsPopup.style.display = "none"; // Закрити попап після виходу курсору
});

document.addEventListener("DOMContentLoaded", function() {
  const profileLink = document.getElementById("profile-btn");
  const profilePopup = document.getElementById("profile-popup");

  // Показати попап, якщо курсор наведений на кнопку
  profileLink.addEventListener("mouseenter", (e) => {
    e.preventDefault(); // Якщо потрібно, запобігаємо переходу за посиланням
    profilePopup.style.display = "block"; // Показуємо попап
  });

  // Ховати попап, якщо курсор залишив кнопку або попап
  profileLink.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!profilePopup.matches(":hover")) {
        profilePopup.style.display = "none";
      }
    }, 200); // Додаємо невелику затримку, щоб уникнути швидкого зникання
  });

  profilePopup.addEventListener("mouseenter", () => {
    profilePopup.style.display = "block"; // Залишити попап відкритим, якщо курсор над ним
  });

  profilePopup.addEventListener("mouseleave", () => {
    profilePopup.style.display = "none"; // Закрити попап після виходу курсору
  });

  // Відображаємо студентів при завантаженні сторінки
  renderStudents();

  // Додаємо обробники подій для валідації полів форми
  setupFormValidation();
});

// Функція для налаштування валідації полів форми
function setupFormValidation() {
  const firstNameInput = document.getElementById("firstname");
  const lastNameInput = document.getElementById("lastname");
  const groupSelect = document.getElementById("group");
  const genderSelect = document.getElementById("gender");
  const birthdayInput = document.getElementById("birthday");

  // Додаємо обробники подій для валідації при зміні поля
  firstNameInput.addEventListener("input", () => validateNameField(firstNameInput, "First name"));
  lastNameInput.addEventListener("input", () => validateNameField(lastNameInput, "Last name"));
  groupSelect.addEventListener("change", () => validateSelectField(groupSelect, "Group"));
  genderSelect.addEventListener("change", () => validateSelectField(genderSelect, "Gender"));
  birthdayInput.addEventListener("change", validateBirthdayField);

  // Додаємо HTML атрибути для базової валідації браузера
  firstNameInput.setAttribute("pattern", "[A-Za-zА-Яа-яЁёЇїІіЄєҐґ' -]+");
  lastNameInput.setAttribute("pattern", "[A-Za-zА-Яа-яЁёЇїІіЄєҐґ' -]+");
  firstNameInput.setAttribute("required", "true");
  lastNameInput.setAttribute("required", "true");
  groupSelect.setAttribute("required", "true");
  genderSelect.setAttribute("required", "true");
  birthdayInput.setAttribute("required", "true");
}

// Валідація поля імені (для імені та прізвища)
function validateNameField(inputElement, fieldName) {
  const value = inputElement.value.trim();
  const nameRegex = /^[A-Za-zА-Яа-яЁёЇїІіЄєҐґ' -]+$/;

  // Видаляємо попереднє повідомлення про помилку, якщо воно існує
  removeErrorMessage(inputElement);

  if (value === "") {
    showError(inputElement, `${fieldName} is required`);
    return false;
  } else if (!nameRegex.test(value)) {
    showError(inputElement, `${fieldName} can only contain letters, spaces, hyphens and apostrophes`);
    return false;
  }

  // Якщо валідація пройшла успішно, повертаємо нормальний стиль
  inputElement.classList.remove("invalid-input");
  return true;
}

// Валідація поля вибору (для group та gender)
function validateSelectField(selectElement, fieldName) {
  // Видаляємо попереднє повідомлення про помилку, якщо воно існує
  removeErrorMessage(selectElement);

  if (selectElement.value === "" || selectElement.value === null) {
    showError(selectElement, `Please select ${fieldName.toLowerCase()}`);
    return false;
  }

  // Якщо валідація пройшла успішно, повертаємо нормальний стиль
  selectElement.classList.remove("invalid-input");
  return true;
}

// Валідація поля дати народження
function validateBirthdayField() {
  const birthdayInput = document.getElementById("birthday");
  const value = birthdayInput.value;

  // Видаляємо попереднє повідомлення про помилку, якщо воно існує
  removeErrorMessage(birthdayInput);

  if (value === "") {
    showError(birthdayInput, "Birthday is required");
    return false;
  }

  const selectedDate = new Date(value);
  const currentDate = new Date();

  // Перевірка, що дата народження не в майбутньому
  if (selectedDate > currentDate) {
    showError(birthdayInput, "Birthday cannot be in the future");
    return false;
  }

  // Перевірка на мінімальний і максимальний вік (наприклад, 10-100 років)
  const minAgeDate = new Date();
  minAgeDate.setFullYear(currentDate.getFullYear() - 100);

  const maxAgeDate = new Date();
  maxAgeDate.setFullYear(currentDate.getFullYear() - 15);

  if (selectedDate < minAgeDate) {
    showError(birthdayInput, "Age cannot be more than 100 years");
    return false;
  }

  if (selectedDate > maxAgeDate) {
    showError(birthdayInput, "Student must be at least 15 years old");
    return false;
  }

  // Якщо валідація пройшла успішно, повертаємо нормальний стиль
  birthdayInput.classList.remove("invalid-input");
  return true;
}

// Функція для відображення помилки валідації
function showError(element, message) {
  // Додаємо клас для стилізації невалідного поля
  element.classList.add("invalid-input");

  // Створюємо елемент для відображення помилки, якщо його ще немає
  let errorElement = element.nextElementSibling;
  if (!errorElement || !errorElement.classList.contains("error-message")) {
    errorElement = document.createElement("div");
    errorElement.className = "error-message";
    element.parentNode.insertBefore(errorElement, element.nextSibling);
  }

  errorElement.textContent = message;
}

// Функція для видалення повідомлення про помилку
function removeErrorMessage(element) {
  const errorElement = element.nextElementSibling;
  if (errorElement && errorElement.classList.contains("error-message")) {
    errorElement.remove();
  }
}

// Функція для валідації всієї форми
function validateForm() {
  const firstNameValid = validateNameField(document.getElementById("firstname"), "First name");
  const lastNameValid = validateNameField(document.getElementById("lastname"), "Last name");
  const groupValid = validateSelectField(document.getElementById("group"), "Group");
  const genderValid = validateSelectField(document.getElementById("gender"), "Gender");
  const birthdayValid = validateBirthdayField();

  return firstNameValid && lastNameValid && groupValid && genderValid && birthdayValid;
}

function addstudent(event)
{
  const popup = document.getElementById("add-popup");
  const proceedButton = document.querySelector("#add-popup button.proceed");
  const popupTitle = document.querySelector("#add-popup span");

  // Очищаємо попередні дані форми
  document.getElementById("group").value = "";
  document.getElementById("firstname").value = "";
  document.getElementById("lastname").value = "";
  document.getElementById("gender").value = "";
  document.getElementById("birthday").value = "";
  document.getElementById("student-id").value = "";

  // Очищаємо всі повідомлення про помилки
  const errorMessages = document.querySelectorAll(".error-message");
  errorMessages.forEach(el => el.remove());

  // Видаляємо клас invalid-input з усіх полів
  const formFields = document.querySelectorAll(".add-popup-content input, .add-popup-content select");
  formFields.forEach(field => field.classList.remove("invalid-input"));

  // Перевіряємо, чи була натиснута кнопка редагування
  if (event && event.target.classList.contains("edit")) {
    // Отримуємо рядок з даними студента
    const row = event.target.closest('tr');
    const studentId = row.getAttribute('data-id');
    const student = students.find(s => s.id == studentId);

    if (student) {
      // Розбиваємо ім'я на прізвище та ім'я
      const nameParts = student.name.split(" ");
      const lastName = nameParts[0];
      const firstName = nameParts.slice(1).join(" ");

      // Конвертуємо формат дати з DD-MM-YYYY у YYYY-MM-DD для input
      const birthdayParts = student.birthday.split("-");
      const formattedBirthday = `${birthdayParts[2]}-${birthdayParts[1]}-${birthdayParts[0]}`;

      // Заповнюємо форму існуючими даними
      document.getElementById("group").value = student.group;
      document.getElementById("firstname").value = firstName;
      document.getElementById("lastname").value = lastName;
      document.getElementById("gender").value = student.gender;
      document.getElementById("birthday").value = formattedBirthday;
      document.getElementById("student-id").value = student.id;

      // Змінюємо текст кнопки і заголовок
      proceedButton.textContent = "Save";
      popupTitle.textContent = "Edit Student";
    }
  } else {
    // Налаштовуємо для додавання нового студента
    proceedButton.textContent = "Add";
    popupTitle.textContent = "Add Student";
  }

  // Показуємо попап
  popup.style.visibility = "visible";
  document.querySelector('#window').style.display = "block";
}

function addstudentclose()
{
  addStudentPopup.style.visibility = "hidden";
  document.querySelector('#window').style.display = "none";

  // Скидаємо ID студента після закриття форми
  document.getElementById("student-id").value = "";
}

function addstudentcancel()
{
  addStudentPopup.style.visibility = "hidden";
  document.querySelector('#window').style.display = "none";

  // Скидаємо ID студента після закриття форми
  document.getElementById("student-id").value = "";
}

// Функція для оновлення обробників подій чекбоксів
function updateCheckboxes() {
  const selectAllCheckbox = document.getElementById('selectAll');
  const studentCheckboxes = document.querySelectorAll('.student-checkbox');

  selectAllCheckbox.addEventListener('change', function() {
    studentCheckboxes.forEach(checkbox => {
      checkbox.checked = this.checked;
    });
    toggleEditButtons();
  });

  studentCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      if (!this.checked) {
        selectAllCheckbox.checked = false;
      } else if (Array.from(studentCheckboxes).every(cb => cb.checked)) {
        selectAllCheckbox.checked = true;
      }
      toggleEditButtons();
    });
  });
}

// Функція для ввімкнення/вимкнення кнопок редагування
function toggleEditButtons() {
  const studentCheckboxes = document.querySelectorAll('.student-checkbox');
  const editButtons = document.querySelectorAll('.edit');
  const checkedCount = Array.from(studentCheckboxes).filter(cb => cb.checked).length;

  editButtons.forEach(button => {
    button.disabled = checkedCount > 1;
  });
}

// Функція для показу попапу видалення
function showDeletePopup(event) {
  const popup = document.getElementById('deletePopup');
  const message = document.getElementById('deleteMessage');

  const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');

  if (selectedCheckboxes.length === 0 && event) {
    // Видалення через кнопку видалення - отримуємо рядок і ім'я студента
    const row = event.target.closest('tr');
    const studentId = row.getAttribute('data-id');
    const student = students.find(s => s.id == studentId);

    if (student) {
      message.textContent = `Are you sure you want to delete "${student.name}"?`;
      // Зберігаємо посилання на ID студента, якого хочемо видалити
      document.getElementById("deletePopup").setAttribute("data-delete-id", studentId);
    }
  } else if (selectedCheckboxes.length > 0) {
    // Видалення декількох вибраних студентів
    const studentIds = Array.from(selectedCheckboxes).map(checkbox =>
      checkbox.closest('tr').getAttribute('data-id')
    );

    const selectedStudents = students.filter(s => studentIds.includes(s.id.toString()));
    const names = selectedStudents.map(s => s.name).join(', ');

    message.textContent = `Are you sure you want to delete "${names}"?`;
    // Зберігаємо посилання на ID студентів, яких хочемо видалити
    document.getElementById("deletePopup").setAttribute("data-delete-ids", JSON.stringify(studentIds));
  } else {
    message.textContent = 'No students selected for deletion.';
  }

  popup.style.display = 'block';
  document.querySelector('#window').style.display = "block";
}

// Функція для підтвердження видалення
function confirmDelete() {
  const popup = document.getElementById('deletePopup');

  // Перевіряємо, чи видаляємо декількох студентів
  const deleteIds = popup.getAttribute("data-delete-ids");
  if (deleteIds) {
    const ids = JSON.parse(deleteIds);
    // Фільтруємо видалених студентів
    students = students.filter(student => !ids.includes(student.id.toString()));
  } else {
    // Перевіряємо, чи видаляємо одного студента
    const deleteId = popup.getAttribute("data-delete-id");
    if (deleteId) {
      // Фільтруємо видаленого студента
      students = students.filter(student => student.id != deleteId);
    }
  }

  // Оновлюємо таблицю студентів
  renderStudents();

  // Очищаємо атрибути
  popup.removeAttribute("data-delete-id");
  popup.removeAttribute("data-delete-ids");

  // Закриваємо попап
  closePopup();
}

function closePopup() {
  const popup = document.getElementById('deletePopup');
  popup.style.display = 'none';
  document.querySelector('#window').style.display = "none";
}

// Функція для створення/оновлення студента
function createStudent() {
  // Спочатку валідуємо форму
  if (!validateForm()) {
    // Якщо форма невалідна, припиняємо виконання функції
    return;
  }

  const firstName = document.getElementById("firstname").value.trim();
  const lastName = document.getElementById("lastname").value.trim();
  const group = document.getElementById("group").value.trim();
  const gender = document.getElementById("gender").value.trim();
  const birthdayDate = document.getElementById("birthday").value.trim();

  // Форматуємо дату з YYYY-MM-DD у DD-MM-YYYY для відображення
  const birthdayParts = birthdayDate.split("-");
  const formattedBirthday = `${birthdayParts[2]}-${birthdayParts[1]}-${birthdayParts[0]}`;

  // Отримуємо ID студента з прихованого поля (для редагування) або генеруємо новий ID
  const studentId = document.getElementById("student-id").value || (students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1);

  // Перевіряємо, чи редагуємо існуючого студента або створюємо нового
  const existingIndex = students.findIndex(s => s.id == studentId);

  if (existingIndex !== -1) {
    // Оновлюємо існуючого студента
    const updatedStudent = {
      id: parseInt(studentId),
      group,
      name: `${lastName} ${firstName}`,
      gender,
      birthday: formattedBirthday,
      status: students[existingIndex].status // Зберігаємо статус
    };

    // Оновлюємо студента у масиві
    students[existingIndex] = updatedStudent;

    // Виводимо дані оновленого студента у консоль у форматі JSON
    console.log('Edited student data:');
    console.log(JSON.stringify(updatedStudent, null, 2));
  } else {
    // Додаємо нового студента
    const newStudent = {
      id: parseInt(studentId),
      group,
      name: `${lastName} ${firstName}`,
      gender,
      birthday: formattedBirthday,
      status: "inactive" // Статус за замовчуванням для нових студентів
    };

    students.push(newStudent);

    // Додаємо запис у консоль про час та користувача, який додав студента
    console.log(`Current Date and Time: ${getCurrentDateTime()}`);
    console.log(`Current User's Login: ${getCurrentUser()}`);
  }

  // Оновлюємо таблицю і закриваємо попап
  renderStudents();
  addstudentclose();
}

// Функція для отримання поточної дати і часу у форматі UTC
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

function updateNotification() {
  const notification = document.querySelector("#notification-btn.notification");
  notification.style.backgroundImage = "url(src/assets/bell.png)";
}

document.getElementById('brgrbtn').addEventListener('click', () => {
  if(document.querySelector(".burger").style.display === 'flex') {
    document.querySelector(".burger").style.display = 'none';
  } else {
    document.querySelector(".burger").style.display = 'flex';
  }
});