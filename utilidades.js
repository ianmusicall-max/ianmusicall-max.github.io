'use strict';
(() => {
  const favoritesKey = 'salud-favoritos-v1';
  const shoppingKey = 'salud-compras-v1';
  const safePath = value => typeof value === 'string' && /^\/(?!\/)[^\s\\?#]*\/$/.test(value);
  function read(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function write(key, value, status) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { if (status) status.textContent = 'No se pudo guardar en este navegador. Comprueba que el almacenamiento esté permitido.'; return false; }
  }
  const favorites = () => read(favoritesKey).filter(item => item && safePath(item.ruta) && typeof item.titulo === 'string').slice(0, 200);
  const shopping = () => read(shoppingKey).filter(item => item && safePath(item.ruta) && typeof item.texto === 'string' && item.texto.length <= 500).slice(0, 500);
  const element = (tag, text, className = '') => {const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node;};
  function statusAfter(button) {
    let status = button.parentNode.querySelector('.estado-utilidad');
    if (!status) { status = element('p', '', 'estado-utilidad'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); button.parentNode.append(status); }
    return status;
  }
  function updateSaveButtons() {
    const saved = new Set(favorites().map(item => item.ruta));
    document.querySelectorAll('[data-guardar-ruta]').forEach(button => {
      const active = saved.has(button.dataset.guardarRuta);
      button.setAttribute('aria-pressed', String(active)); button.textContent = active ? 'Guardado · quitar' : 'Guardar artículo';
    });
  }
  document.querySelectorAll('[data-guardar-ruta]').forEach(button => button.addEventListener('click', () => {
    const status = statusAfter(button), route = button.dataset.guardarRuta;
    if (!safePath(route)) return;
    const data = favorites();
    const exists = data.some(item => item.ruta === route);
    if (!exists && data.length >= 200) {status.textContent = 'Has llegado a 200 guardados. Quita alguno para añadir otro.'; return;}
    const next = exists ? data.filter(item => item.ruta !== route) : [{ruta: route, titulo: button.dataset.guardarTitulo.slice(0, 300)}, ...data];
    if (write(favoritesKey, next, status)) {updateSaveButtons(); status.textContent = exists ? 'Artículo quitado de tus guardados.' : 'Artículo guardado en este navegador.';}
  }));
  function renderFavorites() {
    const container = document.querySelector('#favoritos'); if (!container) return;
    container.replaceChildren();
    const data = favorites(), status = document.querySelector('#estado-favoritos');
    status.textContent = data.length ? `${data.length} artículos guardados` : 'Todavía no has guardado artículos. Usa «Guardar artículo» al final de cualquier publicación.';
    data.forEach(item => {
      const card = element('article', '', 'tarjeta-lista resultado');
      const title = element('h2', ''), link = element('a', item.titulo); link.href = item.ruta; title.append(link);
      const remove = element('button', 'Quitar de guardados', 'boton secundaria'); remove.type = 'button';
      remove.addEventListener('click', () => {if (write(favoritesKey, favorites().filter(entry => entry.ruta !== item.ruta), status)) {renderFavorites();updateSaveButtons();}});
      card.append(title, remove); container.append(card);
    });
  }
  document.querySelectorAll('.ficha-receta').forEach(recipe => {
    const list = recipe.querySelector('ul'); if (!list) return;
    const checkboxes = [];
    list.querySelectorAll('li').forEach(item => {
      const text = item.textContent.trim();
      const label = element('label', '', 'ingrediente-compra'), checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = true;
      label.append(checkbox, element('span', text)); item.replaceChildren(label); checkboxes.push({checkbox, text});
    });
    const hint = element('p', 'Selecciona los ingredientes que necesitas comprar.', 'meta'); list.before(hint);
    const add = element('button', 'Añadir a mi lista de compras', 'boton'); add.type = 'button';
    const link = element('a', 'Ver mi lista de compras'); link.href = '/compras/';
    const actions = element('div', '', 'acciones-articulo'); actions.append(add, link); recipe.append(actions);
    add.addEventListener('click', () => {
      const status = statusAfter(add), selected = checkboxes.filter(item => item.checkbox.checked);
      if (!selected.length) {status.textContent = 'Selecciona al menos un ingrediente.'; return;}
      const data = shopping(), route = location.pathname, title = recipe.querySelector('h2')?.textContent || document.querySelector('h1').textContent;
      selected.forEach(item => {if (!data.some(entry => entry.ruta === route && entry.receta === title && entry.texto === item.text)) data.push({ruta: route, receta: title.slice(0, 300), texto: item.text.slice(0, 500), comprado: false});});
      if (data.length > 500) {status.textContent = 'Tu lista llegó al límite de 500 ingredientes. Quita algunos antes de añadir más.';return;}
      if (write(shoppingKey, data, status)) status.textContent = 'Ingredientes añadidos. Las cantidades se conservan como aparecen en cada receta.';
    });
  });
  function renderShopping() {
    const list = document.querySelector('#lista-compras'); if (!list) return;
    const data = shopping(), status = document.querySelector('#estado-compras'); list.replaceChildren();
    const pending = data.filter(item => !item.comprado).length;
    status.textContent = data.length ? `${pending} ingredientes por comprar · ${data.length - pending} comprados` : 'Tu lista está vacía. Añade ingredientes desde una receta.';
    data.forEach((item, index) => {
      const row = element('li', '', item.comprado ? 'comprado' : '');
      const label = element('label', '', 'ingrediente-compra'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(item.comprado);
      checkbox.addEventListener('change', () => {const current = shopping(); if (!current[index]) return; current[index].comprado = checkbox.checked; if (write(shoppingKey, current, status)) renderShopping(); else checkbox.checked = !checkbox.checked;});
      label.append(checkbox, element('span', item.texto));
      const source = element('a', item.receta || 'Ver receta', 'meta'); source.href = item.ruta;
      const remove = element('button', 'Quitar', 'boton secundaria'); remove.type = 'button'; remove.setAttribute('aria-label', 'Quitar ' + item.texto);
      remove.addEventListener('click', () => {if (write(shoppingKey, shopping().filter((_, i) => i !== index), status)) renderShopping();});
      row.append(label, source, remove); list.append(row);
    });
  }
  async function copy(text, status, fallback) {
    try {if (!navigator.clipboard) throw new Error('clipboard'); await navigator.clipboard.writeText(text); return true;}
    catch {if (fallback) {fallback.hidden = false; fallback.value = text; fallback.focus(); fallback.select();} status.textContent = 'No se pudo copiar automáticamente. Selecciona y copia el texto que aparece abajo.'; return false;}
  }
  document.querySelector('[data-copiar-compras]')?.addEventListener('click', async () => {
    const pending = shopping().filter(item => !item.comprado), status = document.querySelector('#estado-compras');
    if (!pending.length) {status.textContent = 'No quedan ingredientes pendientes para copiar.';return;}
    const text = 'Lista de compras\n\n' + pending.map(item => `• ${item.texto} — ${item.receta}`).join('\n');
    if (await copy(text, status, document.querySelector('#copiar-manual'))) status.textContent = 'Lista de ingredientes pendientes copiada.';
  });
  document.querySelector('[data-limpiar-compras]')?.addEventListener('click', () => {
    const status = document.querySelector('#estado-compras'); if (write(shoppingKey, shopping().filter(item => !item.comprado), status)) renderShopping();
  });
  const compare = document.querySelector('#comparador');
  if (compare) {
    const nutrient = document.querySelector('#nutriente'), left = document.querySelector('#alimento-a'), right = document.querySelector('#alimento-b'), status = document.querySelector('#estado-comparador'), result = document.querySelector('#resultado-comparador');
    let foods = [];
    const option = (value, label) => {const node = element('option', label); node.value = value;return node;};
    const number = value => value > 0 && value < 0.0001 ? '<0,0001' : new Intl.NumberFormat('es', {maximumFractionDigits: 4, minimumFractionDigits: 0}).format(value);
    function renderComparison() {
      const a = foods[Number(left.value)], b = foods[Number(right.value)];result.replaceChildren();if (!a || !b) return;
      status.textContent = `${a.nutriente}: misma cantidad de alimento, 100 g`;
      const table = element('table', '', 'tabla-comparador'), caption = element('caption', `${a.nutriente} por 100 g`), head = document.createElement('thead'), header = document.createElement('tr');
      ['Alimento y preparación', a.nutriente, 'Porción original'].forEach(text => {const cell = element('th', text);cell.scope = 'col';header.append(cell);});head.append(header);
      const body = document.createElement('tbody');
      [a, b].forEach(food => {const row = document.createElement('tr');[food.nombre, `${number(food.por100)} ${food.unidad}`, `${food.porcion}: ${food.cantidad.replace('.', ',')} ${food.unidad}`].forEach(text => row.append(element('td', text)));body.append(row);});
      table.append(caption, head, body); result.append(table);
      [a, b].forEach(food => {
        const source = element('section', '', 'fuente-comparador');source.append(element('h2', food.nombre), element('p', 'Fuente: ' + food.fuente));
        if (food.advertencia) source.append(element('p', 'Nota de la fuente: ' + food.advertencia, 'ojo'));
        if (safePath(food.articulo)) {const link = element('a', 'Leer el artículo de origen');link.href = food.articulo;source.append(link);}
        result.append(source);
      });
    }
    function chooseFoods() {
      left.replaceChildren();right.replaceChildren();
      foods.forEach((food, index) => {if (food.nutriente === nutrient.value) [left, right].forEach(select => select.append(option(String(index), `${food.nombre} · ${food.porcion}`)));});
      const different = [...right.options].find(opt => foods[Number(opt.value)].nombre !== foods[Number(left.value)]?.nombre);
      if (different) right.value = different.value;
      renderComparison();
    }
    compare.addEventListener('submit', event => event.preventDefault());nutrient.addEventListener('change', chooseFoods);left.addEventListener('change', renderComparison);right.addEventListener('change', renderComparison);
    fetch('/comparador/alimentos.json').then(response => {if (!response.ok) throw new Error('datos');return response.json();}).then(data => {
      foods = data.filter(food => Number.isFinite(food.por100) && typeof food.nombre === 'string');
      [...new Set(foods.map(food => food.nutriente))].forEach(name => nutrient.append(option(name, name)));
      if (!foods.length) {status.textContent = 'Todavía no hay suficientes alimentos con porciones verificables en gramos. Explora los artículos mientras ampliamos la selección.';return;} chooseFoods();
    }).catch(() => {status.textContent = 'No se pudieron cargar los alimentos. Recarga la página para intentarlo de nuevo.';});
  }
  const report = document.querySelector('#form-reporte');
  if (report) {
    const query = new URLSearchParams(location.search), route = query.get('articulo'), title = (query.get('titulo') || 'Un artículo del sitio').slice(0, 300);
    const article = document.querySelector('#reporte-articulo'); article.value = new URL(safePath(route) ? route : '/', location.origin).href;
    report.addEventListener('submit', async event => {
      event.preventDefault(); if (!report.reportValidity()) return;
      const text = document.querySelector('#reporte-texto').value.trim(); const status = document.querySelector('#estado-reporte');
      if (text.length < 10) {status.textContent = 'Describe el problema con al menos 10 caracteres.';return;}
      const subject = 'Reporte: ' + title, message = `${subject}\n${article.value}\n\nTipo: ${document.querySelector('#reporte-tipo').value}\n\n${text}`;
      const email = report.dataset.correo;
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        status.textContent = 'El reporte está preparado en tu aplicación de correo. Revisa el mensaje y pulsa Enviar allí.';
      } else {
        const copied = await copy(message, status, document.querySelector('#reporte-copiar'));
        document.querySelector('#reporte-contacto').hidden = false;
        if (copied) status.textContent = 'Reporte copiado. Abre contacto y pega el mensaje para enviarlo; aún no se ha enviado.';
      }
    });
  }
  addEventListener('storage', event => {if (event.key === favoritesKey || event.key === null) {renderFavorites();updateSaveButtons();}if (event.key === shoppingKey || event.key === null) renderShopping();});
  updateSaveButtons();renderFavorites();renderShopping();
})();
