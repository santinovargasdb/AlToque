/**
 * AlToque · Manual de uso
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
   TOC ACTIVE LINK ON SCROLL
   ══════════════════════════════════════════ */
const sections = document.querySelectorAll('.doc-section[id]');
const tocLinks = document.querySelectorAll('.toc a');

const tocObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      tocLinks.forEach(a => {
        a.classList.toggle('act', a.getAttribute('href') === '#' + entry.target.id);
      });
    }
  });
}, { rootMargin: '-30% 0px -65% 0px' });

sections.forEach(s => tocObserver.observe(s));

/* Also observe nested h3 headings for finer-grained highlight */
const subHeads = document.querySelectorAll('.doc-section h3[id]');
const subObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      tocLinks.forEach(a => {
        if (a.classList.contains('toc-sub')) {
          a.classList.toggle('act', a.getAttribute('href') === '#' + entry.target.id);
        }
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
subHeads.forEach(h => subObserver.observe(h));

/* Close mobile drawer when clicking a TOC item */
document.querySelectorAll('.toc a').forEach(a => {
  a.addEventListener('click', closeMobileMenu);
});
