const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {compactRoomName, mergeDividedRooms, mergeSubjectBookings} = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../mobile/rooms.js'), 'utf8') + '\n({compactRoomName, mergeDividedRooms, mergeSubjectBookings})', {norm: value => String(value).toLowerCase(), isPhysicalClassroom: () => true});
const room = (name, areaName = 'Pilar - Edificio Olivo B') => ({name, areaName, full: areaName + ' - ' + name});
const halves = [room('Aula B1.1 (30)'), room('Aula B1.2 (30)')];
const booking = overrides => ({start: 1000, end: 2000, title: 'Física', faculty: 'FI', career: 'C04', description: '', ...overrides});
const entries = bookings => halves.map((room, index) => ({room, bookings: bookings?.[index] || []}));
test('short labels preserve identities and decimal room numbers', () => {
 for (const [name, expected] of [['Aula A 1 (50)', 'A1'], ['B 2', 'B2'], ['Aula C8.1 (30)', 'C8.1'], ['Aula R2 - Taller', 'R2'], ['Auditorio', 'Auditorio']]) assert.equal(compactRoomName(room(name)), expected);
});
test('two confirmed free halves merge, without changing original identities', () => {
 const original = entries(); const result = mergeDividedRooms(original, halves);
 assert.equal(result.length, 1); assert.equal(result[0].room.name, 'B1');
 assert.equal(result[0].members.length, 2); assert.equal(original[0].room.name, 'Aula B1.1 (30)');
});
test('a single available half must not imply the whole room is free', () => {
 const result = mergeDividedRooms(entries().slice(0, 1), halves);
 assert.equal(result.length, 1); assert.equal(compactRoomName(result[0].room), 'B1.1');
});
test('unknown third divisions and separate parent entries prevent merging', () => {
 for (const extra of [room('Aula B1.3'), room('Aula B1')]) assert.equal(mergeDividedRooms(entries(), [...halves, extra]).length, 2);
});
test('same labels across buildings or campuses do not merge', () => {
 const other = room('Aula B1.2', 'Rosario - Edificio Olivo B');
 assert.equal(mergeDividedRooms([{room: halves[0]}, {room: other}], [halves[0], other]).length, 2);
});
test('equal daily schedules merge regardless of original ordering', () => {
 const one = booking({}), two = booking({start: 3000, end: 4000});
 const result = mergeDividedRooms(entries([[one, two], [two, one]]), halves, true);
 assert.equal(result.length, 1); assert.equal(result[0].bookings.length, 2);
});
test('differences in time, class or details must remain visible', () => {
 for (const change of [{end: 2001}, {title: 'Álgebra'}, {description: 'Examen'}, {faculty: 'FCB'}, {career: 'C05'}]) {
  assert.equal(mergeDividedRooms(entries([[booking({})], [booking(change)]]), halves, true).length, 2);
 }
 assert.equal(mergeDividedRooms(entries([[booking({})], []]), halves, true).length, 2);
});
test('unconfirmed room mapping cannot be presented as a confirmed union', () => {
 const pair = entries(); pair[0].uncertain = true;
 assert.equal(mergeDividedRooms(pair, halves, true).length, 2);
});
test('a merged free room uses the earliest next reservation from either half', () => {
 const pair = entries(); pair[0].next = booking({start: 3000}); pair[1].next = booking({start: 2500});
 assert.equal(mergeDividedRooms(pair, halves)[0].next.start, 2500);
});

test('subject results unify identical classes on both halves, but keep distinct classes', () => {
 const pair = halves.map(room => booking({room: room.full}));
 const merged = mergeSubjectBookings(pair, halves);
 assert.equal(merged.length, 1); assert.equal(merged[0].displayRoom, 'B1');
 assert.equal(mergeSubjectBookings([pair[0], {...pair[1], title: 'Álgebra'}], halves).length, 2);
 assert.equal(pair[0].displayRoom, undefined);
});
