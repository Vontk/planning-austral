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
 assert.equal(await page.locator('#editTime').evaluate(element=>Boolean(element.shadowRoot)),true,'Official Material button is initialized');
 for (const id of ['q','date','campus','navigation','subjects']) assert.equal(await page.locator('#'+id).evaluate(element=>Boolean(element.shadowRoot)),true,'Official Material control: '+id);
 assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--background').trim()),'#0e0e0e');
 assert.equal(await page.locator('#rooms button').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('#hours input').inputValue(),'1');
 assert.equal(await page.locator('#date').isVisible(),false);
 assert.equal(await page.locator('[data-hours="0.5"]').count(),0);
 assert.equal(await page.locator('#customDuration').evaluate(element=>element.label),'','Custom duration uses only the clock');
 await page.locator('#settingsButton').click();
 await page.locator('#date input').fill(date);
 await page.locator('#date input').dispatchEvent('change');
 await page.locator('#closeSettings').click();
 await page.locator('#subjects').click();
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
 await page.locator('#editTime').click();
 await page.locator('#from input').fill('12:00');await page.locator('#from input').dispatchEvent('input');
 await page.locator('#closeTime').click();
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
 assert.match(await page.locator('#results').innerText(),/Libre todo el día/);
 await page.locator('#roomQuery input').fill('R2');
 await page.locator('#settingsButton').click();
 await page.locator('#theme').click();
 await page.locator('#closeSettings').click();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.waitForFunction(()=>[...document.querySelectorAll('md-outlined-text-field,md-filled-text-field')]
  .filter(e=>e.getBoundingClientRect().width && e.value)
  .every(e=>getComputedStyle(e.shadowRoot.querySelector('.field').shadowRoot.querySelector('.content')).opacity==='1'));
 await page.screenshot({path:path.join(root,'docs/android/aula-claro.png'),fullPage:false});
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 assert.equal(await page.locator('#roomQuery input').inputValue(),'R2');
 assert.equal(await page.locator('#rooms button').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('#hours input').inputValue(),'1');
 assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
 await page.locator('#rooms').click();
 await page.locator('#customDuration').click();
 await page.locator('#from input').fill('23:30');await page.locator('#from input').dispatchEvent('input');
 await page.locator('#closeTime').click();
 await page.locator('[data-hours="2"]').click();
 assert.equal(await page.locator('#to input').inputValue(),'01:30');
 assert.match(await page.locator('#intervalHint').innerText(),/día siguiente/);
 assert.match(await page.locator('#timeSummary').innerText(),/\(\+1\)/);
 await page.locator('#customDuration').click();
 await page.locator('#hours input').fill('0');assert.equal(await page.locator('#hours input').getAttribute('aria-invalid'),'true');
 await page.locator('#hours input').fill('1,5');
 await page.locator('#closeTime').click();
 assert.equal(await page.locator('#customDuration').evaluate(element=>element.selected),true);
 assert.match(await page.locator('#customDuration button').getAttribute('aria-label'),/90 minutos/);
 await page.locator('[data-hours="1"]').click();
 await page.locator('#subjects').click();
 await page.addStyleTag({content:':root{font-size:28px;--md-outlined-text-field-input-text-size:24px;--md-filled-text-field-input-text-size:24px;--md-filled-select-text-field-input-text-size:24px;--md-navigation-bar-label-text-size:18px;--md-filled-button-label-text-size:24px;--md-text-button-label-text-size:24px;--md-outlined-button-label-text-size:24px}'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Large text has no horizontal overflow');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 await page.locator('#settingsButton').click();
 fail=true;await page.locator('#tomorrow').click();
 await page.locator('#closeSettings').click();
 await page.locator('#errorState').waitFor({state:'visible'});
 assert.equal(await page.locator('.card').count(),0,'Failed scope cannot show stale free rooms');
 await page.locator('#settingsButton').click();
 await page.locator('#theme').click();
 await page.locator('#closeSettings').click();
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
 // Integration: grouping must use real availability and preserve differing schedules.
 const groupPage = await context.newPage(); groupPage.on('pageerror',e=>errors.push(String(e)));
 await groupPage.clock.setFixedTime(new Date('2026-10-30T12:00:00-03:00'));
 let groupScenario = 'same';
 const groupGrid = '<select id="dwm_areas"><option value="65">Pilar - Edificio Olivo Modulo B</option></select><table><thead><tr>'+['B1.1','B1.2','B2'].map((code,i)=>'<td><a href="week.php?area=65&room='+(i+1)+'">Aula '+code+' (30)</a></td>').join('')+'</tr></thead></table>';
 await groupPage.route('**/api/planning*', route=>{
  const rows = ['B1.1','B1.2'].map((code,index)=>row(['Pilar - Edificio Olivo Modulo B - Aula '+code,'Física',
   'Friday 30 October 2026 '+(groupScenario==='busy'&&index===1?'12':'14')+':00:00 - Friday 30 October 2026 '+(groupScenario==='different'&&index===1?'16':'15')+':00:00','','FI','C04','']));
  const url=new URL(route.request().url());
  return route.fulfill({contentType:'text/plain',body:url.searchParams.get('path').startsWith('report.php')?row(headings)+'\n'+rows.join('\n'):groupGrid});
 });
 await groupPage.goto(origin);
 await groupPage.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync'));
 assert.deepEqual(await groupPage.locator('.card h3').allTextContents(),['B1','B2']);
 assert.equal(await groupPage.locator('.card[data-members="B1.1,B1.2"]').count(),1);
 assert.equal(await groupPage.locator('#contextSummary').isVisible(),false);
 await groupPage.locator('#settingsButton').evaluate(e=>e.updateComplete);
 await groupPage.evaluate(()=>document.fonts.ready);
 await groupPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await groupPage.evaluate(()=>[...document.querySelectorAll('md-navigation-tab')].every(e=>e.shadowRoot.querySelector('.md3-navigation-tab__label-text').getBoundingClientRect().bottom<=innerHeight)),true,'Navigation labels fit the viewport');
 await groupPage.screenshot({path:path.join(root,'docs/android/preview-minimal.png'),fullPage:false});
 await groupPage.locator('.schedule-action').first().click();
 assert.equal(await groupPage.locator('.card').count(),1);
 assert.equal(await groupPage.locator('.schedule-booking').count(),1);
 await groupPage.locator('#subjects').click();
 await groupPage.locator('#q input').fill('Física');
 assert.equal(await groupPage.locator('.card').count(),1,'Identical classes on both halves appear once');
 assert.equal(await groupPage.locator('.card p').first().innerText(),'B1');
 await groupPage.locator('#roomSchedule').click();
 groupScenario='different'; await groupPage.locator('#refresh').click();
 await groupPage.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync')&&!document.querySelector('#refresh').disabled);
 assert.deepEqual(await groupPage.locator('.card h3').allTextContents(),['B1.1','B1.2']);
 groupScenario='busy'; await groupPage.locator('#refresh').click();
 await groupPage.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Sync')&&!document.querySelector('#refresh').disabled);
 await groupPage.locator('#rooms').click();
 assert.deepEqual(await groupPage.locator('.card h3').allTextContents(),['B1.1','B2']);
 await groupPage.close();
 await page.locator('#settingsButton').click();
 await page.locator('#campus').click();
 await page.locator('#campus md-select-option[value="Bs. As."]').click();
 await page.waitForFunction(()=>document.querySelector('#building').disabled);
 assert.equal(await page.locator('#campus').evaluate(element=>element.value),'Bs. As.');
 await page.locator('#closeSettings').click();
 assert.deepEqual(errors,[]);
 await browser.close();console.log('PASS: mobile workflows, filtering, pagination, midnight, persistence, themes, retry, stale-data protection, 320–768px and large text.');
})().catch(e=>{console.error(e);process.exit(1)});
