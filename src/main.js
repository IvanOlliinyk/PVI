// Отримуємо потрібні елементи
const notificationLink = document.getElementById("notification-btn");
const notificationsPopup = document.getElementById("notifications-popup");

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