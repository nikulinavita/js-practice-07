'use strict';

// ============================================================
// ПРАКТИЧЕСКАЯ РАБОТА №7 — События в JS
// script_07.js — Starter Kit (заготовка для студентов)
//
// ЗАДАЧА: Реализовать интерактивную Kanban-доску.
// Читайте комментарии — они подскажут, что и где нужно написать.
// Комментарии «ПОЧЕМУ?» — обязательно заполните сами!
// ============================================================

// ============================================================
// 1. ПОИСК ЭЛЕМЕНТОВ
// WHY? Все ссылки на DOM-узлы собираем в одном месте — легко найти и изменить при необходимости.
// ============================================================

const taskInput       = document.querySelector('#task-input');
const prioritySelect  = document.querySelector('#priority-select');
const addTaskBtn      = document.querySelector('#add-task-btn');
const validationMsg   = document.querySelector('#validation-msg');

const toggleThemeBtn  = document.querySelector('#toggle-theme-btn');
const clearDoneBtn    = document.querySelector('#clear-done-btn');
const viewModeBtn     = document.querySelector('#view-mode-btn');
const taskCountEl     = document.querySelector('#task-count');

const board           = document.querySelector('#board');
const welcomeBanner   = document.querySelector('#welcome-banner');
const closeBannerBtn  = document.querySelector('#close-banner-btn');

const COLUMN_ORDER = ['todo', 'in-progress', 'done'];

const PRIORITY_LABELS = {
  low:    '🟢 Низкий',
  medium: '🟡 Средний',
  high:   '🔴 Высокий',
};

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

// WHY textContent? — Вставляю текст безопасно, экранируя HTML-теги. Это защита от XSS-уязвимостей, если пользователь введет вредоносный код.
 
function safeText(node, text) {
  node.textContent = text;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function showError(msg) {
  safeText(validationMsg, msg);
}

function clearError() {
  validationMsg.textContent = '';
}

// ============================================================
// 3. СЧЁТЧИКИ
// ============================================================

// WHY querySelectorAll? — Возвращает статичный NodeList. Идеально подходит, когда нужно один раз посчитать количество элементов на странице в данный момент.

function updateCounters() {
  const allCards = document.querySelectorAll('.task-card');
  safeText(taskCountEl, String(allCards.length));

  COLUMN_ORDER.forEach(status => {
    const column     = document.querySelector(`.column[data-status="${status}"]`);
    const countBadge = column.querySelector('.column-count');
    const cards      = column.querySelectorAll('.task-card');
    safeText(countBadge, String(cards.length));
  });
}

// ============================================================
// 4. СОЗДАНИЕ КАРТОЧКИ ЗАДАЧИ
// ============================================================

/**
 * Создаёт DOM-узел карточки задачи.
 * WHY createElement? — Создает DOM-узел программно в памяти браузера. Это безопаснее и гибче, чем склеивать строки через innerHTML.
 *
 * @param {{ id: string, text: string, priority: string }} task
 * @returns {HTMLElement}
 */
function createTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card';
  card.dataset.id       = task.id;
  card.dataset.priority = task.priority;

  // Добавляем класс для высокого приоритета (PRO: используется для сортировки)
  if (task.priority === 'high') {
    card.classList.add('priority-high');
  }

  // Заголовок задачи
  const title = document.createElement('h3');
  safeText(title, task.text); // WHY textContent? — TODO: ваш комментарий

  // Бейдж приоритета
  const badge = document.createElement('span');
  badge.className = `priority-badge ${task.priority}`;
  safeText(badge, PRIORITY_LABELS[task.priority] || task.priority);

  // Кнопки действий
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn-secondary';
  prevBtn.dataset.action = 'prev';
  safeText(prevBtn, '← Назад');

  const nextBtn = document.createElement('button');
  nextBtn.dataset.action = 'next';
  safeText(nextBtn, '→ Вперёд');

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.dataset.action = 'delete';
  safeText(delBtn, '✕ Удалить');

  actions.append(prevBtn, nextBtn, delBtn);
  card.append(title, badge, actions);

  return card;
}

// ============================================================
// 5. ДОБАВЛЕНИЕ ЗАДАЧИ
// ============================================================


function addTask() {
  const text     = (taskInput.value || '').trim();
  const priority = prioritySelect.value;

  // --- Валидация ---
  if (text.length < 3) {
    showError('Название задачи должно содержать минимум 3 символа.');
    taskInput.focus();
    return;
  }

  clearError();

  const task = {
    id:       generateId(),
    text,
    priority,
    status:   'todo',
  };

  const card    = createTaskCard(task);
  const todoList = document.querySelector('[data-status="todo"] .task-list');
  todoList.appendChild(card);

  // Сбрасываем форму
  taskInput.value = '';
  prioritySelect.selectedIndex = 1; // сброс на «Средний»
  taskInput.focus();

  updateCounters();
  saveToStorage();
  taskInput.value = '';

}

// ============================================================
// 6. ОБРАБОТЧИКИ ФОРМЫ
// ============================================================

// // WHY addEventListener? — Это современный стандарт. Позволяет вешать несколько разных обработчиков на одно событие и дает доступ к полезным опциям (например, once или capture). Устаревший onclick так не умеет.
addTaskBtn.addEventListener('click', addTask);

// Обработка клавиатуры в поле ввода
// WHY keydown? — чтобы обрабатывать нажатия клавиш.
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addTask();
  }
  if (e.key === 'Escape') {
    taskInput.value = '';
    clearError();
  }
});

// ============================================================
// 7. ДЕЛЕГИРОВАНИЕ СОБЫТИЙ НА ДОСКЕ ⭐
//
// WHY один обработчик на #board, а не на каждую кнопку? - Делегирование позволяет обрабатывать события от динамически добавленных элементов (карточек), не навешивая обработчик на каждую кнопку. Это экономит ресурсы и упрощает код.

function boardClickHandler(e) {
  
  // WHY closest? - Метод closest() позволяет найти ближайшего родителя с заданным селектором, что идеально подходит для определения, на какую кнопку внутри карточки кликнули, и для получения самой карточки.
  const actionBtn = e.target.closest('[data-action]');
  const card      = e.target.closest('.task-card');

  if (!card) return; 

  if (actionBtn) {
    // WHY stopPropagation? — Останавливает всплытие события, чтобы клик по кнопке не срабатывал как клик по карточке (не выделял её).
    e.stopPropagation();

    const action = actionBtn.dataset.action;

    if (action === 'delete') {
      if (confirm('Удалить задачу?')) {
        card.remove(); // WHY remove()? — Удаляет элемент из DOM. Это современный и удобный способ удалить узел, поддерживаемый всеми современными браузерами.
        updateCounters();
        saveToStorage();
      }
    }

    if (action === 'next') {

      const currentStatus = card.closest('.column').dataset.status;
      const currentIndex = COLUMN_ORDER.indexOf(currentStatus);
      const nextIndex = currentIndex + 1;

      if (nextIndex < COLUMN_ORDER.length) {
        
        const nextStatus = COLUMN_ORDER[nextIndex];
        const nextList = document.querySelector(`[data-status="${nextStatus}"] .task-list`);
        
        nextList.appendChild(card);
        
        updateCounters();
        saveToStorage();
      }
    }

    if (action === 'prev') {
      const currentStatus = card.closest('.column').dataset.status;
      const currentIndex = COLUMN_ORDER.indexOf(currentStatus);
      const prevIndex = currentIndex - 1;

      if (prevIndex >= 0) {
        
        const prevStatus = COLUMN_ORDER[prevIndex];
        const prevList = document.querySelector(`[data-status="${prevStatus}"] .task-list`);
        
        prevList.appendChild(card);
        
        updateCounters();
        saveToStorage();
      }
    }

    return;
  }
  // WHY classList.toggle? — toggle() добавляет класс, если его нет, и удаляет, если он есть. Это удобно для переключения состояния (например, выделения карточки) без необходимости писать условные операторы для проверки наличия класса.
  card.classList.toggle('selected');
}

// Вешаем обработчик на доску
board.addEventListener('click', boardClickHandler);

// ============================================================
// 8. УПРАВЛЕНИЕ ТЕМОЙ И ОЧИСТКА
// ============================================================

// WHY classList.toggle? — toggle() добавляет класс, если его нет, и удаляет, если он есть. Это удобно для переключения между светлой и тёмной темой без необходимости писать условные операторы для проверки текущего состояния.
toggleThemeBtn.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

clearDoneBtn.addEventListener('click', () => {
  const doneList = document.querySelector('[data-status="done"] .task-list');
  const cards    = doneList.querySelectorAll('.task-card');

  if (!cards.length) {
    alert('Колонка «Готово» уже пуста.');
    return;
  }

  // WHY confirm? — Подтверждение действия — это стандартный способ предотвратить случайное удаление данных пользователем. Это особенно важно для необратимых действий, таких как удаление всех задач в колонке.
  if (!confirm(`Удалить все ${cards.length} задач из колонки «Готово»?`)) return;

  cards.forEach(card => card.remove());
  updateCounters();
  saveToStorage();
});


let isViewMode = false;

viewModeBtn.addEventListener('click', () => {
  isViewMode = !isViewMode;

  if (isViewMode) {

    board.removeEventListener('click', boardClickHandler);
    viewModeBtn.classList.add('view-mode-active');
    safeText(viewModeBtn, '✏️ Режим редактирования');
  } else {
    board.addEventListener('click', boardClickHandler);
    viewModeBtn.classList.remove('view-mode-active');
    safeText(viewModeBtn, '👁 Режим просмотра');
  }
});

closeBannerBtn.addEventListener('click', () => {
  welcomeBanner.remove();
}, { once: true });

// ============================================================
// 11. PRO: localStorage
// ============================================================
function saveToStorage() {
  const tasksToSave = [];
  document.querySelectorAll('.task-card').forEach(card => {
    const taskObj = {
      id: card.dataset.id,
      text: card.querySelector('h3').textContent,
      priority: card.dataset.priority,
      status: card.closest('.column').dataset.status
    };
    tasksToSave.push(taskObj);
  });
  // WHY JSON.stringify? — localStorage хранит только строки. Переводим массив в строку.
  localStorage.setItem('kanban-tasks', JSON.stringify(tasksToSave));
}

function loadFromStorage() {
  const rawData = localStorage.getItem('kanban-tasks');
  if (!rawData) return; 

  // WHY JSON.parse? — Переводим текстовую строку обратно в массив объектов JS.
  const tasks = JSON.parse(rawData);

  tasks.forEach(task => {
    const card = createTaskCard(task);
    const columnList = document.querySelector(`[data-status="${task.status}"] .task-list`);
    if (columnList) {
      columnList.appendChild(card);
    }
  });
}

// ============================================================
// 12. ИНИЦИАЛИЗАЦИЯ
// ============================================================

loadFromStorage(); 
updateCounters();  