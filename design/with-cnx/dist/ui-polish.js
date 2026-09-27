/* Presentation helpers only: no event data, storage, requests or network changes. */
const localizedPlaceholders = {
  '例如 / e.g. Nok': ['例如：Nok', 'e.g. Nok'],
  '例如 / e.g. Thai, a little English': ['例如：泰语、少量英语', 'e.g. Thai, a little English'],
  '例如 / e.g. Sunday coffee meetup': ['例如：周日咖啡小聚', 'e.g. Sunday coffee meetup'],
  '场地名称和区域 / Venue name and area': ['场地名称和区域', 'Venue name and area'],
  '免费 / Free / ฿150': ['免费或 ฿150', 'Free or ฿150'],
  '这是我第一次参加，很高兴一起去。 / It’s my first time. Happy to join you.': ['这是我第一次参加，很高兴一起去。', 'It’s my first time. Happy to join you.'],
  '在门口碰面，介绍朋友…… / Meet at the entrance, introduce people…': ['在门口碰面，介绍朋友……', 'Meet at the entrance, introduce people…'],
  '例如：活动入口接待台 / e.g. The event’s reception desk': ['例如：活动入口接待台', 'e.g. The event’s reception desk'],
  'English, basic Thai…': ['英语、少量泰语……', 'English, basic Thai…'],
  '搜索活动 / Search events': ['搜索活动或同行者', 'Search events or buddies']
};
function polishPlaceholder(original) {
  if (language === 'th') return THAI_COPY.placeholders[original] ?? original;
  const pair = localizedPlaceholders[original];
  return pair && (language === 'zh' || language === 'en') ? pair[language === 'zh' ? 0 : 1] : original;
}

let modalCloseTimer;
function prepareModalOpen() {
  clearTimeout(modalCloseTimer);
  const modal = document.getElementById('modal');
  modal.classList.remove('is-closing');
  modal.inert = false;
}
function dismissModal() {
  const modal = document.getElementById('modal');
  if (!modal.open || modal.classList.contains('is-closing')) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { modal.close(); return; }
  // Exit motion must not leave form controls available for a second keyboard submission.
  modal.inert = true;
  modal.classList.add('is-closing');
  modalCloseTimer = setTimeout(() => {
    modal.close();
    modal.classList.remove('is-closing');
    modal.inert = false;
  }, 140);
}
document.getElementById('modal').addEventListener('cancel', event => {
  event.preventDefault();
  dismissModal();
});

function clearSuccessMoment() {
  const toast = document.getElementById('toast');
  toast.classList.remove('is-success');
  delete toast.dataset.moment;
}
function showSuccessMoment(moment) {
  // Called only after the existing action has succeeded. Keep the original local-demo notice.
  const toast = document.getElementById('toast');
  if (toast.hidden || !storageWorking) return;
  const description = toast.innerHTML;
  const title = moment === 'posted'
    ? bi('邀请已添加', 'Invitation added', 'เพิ่มคำชวนแล้ว')
    : bi('一起去吧', 'Let’s go together', 'ไปด้วยกัน');
  toast.innerHTML = '<span class="success-art" aria-hidden="true">' + buddyScene('moment-buddies') +
    '<svg class="success-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="15"/><path d="m9 16 5 5 9-10"/></svg></span>' +
    '<div class="success-copy"><strong class="success-title">' + title + '</strong><div class="success-description">' + description + '</div></div>';
  toast.dataset.moment = moment;
  toast.classList.add('is-success');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; clearSuccessMoment(); }, 6200);
}
