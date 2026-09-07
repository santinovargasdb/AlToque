/**
 * AlToque · FAQ · Preguntas frecuentes
 * script.js
 */

/* ══════════════════════════════════════════
   HAMBURGER MENU
   ══════════════════════════════════════════ */
const burger     = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');

if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
      closeMobileMenu();
    }
  });
}

function closeMobileMenu() {
  if (!mobileMenu || !burger) return;
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   FAQ SEARCH + CATEGORY FILTER
   ══════════════════════════════════════════ */
const searchInput = document.getElementById('faqSearch');
const tabButtons  = document.querySelectorAll('.faq-tab');
const sections    = document.querySelectorAll('.faq-section');
const items       = document.querySelectorAll('.faq-item');
const emptyState  = document.getElementById('faqEmpty');

let activeCategory = 'all';

/** Normaliza texto para búsqueda (sin tildes, minúsculas) */
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Aplica filtros combinados: categoría + texto */
function applyFilters() {
  const q = norm(searchInput ? searchInput.value : '');
  let visibleCount = 0;

  items.forEach(item => {
    const cat = item.dataset.cat || '';
    const summary = norm(item.querySelector('summary')?.textContent);
    const answer  = norm(item.querySelector('.faq-answer')?.textContent);

    const matchCat  = activeCategory === 'all' || cat === activeCategory;
    const matchText = !q || summary.includes(q) || answer.includes(q);
    const show      = matchCat && matchText;

    item.style.display = show ? '' : 'none';
    if (show) visibleCount++;

    /* Abrir automáticamente el item si el usuario buscó y coincide */
    if (q && show && (summary.includes(q) || answer.includes(q))) {
      item.setAttribute('open', '');
    } else if (!q) {
      item.removeAttribute('open');
    }
  });

  /* Ocultar sections que quedaron sin items visibles */
  sections.forEach(section => {
    const visibleItems = Array.from(section.querySelectorAll('.faq-item'))
      .filter(el => el.style.display !== 'none');
    section.style.display = visibleItems.length ? '' : 'none';
  });

  /* Empty state */
  if (emptyState) {
    emptyState.style.display = visibleCount === 0 ? '' : 'none';
  }
}

if (searchInput) {
  searchInput.addEventListener('input', applyFilters);
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.dataset.cat || 'all';
    applyFilters();
  });
});
