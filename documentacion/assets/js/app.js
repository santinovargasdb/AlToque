// AlToque · Documentación — scrollspy del índice lateral
(function () {
  "use strict";

  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  var byId = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    byId[id] = a;
  });

  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  if (!("IntersectionObserver" in window) || sections.length === 0) return;

  var current = null;
  function activate(id) {
    if (current === id) return;
    current = id;
    links.forEach(function (a) { a.classList.remove("act"); });
    if (byId[id]) byId[id].classList.add("act");
  }

  // La sección "activa" es la última cuyo encabezado pasó el tercio superior del viewport.
  var observer = new IntersectionObserver(
    function () {
      var top = window.scrollY + window.innerHeight / 3;
      var active = sections[0].id;
      sections.forEach(function (s) {
        if (s.offsetTop <= top) active = s.id;
      });
      activate(active);
    },
    { rootMargin: "0px 0px -60% 0px", threshold: [0, 0.1] }
  );
  sections.forEach(function (s) { observer.observe(s); });
  window.addEventListener("scroll", function () {
    var top = window.scrollY + window.innerHeight / 3;
    var active = sections[0].id;
    sections.forEach(function (s) {
      if (s.offsetTop <= top) active = s.id;
    });
    activate(active);
  }, { passive: true });
})();
