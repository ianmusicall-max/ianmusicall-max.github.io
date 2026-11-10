'use strict';
(() => {
  document.querySelectorAll('[data-imprimir]').forEach(button => {
    button.addEventListener('click', () => window.print());
  });
  const input = document.querySelector('#consulta');
  if (!input) return;
  const form = input.closest('form');
  const filter = document.querySelector('#filtro-tema');
  const status = document.querySelector('#estado-busqueda');
  const container = document.querySelector('#resultados');
  const more = document.querySelector('#mas-resultados');
  const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let index = null, matches = [], shown = 0;
  const pageSize = 24;
  input.value = (new URLSearchParams(location.search).get('q') || '').slice(0, 120);
  function render() {
    matches.slice(shown, shown + pageSize).forEach(item => {
      const card = document.createElement('article');
      card.className = 'tarjeta-lista resultado';
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = item.ruta;
      link.textContent = item.titulo;
      title.append(link);
      const description = document.createElement('p');
      description.textContent = item.descripcion;
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = `${item.categoria} · ${item.minutos} min de lectura · ${item.autor}`;
      card.append(title, description, meta);
      container.append(card);
    });
    shown = Math.min(matches.length, shown + pageSize);
    more.hidden = shown >= matches.length;
  }
  function search(updateUrl = false) {
    if (!index) return;
    const query = input.value.trim().slice(0, 120);
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    container.replaceChildren();
    shown = 0;
    more.hidden = true;
    if (updateUrl) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    }
    if (!terms.length && !filter.value) {
      status.textContent = 'Escribe una palabra para empezar o elige un tema.';
      return;
    }
    matches = index.filter(item => (!filter.value || item.seccion === filter.value) && terms.every(term => item.buscar.includes(term)));
    status.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'resultado' : 'resultados'}` : 'No encontramos resultados. Prueba con otro alimento o tema.';
    render();
  }
  form.addEventListener('submit', event => {event.preventDefault(); search(true);});
  input.addEventListener('input', () => search());
  filter.addEventListener('change', () => search());
  more.addEventListener('click', render);
  status.textContent = 'Cargando el buscador…';
  fetch('/buscar/indice.json').then(response => {
    if (!response.ok) throw new Error('indice');
    return response.json();
  }).then(data => {index = data; search();}).catch(() => {
    status.textContent = 'No se pudo cargar el buscador. Recarga la página o explora las categorías del menú.';
  });
})();
