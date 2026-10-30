const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'android/app/src/main/assets/index.html'), 'utf8');
const origin = 'https://appassets.androidplatform.net';
let fail = false;
const date = '2026-10-15';
const headings = ['Area - Room','Brief Description','Start Time - End Time','Full Description','Unidad','','Orden'];
const row = values => values.map(x => '"'+String(x).replaceAll('"','""')+'"').join(',');
const bookings = Array.from({length:45}, (_,i) => row(['Pilar - Edificio Roble - Aula R2', i===0?'FI - Análisis Matemático II':'Materia '+i, 'Thursday 15 October 2026 09:00:00 - Thursday 15 October 2026 11:00:00', '', 'FI', 'C04 - INFORMÁTICA', '']));
const csv = row(headings)+'\n'+bookings.join('\n');
const grid = '<select id="dwm_areas"><option value="65">Pilar - Edificio Roble</option></select><table><thead><tr><td><a href="week.php?area=65&room=1">Aula R2 (30)</a></td><td><a href="week.php?area=65&room=2">Aula R3 (30)</a></td></tr></thead></table>';
(async()=>{
 const browser=await chromium.launch({headless:true, ...(process.env.CAMPUS_CHROME ? {executablePath:process.env.CAMPUS_CHROME} : {}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'dark',locale:'es-AR'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/') return route.fulfill({contentType:'text/html',body:html});
  if(url.pathname==='/api/planning') {
   await new Promise(r=>setTimeout(r,30));
   return route.fulfill({status:fail?502:200,contentType:'text/plain',body:url.searchParams.get('path').startsWith('report.php')?csv:grid});
  }
  return route.fulfill({status:404,body:''});
 });
 await page.goto(origin);
 await page.waitForFunction(()=>Boolean(customElements.get('md-filled-button')));
 assert.equal(await page.locator('#seeRooms').evaluate(element=>Boolean(element.shadowRoot)),true,'Official Material button is initialized');
 for (const id of ['q','date','campus','navigation','subjects']) assert.equal(await page.locator('#'+id).evaluate(element=>Boolean(element.shadowRoot)),true,'Official Material control: '+id);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--background').trim()),'#0e0e0e');
 await page.locator('#date input').fill(date);
 await page.locator('#date input').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 assert.match(await page.locator('#count').innerText(),/45 reservas/);
 assert.equal(await page.locator('.card:visible').count(),30);
 assert.equal(await page.locator('.card').count(),30,'Pagination bounds DOM allocation');
 await page.locator('#more').click();assert.equal(await page.locator('.card:visible').count(),45);
 await page.locator('#q input').fill('analisis 2');
 assert.equal(await page.locator('.card:visible').count(),1);
 assert.equal(await page.locator('#more').isVisible(),false,'Pagination resets after search');
 await page.locator('#clearSubject').click();assert.equal(await page.locator('#q input').inputValue(),'');
 await page.locator('#filters summary').click();
 await page.locator('#facultySearch').click();
 await page.locator('#facultyOptions md-text-button').filter({hasText:'FI',exact:true}).click();
 assert.match(await page.locator('#filterCount').innerText(),/1/);
 await page.locator('#resetFilters').click();assert.equal(await page.locator('#faculty').inputValue(),'');
 await page.locator('#filters summary').click();
 await page.locator('#q input').fill('analisis 2');
 fs.mkdirSync(path.join(root,'docs/android'),{recursive:true});
 await page.waitForFunction(()=>[...document.querySelectorAll('md-outlined-text-field,md-filled-text-field')]
  .filter(e=>e.getBoundingClientRect().width && e.value)
  .every(e=>getComputedStyle(e.shadowRoot.querySelector('.field').shadowRoot.querySelector('.content')).opacity==='1'));
 await page.screenshot({path:path.join(root,'docs/android/materias.png'),fullPage:true});
 for(const width of [320,360,412,768]) {
  await page.setViewportSize({width,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow at '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('#rooms').click();
 await page.locator('#from input').fill('12:00');await page.locator('#from input').dispatchEvent('input');
 await page.locator('[data-hours="1"]').click();
 assert.equal(await page.locator('#to input').inputValue(),'13:00');
 assert.match(await page.locator('#count').innerText(),/2 aulas/);
 await page.waitForFunction(()=>[...document.querySelectorAll('md-outlined-text-field,md-filled-text-field')]
  .filter(e=>e.getBoundingClientRect().width && e.value)
  .every(e=>getComputedStyle(e.shadowRoot.querySelector('.field').shadowRoot.querySelector('.content')).opacity==='1'));
 await page.screenshot({path:path.join(root,'docs/android/libres.png'),fullPage:true});
 await page.locator('.schedule-action').first().click();
 assert.equal(await page.locator('#roomQuery input').inputValue(),'R2');
 assert.equal(await page.locator('#roomSchedule button').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('.schedule-booking').count(),45);
 await page.locator('#roomQuery input').fill('R3');
 assert.match(await page.locator('#results').innerText(),/Sin reservas registradas/);
 await page.locator('#roomQuery input').fill('R2');
 await page.locator('#theme').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.waitForFunction(()=>[...document.querySelectorAll('md-outlined-text-field,md-filled-text-field')]
  .filter(e=>e.getBoundingClientRect().width && e.value)
  .every(e=>getComputedStyle(e.shadowRoot.querySelector('.field').shadowRoot.querySelector('.content')).opacity==='1'));
 await page.screenshot({path:path.join(root,'docs/android/aula-claro.png'),fullPage:false});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 assert.equal(await page.locator('#roomQuery input').inputValue(),'R2');
 assert.equal(await page.locator('#roomSchedule button').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#rooms').click();
 await page.locator('#from input').fill('23:30');await page.locator('#from input').dispatchEvent('input');
 await page.locator('[data-hours="2"]').click();
 assert.equal(await page.locator('#to input').inputValue(),'01:30');
 assert.match(await page.locator('#intervalHint').innerText(),/día siguiente/);
 await page.locator('#hours input').fill('0');assert.equal(await page.locator('#hours input').getAttribute('aria-invalid'),'true');
 await page.locator('[data-hours="1"]').click();
 await page.locator('#subjects').click();
 await page.addStyleTag({content:':root{font-size:28px;--md-outlined-text-field-input-text-size:24px;--md-filled-text-field-input-text-size:24px;--md-filled-select-text-field-input-text-size:24px;--md-navigation-bar-label-text-size:18px;--md-filled-button-label-text-size:24px;--md-text-button-label-text-size:24px;--md-outlined-button-label-text-size:24px}'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Large text has no horizontal overflow');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 fail=true;await page.locator('#tomorrow').click();
 await page.locator('#errorState').waitFor({state:'visible'});
 assert.equal(await page.locator('.card').count(),0,'Failed scope cannot show stale free rooms');
 await page.locator('#theme').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('md-outlined-text-field,md-filled-text-field')]
  .filter(e=>e.getBoundingClientRect().width && e.value)
  .every(e=>getComputedStyle(e.shadowRoot.querySelector('.field').shadowRoot.querySelector('.content')).opacity==='1'));
 await page.screenshot({path:path.join(root,'docs/android/conexion.png'),fullPage:false});
 fail=false;await page.locator('#retry').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 assert.equal(await page.locator('#errorState').isVisible(),false);
 // Android theme injection takes precedence over a previously saved manual theme.
 const nativePage = await context.newPage();
 nativePage.on('pageerror',e=>errors.push(String(e)));
 await nativePage.route(origin+'/', route => route.fulfill({contentType:'text/html',body:html.replace('<!-- NATIVE_THEME -->',
  "<style>:root:root{--blue:#aacc88}#theme{display:none}</style><script>window.campusNativeTheme='light';</script>")}));
 await nativePage.goto(origin);
 assert.equal(await nativePage.locator('html').getAttribute('data-theme'),'light');
 assert.equal(await nativePage.locator('#theme').isVisible(),false);
 assert.equal(await nativePage.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--blue')),'#aacc88');
 await nativePage.close();
 await page.locator('#campus').click();
 await page.locator('#campus md-select-option[value="Bs. As."]').click();
 await page.waitForFunction(()=>document.querySelector('#building').disabled);
 assert.equal(await page.locator('#campus').evaluate(element=>element.value),'Bs. As.');
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: mobile workflows, filtering, pagination, midnight, persistence, themes, retry, stale-data protection, 320–768px and large text.');
})().catch(e=>{console.error(e);process.exit(1)});
