// Android-specific interaction layer. All matching and availability rules are shared with desktop.
let visibleLimit = 30;
const storageKey = 'campus-android-v1';
const persistentFields = ['campus', 'q', 'roomQuery', 'from', 'hours', 'building'];
function savePreferences() {
  try {
    const fields = Object.fromEntries(persistentFields.map(id => [id, $(id).value]));
    localStorage.setItem(storageKey, JSON.stringify({...fields, mode, date: $('date').value, savedDay: relativeDate()}));
  } catch {}
}
try {
  const preferences = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const id of persistentFields) if (typeof preferences[id] === 'string') $(id).value = preferences[id];
  if (preferences.savedDay === relativeDate() && /^\d{4}-\d{2}-\d{2}$/.test(preferences.date)) $('date').value = preferences.date;
  if (tabs.includes(preferences.mode)) mode = preferences.mode;
  if (!preferences.from) $('from').value = clock(Date.now());
} catch { $('from').value = clock(Date.now()); }
$('building').disabled = $('campus').value !== 'Pilar';
if ($('building').disabled) $('building').value = 'all';

function syncChrome() {
  const busy = Boolean(pendingKey), failed = failedKey === scope().key && !data;
  $('loading').hidden = !busy || Boolean(data);
  $('errorState').hidden = !failed;
  $('results').setAttribute('aria-busy', String(busy));
  $('refresh').disabled = busy;
  $('refresh').textContent = busy ? 'Cargando…' : 'Actualizar';
  for (const [id, days] of [['today', 0], ['tomorrow', 1]]) $(id).setAttribute('aria-pressed', String($('date').value === relativeDate(days)));
  for (const button of document.querySelectorAll('[data-hours]')) button.setAttribute('aria-pressed', String(Number(button.dataset.hours) === Number($('hours').value.replace(',', '.'))));
  $('clearSubject').hidden = !$('q').value;
  $('clearRoom').hidden = !$('roomQuery').value;
  const filterCount = ['faculty', 'career'].filter(id => $(id).value).length;
  $('filterCount').textContent = filterCount ? `(${filterCount})` : '';
}
const renderPlanning = render;
render = function() {
  renderPlanning();
  $('count').textContent = $('count').textContent.replace('1 reservas encontradas', '1 reserva encontrada').replace('aulas vacías', 'aulas libres');
  const cards = [...$('results').querySelectorAll(':scope > .card')];
  cards.forEach((element, index) => {
    element.hidden = index >= visibleLimit;
    if (mode === 'rooms') {
      const name = element.querySelector('h3').textContent;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'schedule-action'; button.textContent = 'Ver horarios del aula →';
      button.onclick = () => {
        $('roomQuery').value = roomCode({name}) || name;
        selectMobileTab('roomSchedule');
      };
      element.append(button);
    }
  });
  $('more').hidden = cards.length <= visibleLimit;
  if (!$('more').hidden) $('more').textContent = `Mostrar más · ${Math.min(visibleLimit, cards.length)} de ${cards.length}`;
  const empty = $('results').querySelector('.empty');
  if (empty) empty.textContent = mode === 'subjects' ? 'No hay coincidencias. Probá con menos palabras, quitá filtros o elegí otra fecha.' : mode === 'roomSchedule' ? 'No encontramos esa aula. Probá con el código (R2, C8.1) o el nombre del edificio.' : 'No hay aulas confirmadas como libres en ese intervalo. Probá otro horario o edificio.';
  syncChrome();
};
function selectMobileTab(tab) {
  visibleLimit = 30;
  document.activeElement?.blur();
  selectTab(tab);
  document.querySelector('.search-panel').scrollIntoView({block: 'start'});
  savePreferences();
}
for (const tab of tabs) $(tab).onclick = () => selectMobileTab(tab);
$('refresh').onclick = $('retry').onclick = () => load();
$('seeRooms').onclick = () => { document.activeElement?.blur(); document.querySelector('.results-heading').scrollIntoView({block:'start'}); };
$('more').onclick = () => { visibleLimit += 30; render(); };
$('top').onclick = () => window.scrollTo({top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
addEventListener('scroll', () => { $('top').hidden = scrollY < 500; }, {passive: true});
for (const button of document.querySelectorAll('[data-hours]')) button.onclick = () => {
  $('hours').value = button.dataset.hours; updateRange(); syncChrome(); savePreferences();
};
for (const [buttonId, inputId] of [['clearSubject', 'q'], ['clearRoom', 'roomQuery']]) $(buttonId).onclick = () => {
  $(inputId).value = ''; visibleLimit = 30; render(); savePreferences(); $(inputId).focus();
};
$('resetFilters').onclick = () => {
  $('faculty').value = ''; $('career').value = ''; updateAcademicFilters(); visibleLimit = 30; render();
};
for (const id of [...persistentFields, 'date', 'to', 'faculty', 'career']) {
  $(id).addEventListener('input', () => { visibleLimit = 30; render(); savePreferences(); });
  $(id).addEventListener('change', () => { visibleLimit = 30; render(); savePreferences(); });
}
for (const id of ['today', 'tomorrow', 'now']) $(id).addEventListener('click', () => { syncChrome(); savePreferences(); });
for (const id of ['q', 'roomQuery']) $(id).addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $(id).blur(); document.querySelector('.results-heading').scrollIntoView({block:'start'}); } });
// Native lifecycle callbacks prevent polling while the application is in the background.
window.campusPause = () => { savePreferences(); clearTimeout(refreshTimer); loadController?.abort(); pendingKey = ''; syncChrome(); };
window.campusResume = () => { if (!pendingKey && (!data || Date.now() - lastLoadedAt >= 300000)) load(); else scheduleRefresh(); };
addEventListener('pagehide', () => { savePreferences(); clearTimeout(refreshTimer); loadController?.abort(); });
new MutationObserver(syncChrome).observe($('status'), {childList:true, characterData:true, attributes:true, subtree:true});
syncEnd(); selectTab(mode); load();
