// Comentarios de la entrega.
(function () {
  'use strict';

  const { api, escapeHtml } = window.Campus;
  const widget = document.querySelector('.comments-widget');
  if (!widget) return;

  const toggle = widget.querySelector('.comments-toggle');
  const panel = widget.querySelector('.comments-panel');
  const input = widget.querySelector('.comment-input');

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    panel.hidden = !panel.hidden;
    toggle.classList.toggle('open', !panel.hidden);
    if (!panel.hidden) input.focus();
  });

  widget.querySelector('.comment-cancel').addEventListener('click', () => {
    input.value = '';
    panel.hidden = true;
    toggle.classList.remove('open');
  });

  widget.querySelector('.comment-save').addEventListener('click', async () => {
    const content = input.value.trim();
    if (!content) return;
    const comment = await api(`/api/assign/${widget.dataset.activity}/comments`, { method: 'POST', body: { content } });
    widget.querySelector('.comments-list').insertAdjacentHTML(
      'beforeend',
      `<li><span class="avatar avatar-sm">${escapeHtml(comment.initials)}</span><div><div class="comment-meta"><strong>${escapeHtml(comment.author)}</strong> - ${escapeHtml(comment.date)}</div><div>${escapeHtml(comment.content)}</div></div></li>`
    );
    const count = widget.querySelector('.comments-count');
    count.textContent = Number(count.textContent) + 1;
    input.value = '';
  });
})();
