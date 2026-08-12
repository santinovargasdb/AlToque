/**
 * AlToque: El oficio que necesitás, al toque
 * Evaluación de Proyectos · Instituto Leonardo Murialdo · 7mo Informática A · 2026
 * script.js
 */

/* ══════════════════════════════════════════
   HAMBURGER MENU
   ══════════════════════════════════════════ */
const burger     = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');

/** Abrir / cerrar el drawer móvil */
burger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burger.classList.toggle('open', isOpen);
  burger.setAttribute('aria-expanded', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

/** Cerrar al hacer click en un enlace interno */
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', closeMobileMenu);
});

/** Cerrar al hacer click fuera del menú */
document.addEventListener('click', e => {
  if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
    closeMobileMenu();
  }
});

function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  burger.classList.remove('open');
  burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════
   ACTIVE NAV LINK ON SCROLL
   ══════════════════════════════════════════ */
const sections = document.querySelectorAll('section[id], div[id]');
const navLinks  = document.querySelectorAll('.nav-links a, .mobile-link');

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(a => {
        a.classList.toggle('act', a.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => navObserver.observe(s));

/* ══════════════════════════════════════════
   SCROLL-TRIGGERED FADE-UP
   ══════════════════════════════════════════ */
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.style.opacity    = '1';
      el.target.style.transform  = 'none';
      el.target.style.transition = 'opacity .6s ease, transform .6s ease';
    }
  });
}, { threshold: .1 });

document.querySelectorAll('.caso-card, .mat-card, .metod-card, .cb-stat').forEach(el => {
  el.style.opacity   = '0';
  el.style.transform = 'translateY(20px)';
  fadeObserver.observe(el);
});
