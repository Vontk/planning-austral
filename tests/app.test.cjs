const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function app() {
  class Element {
    constructor(value='') {this.value=value;this.children=[];this.attributes={};this.className='';this.textContent='';this.handlers={};}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(k,v){this.handlers[k]=v;}
    append(...items){this.children.push(...items);}
    replaceChildren(){this.children=[];}
    focus(){}
  }
  const elements=new Map();
  const defaults={from:'12:00',to:'14:00',hours:'2',campus:'Pilar',building:'default',q:''};
  const document={getElementById(id){if(!elements.has(id))elements.set(id,new Element(defaults[id]||''));return elements.get(id);},documentElement:{dataset:{}},createElement:()=>new Element(),createTextNode:text=>text,visibilityState:'visible',addEventListener(){}};
  const ctx={document,location:{protocol:'file:'},localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},Intl,Date,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,addEventListener(){},console};
  vm.createContext(ctx);
  vm.runInContext(script+`;globalThis.api={interval,relativeDate,score,csv,stamp,overlaps,scope,render,updateRange,load,setTheme,selectTab,availableRooms,setData:d=>data=d,getData:()=>data,stop:()=>{clearTimeout(refreshTimer);loadController?.abort();}};`,ctx);
  return {ctx,api:ctx.api,el:id=>document.getElementById(id)};
}
test('subject number is not confused with commission number',()=>{const {api}=app();assert.ok(Number.isFinite(api.score('FI - Análisis Matemático II Com B','analisis 2')));assert.ok(Number.isFinite(api.score('ÁLGEBRA III','algebra 3')));assert.ok(Number.isFinite(api.score('COM - Teoría II','teoria 2')));assert.ok(Number.isFinite(api.score('Análisis II','anlisis 2')));assert.equal(api.score('Análisis III Com 2','analisis 2'),Infinity);assert.ok(Number.isFinite(api.score('Análisis III Com 2','analisis 3 com 2')));});
test('decimal hours, comma, midnight, exact midnight and invalid values',()=>{const {api}=app();assert.equal(api.interval('2026-12-31','23:00','1,5').endDate,'2027-01-01');assert.equal(api.interval('2026-12-31','23:00','1,5').to,'00:30');assert.equal(api.interval('2026-10-13','12:00','.5').to,'12:30');assert.equal(api.interval('2026-10-13','12:00','24').to,'12:00');for(const h of ['','-1','0','25','NaN','1e2','0.001'])assert.equal(api.interval('2026-10-13','12:00',h),null);assert.equal(api.interval('2026-10-13','','2'),null);});
test('report scope includes following day only when interval overlaps it',()=>{const {api,el}=app();el('date').value='2026-12-31';el('from').value='23:00';el('hours').value='1';assert.equal(api.scope().endDate,'2026-12-31');el('hours').value='1.5';assert.equal(api.scope().endDate,'2027-01-01');});
test('Buenos Aires filter matches the real area names',()=>{assert.match(html,/<option value="Bs\. As\.">Buenos Aires<\/option>/);});
test('booking endpoints are non-overlapping; multi-day booking conflicts',()=>{const {api}=app();assert.equal(api.overlaps({start:10,end:20},20,30),false);assert.equal(api.overlaps({start:30,end:40},20,30),false);assert.equal(api.overlaps({start:10,end:40},20,30),true);});
test('CSV BOM, quoted commas, escaped quotes and multiline descriptions',()=>{const {api}=app();const r=api.csv('\uFEFFa,b\r\n"A, B","line 1\nline ""2"""');assert.equal(r[0][0],'a');assert.equal(r[1][0],'A, B');assert.equal(r[1][1],'line 1\nline "2"');assert.throws(()=>api.csv('"broken'));assert.throws(()=>api.stamp('Tuesday 31 February 2026 09:00:00'));});
test('Argentina calendar handles year boundary and device timezone',()=>{const {api}=app();assert.equal(api.relativeDate(0,new Date('2027-01-01T01:00:00Z')),'2026-12-31');assert.equal(api.relativeDate(1,new Date('2027-01-01T01:00:00Z')),'2027-01-01');});
test('light theme works with unavailable localStorage',()=>{const {api,ctx,el}=app();api.setTheme('light');assert.equal(ctx.document.documentElement.dataset.theme,'light');assert.equal(el('theme').textContent,'Tema oscuro');assert.ok(decodeURIComponent(el('favicon').href).includes('#246b93'));});
test('empty room card has no redundant status or range and non-Pilar is not filtered to Pilar buildings',()=>{const {api,el}=app();el('date').value='2026-10-13';el('campus').value='Bs. As.';const room={name:'Aula 1',full:'Bs. As. - Presencial Cerrito 1 - Aula 1',areaName:'Bs. As. - Presencial Cerrito 1',area:'40',id:'123'};api.setData({key:api.scope().key,date:'2026-10-13',rooms:[room],bookings:[]});api.selectTab('rooms');assert.match(el('count').textContent,/1 aulas vacías.*desde 12:00 hasta 14:00/);const card=el('results').children[0];assert.ok(!card.children.some(x=>x.className==='badge'));assert.ok(!card.children.some(x=>x.textContent==='12:00 — 14:00'));});
test('rapid selection changes discard old responses and errors',async()=>{const {api,ctx,el}=app();ctx.location.protocol='http:';ctx.DOMParser=class {parseFromString(){return {querySelectorAll(sel){return sel==='#dwm_areas option'?[{value:'41',textContent:'Pilar - Ed Olivo - Modulo A'}]:[{getAttribute:()=> 'week.php?area=41&room=1',textContent:'Aula A1 (20)'}];}};}};const requests=[];ctx.fetch=(url,opts)=>new Promise((resolve,reject)=>requests.push({url,resolve,reject}));el('date').value='2026-10-13';const old=api.load();el('date').value='2026-10-14';const newer=api.load();const report='"Area - Room","Brief Description","Start Time - End Time"\n';requests[2].resolve({ok:true,text:async()=>report});requests[3].resolve({ok:true,text:async()=>'grid'});await new Promise(r=>setImmediate(r));requests[4].resolve({ok:true,text:async()=>'grid'});await newer;requests[0].reject(Error('old failure'));requests[1].resolve({ok:true,text:async()=>'grid'});await old;assert.equal(api.getData().date,'2026-10-14');assert.notEqual(el('status').className,'error');api.stop();});

test('labs, workshops and virtual rooms are never offered as classrooms',()=>{const {api,el}=app();el('date').value='2026-10-13';const names=['Aula A1','Aula R4 - LAB Ingenieria','Aula C5 Lab Biolab','Aula R7 - Taller II','Aula virtual online'];const rooms=names.map((name,i)=>({name,full:'Pilar - Edificio Roble - '+name,areaName:'Pilar - Edificio Roble',area:'65',id:String(i)}));api.setData({key:api.scope().key,date:'2026-10-13',rooms,bookings:[]});api.selectTab('rooms');assert.match(el('count').textContent,/1 aulas vacías de 1 aulas/);});
