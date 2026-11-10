'use strict';
(() => {
  const root = document.documentElement;
  const themeKey = 'salud-tema-v1';
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('[data-cambiar-tema]');
  const themeStatus = document.querySelector('#estado-tema');
  let explicitTheme = null;
  try {const saved = localStorage.getItem(themeKey);if (saved === 'claro' || saved === 'oscuro') explicitTheme = saved;} catch {}
  function applyTheme() {
    const dark = (explicitTheme || (systemDark.matches ? 'oscuro' : 'claro')) === 'oscuro';
    root.dataset.tema = dark ? 'oscuro' : 'claro';
    if (toggle) {
      toggle.hidden = false;
      toggle.dataset.icono = dark ? '☀' : '☾';
      toggle.setAttribute('aria-pressed', String(dark));
      toggle.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
      toggle.textContent = dark ? '☀ Modo claro' : '☾ Modo oscuro';
    }
  }
  toggle?.addEventListener('click', () => {
    explicitTheme = root.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
    let saved = true;
    try {localStorage.setItem(themeKey, explicitTheme);} catch {saved = false;}
    applyTheme();
    if (themeStatus) themeStatus.textContent = `Modo ${explicitTheme} activado.${saved ? '' : ' No se pudo guardar la preferencia en este navegador.'}`;
  });
  systemDark.addEventListener('change', () => {if (!explicitTheme) applyTheme();});
  addEventListener('storage', event => {
    if (event.key === themeKey || event.key === null) {explicitTheme = ['claro', 'oscuro'].includes(event.newValue) ? event.newValue : null;applyTheme();}
  });
  applyTheme();

  let observer;
  function revealContent() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      observer?.disconnect();
      document.querySelectorAll('.por-aparecer, .aparece').forEach(node => node.classList.remove('por-aparecer', 'aparece'));
      return;
    }
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.remove('por-aparecer');entry.target.classList.add('aparece');observer.unobserve(entry.target);}
    }), {threshold: 0.06, rootMargin: '0px 0px 30px 0px'});
    document.querySelectorAll('.tarjeta-lista, .explorar > a, .nota-secundaria, .franja-recetas').forEach(node => {
      if (node.getBoundingClientRect().top >= innerHeight) {observer.observe(node);node.classList.add('por-aparecer');}
    });
  }
  reducedMotion.addEventListener('change', revealContent);
  revealContent();

  const progress = document.querySelector('#progreso-lectura');
  const article = document.body.dataset.tipo === 'article' ? document.querySelector('main .articulo') : null;
  const back = document.querySelector('[data-volver-arriba]');
  if (progress && article) progress.hidden = false;
  let scheduled = false;
  function updateScroll() {
    scheduled = false;
    if (back) back.hidden = scrollY < 600;
    if (!progress || !article) return;
    const rect = article.getBoundingClientRect();
    const length = rect.height - innerHeight;
    const fraction = length <= 0 ? (rect.bottom <= innerHeight ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / length));
    const value = Math.round(fraction * 100);
    progress.setAttribute('aria-valuenow', String(value));
    progress.setAttribute('aria-valuetext', `${value}% leído`);
    progress.querySelector('span').style.transform = `scaleX(${fraction})`;
  }
  function requestUpdate() {if (!scheduled) {scheduled = true;requestAnimationFrame(updateScroll);}}
  addEventListener('scroll', requestUpdate, {passive: true});
  addEventListener('resize', requestUpdate, {passive: true});
  if (article && 'ResizeObserver' in window) new ResizeObserver(requestUpdate).observe(article);
  back?.addEventListener('click', () => {
    window.scrollTo({top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    document.querySelector('.marca')?.focus({preventScroll: true});
  });
  updateScroll();
})();
