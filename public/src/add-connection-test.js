// Цей скрипт додасть на сторінку кнопки для тестування з'єднання
document.addEventListener('DOMContentLoaded', function() {
  // Створюємо панель для кнопок
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.top = '10px';
  panel.style.right = '10px';
  panel.style.backgroundColor = 'rgba(0,0,0,0.7)';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.zIndex = '9999';

  // Створюємо кнопку для тестування з'єднання
  const testButton = document.createElement('button');
  testButton.textContent = 'Перевірити з\'єднання';
  testButton.style.backgroundColor = '#4CAF50';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.padding = '8px 16px';
  testButton.style.marginRight = '5px';
  testButton.style.cursor = 'pointer';

  testButton.addEventListener('click', async function() {
    try {
      const response = await fetch('http://localhost:3001/api/health-check');
      if (response.ok) {
        const data = await response.json();
        alert('З\'єднання успішне!\n' + JSON.stringify(data, null, 2));
      } else {
        alert(`Помилка: HTTP ${response.status}`);
      }
    } catch (error) {
      alert(`Помилка з'єднання: ${error.message}`);
    }
  });

  // Створюємо кнопку для ініціалізації чату
  const initButton = document.createElement('button');
  initButton.textContent = 'Ініціалізувати чат';
  initButton.style.backgroundColor = '#2196F3';
  initButton.style.color = 'white';
  initButton.style.border = 'none';
  initButton.style.padding = '8px 16px';
  initButton.style.cursor = 'pointer';

  initButton.addEventListener('click', function() {
    if (window.messagingClient) {
      window.messagingClient.initializeMessaging()
        .then(result => {
          if (result) {
            alert('Чат успішно ініціалізовано!');
          }
        });
    } else {
      alert('MessagingClient не ініціалізований');
    }
  });

  // Додаємо кнопки на панель
  panel.appendChild(testButton);
  panel.appendChild(initButton);

  // Додаємо панель на сторінку
  document.body.appendChild(panel);
});