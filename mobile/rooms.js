// Presentation is separate from the original room identities used for availability.
function compactRoomName(room) {
  const name = String(room.name || '').trim();
  const match = name.match(/^(?:aula\s+)?([a-z]{1,3})\s*(\d+(?:[.,]\d+)?)\b/i);
  return match ? match[1].toUpperCase() + match[2].replace(',', '.') : name;
}
function divisionKey(room) {
  const match = compactRoomName(room).match(/^([A-Z]+\d+)\.([12])$/);
  return match ? {base: match[1], part: match[2], key: `${room.areaName}|${match[1]}`} : null;
}
function scheduleSignature(bookings) {
  return JSON.stringify(bookings.map(b => [b.start, b.end, b.title, b.faculty || '', b.career || '', b.description || ''])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}
function mergeDividedRooms(entries, allRooms, sameSchedule = false) {
  const inventory = new Map();
  for (const room of allRooms) {
    const code = compactRoomName(room), base = code.split('.')[0], key = `${room.areaName}|${base}`;
    if (!inventory.has(key)) inventory.set(key, []);
    inventory.get(key).push(code);
  }
  const pairs = new Map();
  entries.forEach(entry => {
    const split = divisionKey(entry.room);
    if (split) {
      if (!pairs.has(split.key)) pairs.set(split.key, []);
      pairs.get(split.key).push(entry);
    }
  });
  const merged = new Map(), skipped = new Set();
  for (const [key, pair] of pairs) {
    const codes = inventory.get(key) || [];
    if (pair.length !== 2 || codes.length !== 2 || new Set(codes).size !== 2) continue;
    const parts = pair.map(entry => divisionKey(entry.room).part).sort().join('');
    if (parts !== '12' || pair.some(entry => entry.uncertain)) continue;
    if (sameSchedule && scheduleSignature(pair[0].bookings) !== scheduleSignature(pair[1].bookings)) continue;
    const [first, second] = pair;
    const next = [first.next, second.next].filter(Boolean).sort((a, b) => a.start - b.start)[0];
    merged.set(first, {...first, room: {...first.room, name: divisionKey(first.room).base},
      members: pair.map(entry => entry.room), next});
    skipped.add(second);
  }
  return entries.filter(entry => !skipped.has(entry)).map(entry => merged.get(entry) || entry);
}
function mergeSubjectBookings(bookings, rooms) {
  const groups = new Map(), result = [];
  const inventory = rooms.filter(isPhysicalClassroom);
  const byName = new Map(inventory.map(room => [norm(room.full), room]));
  bookings.forEach((booking, index) => {
    const room = byName.get(norm(booking.room));
    if (!room || !divisionKey(room)) { result.push({booking, index}); return; }
    const key = scheduleSignature([booking]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({room, bookings: [booking], booking, index});
  });
  for (const entries of groups.values()) {
    if (entries.length === 1) { result.push({index: entries[0].index, booking: entries[0].booking}); continue; }
    for (const entry of mergeDividedRooms(entries, inventory, true)) {
      result.push({index: entry.index, booking: entry.members ? {...entry.booking, displayRoom: compactRoomName(entry.room)} : entry.booking});
    }
  }
  return result.sort((a, b) => a.index - b.index).map(entry => entry.booking);
}
function shortBookingRoom(booking, rooms) {
  if (booking.displayRoom) return booking.displayRoom;
  const room = rooms.find(r => norm(r.full) === norm(booking.room));
  return compactRoomName(room || {name: booking.room.split(' - ').at(-1)});
}
function roomLocation(room) {
  const location = room.areaName.replace(/^.*?\s-\s/, '').replace(/Edificio\s+|M[oó]dulo\s+/gi, '').trim();
  return $('campus').value ? location : `${room.areaName.split(' - ')[0]} · ${location}`;
}
function renderMobileRooms() {
  $('results').replaceChildren();
  if (!data || data.key !== scope().key) {
    $('count').textContent = failedKey === scope().key ? 'Sin datos' : 'Cargando…';
    return;
  }
  const range = mode === 'rooms' ? currentInterval() : {
    start: Date.parse(data.date + 'T00:00:00-03:00'), end: Date.parse(data.date + 'T00:00:00-03:00') + 86400000};
  if (!range) { $('count').textContent = 'Revisá el horario'; return; }
  const inventory = data.rooms.filter(isPhysicalClassroom);
  const {byRoom, unmatched} = availableRooms(data.rooms, data.bookings, range);
  let entries = inventory.map(room => {
    const bookings = (byRoom.get(norm(room.full)) || []).filter(b => overlaps(b, range.start, range.end)).sort((a, b) => a.start - b.start);
    const next = (byRoom.get(norm(room.full)) || []).filter(b => b.start >= range.end).sort((a, b) => a.start - b.start)[0];
    return {room, bookings, next, uncertain: unmatched.some(b => norm(b.room).startsWith(norm(room.areaName) + ' '))};
  });
  if (mode === 'rooms') {
    entries = entries.filter(({room, bookings, uncertain}) => !uncertain && !bookings.length &&
      ($('campus').value !== 'Pilar' || $('building').value === 'all' ||
        (roomCode(room) && /olivo.*modulo [ab]\b|edificio roble|edificio ceibo/.test(norm(room.areaName)))));
    entries = mergeDividedRooms(entries, inventory);
    $('count').textContent = `${entries.length} ${entries.length === 1 ? 'aula libre' : 'aulas libres'}`;
  } else {
    const query = $('roomQuery').value.trim();
    if (!query) { $('count').textContent = ''; return; }
    entries = mergeDividedRooms(entries, inventory, true).filter(entry => {
      const compact = query.replace(/\s+/g, '').toUpperCase();
      return (entry.members || [entry.room]).some(room => /^[A-Z]+\d+(?:\.\d+)?$/.test(compact)
        ? compactRoomName(room) === compact || (!compact.includes('.') && compactRoomName(room).split('.')[0] === compact)
        : Number.isFinite(roomSearchScore(room, query)));
    });
    $('count').textContent = `${entries.length} ${entries.length === 1 ? 'aula' : 'aulas'}`;
  }
  entries.sort((a, b) => a.room.areaName.localeCompare(b.room.areaName, 'es') ||
    compactRoomName(a.room).localeCompare(compactRoomName(b.room), 'es', {numeric: true}));
  for (const entry of pageResults(entries)) {
    const {room, bookings, next, uncertain, members} = entry;
    const title = compactRoomName(room);
    const el = card(title, mode === 'rooms' && next ? `Próxima ${clock(next.start)}` : null, [roomLocation(room)], null);
    el.classList.toggle('free-room', mode === 'rooms');
    if (members) {
      el.dataset.members = members.map(compactRoomName).join(',');
      el.setAttribute('aria-label', `${title}: ${members.map(compactRoomName).join(' y ')}`);
    }
    if (mode === 'roomSchedule') {
      if (!bookings.length) {
        const state = document.createElement('p');
        state.textContent = uncertain ? 'Disponibilidad sin confirmar' : 'Libre todo el día'; el.append(state);
      }
      for (const booking of bookings) {
        const item = document.createElement('section'); item.className = 'schedule-booking';
        const time = document.createElement('span'); time.className = 'badge'; time.textContent = bookingLabel(booking);
        const name = document.createElement('h4'); name.textContent = booking.title;
        item.append(time, name);
        const label = academicLabel(booking);
        if (label) { const p = document.createElement('p'); p.className = 'academic-label'; p.textContent = label; item.append(p); }
        const description = meaningfulDescription(booking.description, booking.title);
        if (description) {
          const details = document.createElement('details'), summary = document.createElement('summary');
          summary.textContent = 'Detalle'; details.append(summary, document.createTextNode(description)); item.append(details);
        }
        el.append(item);
      }
    }
    $('results').append(el);
  }
  if (!entries.length) {
    const empty = document.createElement('p'); empty.className = 'empty';
    empty.textContent = mode === 'rooms' ? 'Sin aulas libres' : 'Sin coincidencias'; $('results').append(empty);
  }
}
