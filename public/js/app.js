/**
 * QR DINE — небольшие улучшения интерфейса поверх htmx.
 *
 * Основную работу (запросы, обновление частей страницы) делает htmx
 * через атрибуты hx-* в шаблонах. Здесь — только то, что относится
 * к поведению на стороне браузера: уведомления, мобильное меню,
 * превью картинок, авто-отправка фильтров и печать.
 *
 * Inline-обработчики (onclick="…") не используются — их запрещает
 * Content-Security-Policy, поэтому всё навешивается делегированием событий.
 */
(() => {
  'use strict';

  /* ---------- Уведомления (toast) ---------- */

  const TOAST_LIFETIME = 3500;

  /** Запускает таймер скрытия у новых уведомлений. */
  function scheduleToasts() {
    document.querySelectorAll('.toast:not([data-scheduled])').forEach((toast) => {
      toast.dataset.scheduled = 'true';
      setTimeout(() => {
        toast.classList.add('is-leaving');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
      }, TOAST_LIFETIME);
    });
  }

  /** Показывает уведомление из JavaScript (например, при ошибке сети). */
  function showToast(message, type = 'error') {
    const container = document.getElementById('toasts');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.append(toast);
    scheduleToasts();
  }

  document.addEventListener('DOMContentLoaded', scheduleToasts);
  // htmx:afterSettle — после любой вставки контента (в т.ч. hx-swap-oob)
  document.addEventListener('htmx:afterSettle', scheduleToasts);

  /* ---------- Ошибки htmx-запросов ---------- */

  document.addEventListener('htmx:responseError', (event) => {
    const status = event.detail.xhr.status;
    showToast(status === 403 ? 'Рұқсат жоқ. Қайта кіріп көріңіз.' : 'Қате орын алды. Қайталап көріңіз.');
  });
  document.addEventListener('htmx:sendError', () => showToast('Интернет байланысын тексеріңіз.'));

  /* ---------- Переключатели (мобильное меню, сайдбар админки) ---------- */

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      const target = document.querySelector(toggle.dataset.toggle);
      const isOpen = target?.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
      return;
    }

    // Клик по ссылке внутри открытого меню — закрываем его
    const openMenu = event.target.closest('.is-open');
    if (openMenu && event.target.closest('a')) openMenu.classList.remove('is-open');

    if (event.target.closest('[data-print]')) window.print();
  });

  // При переходе на новую страницу (hx-boost) меню должно быть закрыто
  document.addEventListener('htmx:beforeSwap', () => {
    document.querySelectorAll('.is-open').forEach((el) => el.classList.remove('is-open'));
  });

  /* ---------- Формы ---------- */

  document.addEventListener('change', (event) => {
    const input = event.target;

    // <select data-autosubmit> — отправить форму фильтра сразу при выборе
    if (input.matches('[data-autosubmit]')) input.form?.requestSubmit();

    // <input type="file" data-preview> — показать выбранную картинку до загрузки
    if (input.matches('input[type="file"][data-preview]')) {
      const preview = input.closest('.upload')?.querySelector('[data-preview-target]');
      const file = input.files?.[0];
      if (preview && file) {
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('is-hidden');
      }
    }
  });

  /* ---------- Анимация счётчика корзины ---------- */

  document.addEventListener('htmx:oobAfterSwap', (event) => {
    const el = event.detail.target;
    if (el?.id === 'cart-count' || el?.classList?.contains('add-button__qty')) {
      el.classList.remove('is-empty');
      el.classList.remove('is-bumped');
      void el.offsetWidth; // перезапуск CSS-анимации
      el.classList.add('is-bumped');
    }
  });
})();
