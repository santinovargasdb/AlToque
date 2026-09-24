/**
 * AlToque · Nosotros
 * Menú móvil + entradas animadas al scrollear.
 */

// ── Menú móvil ──
const burger = document.getElementById("navBurger");
const menu = document.getElementById("mobileMenu");

if (burger && menu) {
  burger.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

// ── Entradas animadas (.fade-up) ──
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const targets = document.querySelectorAll(".fade-up");

if (prefersReduced || !("IntersectionObserver" in window)) {
  targets.forEach((el) => el.classList.add("visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  targets.forEach((el) => observer.observe(el));
}
