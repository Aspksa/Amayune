const defaults={version:1,theme:'system',accent:'#D9A441',customAccent:'#D9A441',scale:'1',customScale:100,radius:'9',customRadius:12,sidebar:250,density:'1',font:'system',fontSize:15,lineHeight:1.55,shadow:15,glow:15,opacity:100,animation:100,reduceMotion:false};
const presets={light:{bg:'#F7F5F0',side:'#FFFFFF',card:'#FFFFFF',surface:'#ECE8E0',text:'#24201B',muted:'#615A50',line:'#D8D1C7'},dark:{bg:'#12141A',side:'#171A22',card:'#20242C',surface:'#292E39',text:'#F4F6FA',muted:'#ABB2C0',line:'#3A414E'},gold:{bg:'#080808',side:'#101010',card:'#141414',surface:'#1E1E1E',text:'#F5F0E6',muted:'#A9A49B',line:'#34302A'}};
const validColor=s=>typeof s==='string'&&/^#[0-9a-fA-F]{6}$/.test(s);
const clamp=(v,min,max,fall)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fall;
function clean(raw){const d={...defaults};if(!raw||typeof raw!=='object')return d;for(const key of Object.keys(d)){if(Object.hasOwn(raw,key))d[key]=raw[key];}
 if(!['system','light','dark','gold','custom'].includes(d.theme))d.theme='system';
 if(!validColor(d.customAccent))d.customAccent=defaults.customAccent;
 if(d.accent!=='custom'&&!validColor(d.accent))d.accent=defaults.accent;
 if(!['0.8','0.9','1','1.15','1.3','custom'].includes(String(d.scale)))d.scale='1';
 if(!['2','9','16','28','custom'].includes(String(d.radius)))d.radius='9';
 if(!['system','serif','mono'].includes(d.font))d.font='system';
 for(const [key,min,max] of [['customScale',70,160],['customRadius',0,40],['sidebar',190,340],['fontSize',12,22],['lineHeight',1.2,2],['shadow',0,100],['glow',0,100],['opacity',65,100],['animation',0,200]])d[key]=clamp(d[key],min,max,defaults[key]);
 if(!['0.8','1','1.2'].includes(String(d.density)))d.density='1';d.reduceMotion=!!d.reduceMotion;
 return d;
}
let settings;try{settings=clean(JSON.parse(localStorage.getItem('amayune.appearance.v1')||'null'));}catch{settings=clean();}
const root=document.documentElement;
function render(){const scheme=settings.theme==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):settings.theme==='custom'?'dark':settings.theme;
 const p=presets[scheme];for(const [k,v] of Object.entries(p))root.style.setProperty('--'+k,v);
 const accent=settings.accent==='custom'?settings.customAccent:settings.accent;
 root.style.setProperty('--accent',accent);
 const contrast=(hex)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 root.style.setProperty('--accent',accent);
 root.style.setProperty('--scale',String((settings.scale==='custom'?settings.customScale/100:Number(settings.scale))*settings.fontSize/15));
 root.style.setProperty('--radius',(settings.radius==='custom'?settings.customRadius:Number(settings.radius))+'px');
 root.style.setProperty('--sidebar',settings.sidebar+'px');root.style.setProperty('--density',settings.density);
 root.style.setProperty('--shadow',settings.shadow/100);root.style.setProperty('--glow',settings.glow/100);
 root.style.setProperty('--opacity',settings.opacity/100);root.style.setProperty('--speed',settings.reduceMotion?0:settings.animation/100);
 root.style.lineHeight=String(settings.lineHeight);
 root.style.fontFamily=settings.font==='serif'?'Georgia,serif':settings.font==='mono'?'Consolas,monospace':'Segoe UI,Arial,sans-serif';
 root.style.colorScheme=scheme==='light'?'light':'dark';
 document.querySelectorAll('[data-setting]').forEach(el=>{const key=el.dataset.setting;const value=settings[key];if(el.type==='checkbox')el.checked=!!value;else if(document.activeElement!==el)el.value=String(value);});
 document.querySelectorAll('.primary').forEach(b=>b.style.color=contrast(accent)>.4?'#080808':'#FFFFFF');
 document.querySelectorAll('[data-theme-tile]').forEach(tile=>tile.setAttribute('aria-pressed',String(settings.theme===tile.dataset.themeTile)));
}
function notify(s){if(s==='Сохранено'&&localStorage.getItem('amayune.pref.notices')==='0')return;document.getElementById('status').textContent=s;}
function cloudMessage(s){document.getElementById('cloudStatus').textContent=s;const badge=document.getElementById('cloudConnectionBadge');if(badge)badge.textContent=s.startsWith('Соединение подтверждено')||s.startsWith('Ключ проверен')?'Подключено':s.startsWith('Проверяю')?'Проверка…':s.startsWith('Ключ сохранён')?'Ключ сохранён':s.startsWith('Проверка не пройдена')||s.startsWith('Авторизация')?'Ошибка проверки':'Не подключено';}
function save(){notify('Сохранение…');try{localStorage.setItem('amayune.appearance.v1',JSON.stringify(settings));notify('Сохранено');}catch{notify('Ошибка сохранения оформления');}}
document.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('input',()=>{settings=clean({...settings,[el.dataset.setting]:el.type==='checkbox'?el.checked:el.value});render();save();}));
document.querySelectorAll('[data-theme-tile]').forEach(tile=>tile.addEventListener('click',()=>{settings=clean({...settings,theme:tile.dataset.themeTile});render();save();}));
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(settings.theme==='system')render();});
document.getElementById('reset').onclick=()=>{settings=clean();render();save();};
document.getElementById('exportTheme').onclick=()=>{const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(settings,null,2)],{type:'application/json'}));a.href=url;a.download='amayune-theme.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.getElementById('importTheme').onchange=async e=>{const file=e.target.files[0];if(!file||file.size>10000)return notify('Файл слишком большой');try{const data=JSON.parse(await file.text());if(data.version!==1)throw Error();settings=clean(data);render();save();}catch{notify('Ошибка импорта JSON');}e.target.value='';};
const csrf=JSON.parse(document.getElementById('csrf').textContent);
async function request(path,method='GET',data){const r=await fetch('/api/'+path,{method,headers:{'x-amayune-token':csrf,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'Ошибка HTTP '+r.status);return result;}
let cloud=null,models=[];
function cloudFields(){document.querySelectorAll('[data-cloud]').forEach(el=>{el.value=el.type==='checkbox'?'':String(cloud[el.dataset.cloud]??'');if(el.type==='checkbox')el.checked=!!cloud[el.dataset.cloud];});}
async function loadCloud(){try{const data=await request('settings');cloud=data.settings;cloudFields();cloudMessage(data.hasKey?'Ключ сохранён. Проверка не выполнялась.':'Ключ не сохранён');}catch(e){cloudMessage(e.message);}}
let pending=Promise.resolve();
document.querySelectorAll('[data-cloud]').forEach(el=>el.addEventListener('change',()=>{
 if(!cloud)return;
 const k=el.dataset.cloud;
 const v=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
 cloud={...cloud,[k]:v};
 notify('Сохранение Cloud.ru…');
 pending=pending.catch(()=>{}).then(async()=>{
  const snapshot={...cloud};
  try{const x=await request('settings','PUT',snapshot);notify('Параметры Cloud.ru сохранены');}
  catch{try{const data=await request('settings');cloud=data.settings;cloudFields();}catch{}notify('Ошибка сохранения Cloud.ru: проверьте параметры');}
 });
}));
document.getElementById('showKey').onchange=e=>document.getElementById('apiKey').type=e.target.checked?'text':'password';
document.getElementById('saveKey').onclick=async()=>{const el=document.getElementById('apiKey');try{await request('key','PUT',{key:el.value});el.value='';el.type='password';document.getElementById('showKey').checked=false;cloudMessage('Ключ проверен Cloud.ru и безопасно сохранён');}catch(e){el.value='';cloudMessage(e.message);}};
document.getElementById('deleteKey').onclick=async()=>{if(!confirm('Удалить сохранённый ключ Cloud.ru?'))return;try{await request('key','DELETE');cloudMessage('Ключ удалён');}catch(e){notify(e.message);}};
document.getElementById('checkAll').onclick=async()=>{const box=document.getElementById('cloudStatus');cloudMessage('Проверяю доступ к списку моделей...');try{const data=await request('models');models=data.models;document.getElementById('models').replaceChildren(...models.map(m=>{const o=document.createElement('option');o.value=m.id;return o;}));const info=document.getElementById('modelInfo');info.replaceChildren(...models.slice(0,100).map(m=>{const p=document.createElement('p');p.textContent=[m.name,'ID: '+m.id,m.context===null?'':'Контекст: '+m.context,m.inputCost===null?'':'Вход: '+m.inputCost,m.outputCost===null?'':'Выход: '+m.outputCost].filter(Boolean).join(' · ');return p;}));cloudMessage('Соединение подтверждено · моделей: '+models.length+' · '+new Date(data.checkedAt).toLocaleString('ru-RU'));renderModelCatalogue();}catch(e){cloudMessage('Проверка не пройдена: '+e.message);}};
function renderModelCatalogue(){
 const q=document.getElementById('modelSearch').value.trim().toLocaleLowerCase('ru');
 const found=models.filter(m=>m.id.toLocaleLowerCase('ru').includes(q)||m.name.toLocaleLowerCase('ru').includes(q)).slice(0,100);
 const info=document.getElementById('modelInfo');
 info.replaceChildren(...found.map(m=>{const item=document.createElement('div');item.className='model-card';const label=document.createElement('strong');label.textContent=m.name;const meta=document.createElement('small');meta.textContent=m.id+(m.context===null?'':' · Контекст '+m.context);item.append(label,meta);return item;}));
 document.getElementById('selectionStatus').textContent=models.length?'Показано '+found.length+' из '+models.length+' моделей':'Каталог не загружен: нажмите «Проверить всё»';
}
document.getElementById('modelSearch').addEventListener('input',renderModelCatalogue);
document.getElementById('verifySelection').onclick=async()=>{
 const output=document.getElementById('selectionStatus');
 output.textContent='Проверяю актуальный каталог Cloud.ru…';
 try{
  const data=await request('models');models=data.models;renderModelCatalogue();
  const chosen=[['Основная',cloud?.primaryModel],['Резервная',cloud?.fallbackModel],['Эмбеддинги',cloud?.embeddingModel]].filter(x=>x[1]);
  const missing=chosen.filter(([_,id])=>!models.some(m=>m.id===id));
  output.textContent=missing.length?'Не найдены в каталоге: '+missing.map(([label,id])=>label+' ('+id+')').join(', '):chosen.length?'Все выбранные модели доступны в каталоге':'Каталог доступен, модели пока не выбраны';
 }catch(e){output.textContent='Не удалось проверить каталог: '+e.message;}
};
function page(name){for(const id of ['appearance','interface','connection','security','performance','notifications','maintenance','about'])document.getElementById(id).hidden=id!==name;document.querySelectorAll('[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===name));sessionStorage.setItem('amayune.page',name);document.getElementById('settingsSubnav').hidden=false;document.getElementById('settingsNav').setAttribute('aria-expanded','true');}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));
document.getElementById('settingsNav').onclick=()=>{const sub=document.getElementById('settingsSubnav');sub.hidden=!sub.hidden;document.getElementById('settingsNav').setAttribute('aria-expanded',String(!sub.hidden));};
const searchInput=document.getElementById('search');
function searchSettings(q){
 const term=q.trim().toLocaleLowerCase('ru');
 const sections=['appearance','interface','connection','security','performance','notifications','maintenance','about'];
 let target=null,first=null;
 for(const id of sections){
  const section=document.getElementById(id);
  for(const d of section.querySelectorAll('details')){
   const matches=!term||d.textContent.toLocaleLowerCase('ru').includes(term);
   d.hidden=!matches;
   if(matches&&term){d.open=true;if(!target){target=id;first=d;}}
  }
 }
 if(term&&target){page(target);first?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 if(term&&!target)notify('Совпадений не найдено');
 if(!term)notify('Готово');
}
searchInput.addEventListener('input',e=>searchSettings(e.target.value));
document.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.body.classList.remove('sidebar-collapsed');setSidebar(false);searchInput.focus();searchInput.select();}
 if(e.key==='Escape'&&document.activeElement===searchInput){searchInput.value='';searchSettings('');searchInput.blur();}
});
const sidebarToggle=document.getElementById('sidebarToggle');
function setSidebar(collapsed){document.body.classList.toggle('sidebar-collapsed',collapsed);sidebarToggle.setAttribute('aria-pressed',String(collapsed));sidebarToggle.setAttribute('aria-label',collapsed?'Развернуть боковое меню':'Свернуть боковое меню');sidebarToggle.title=collapsed?'Развернуть меню':'Свернуть меню';try{localStorage.setItem('amayune.sidebar.collapsed',collapsed?'1':'0');}catch{}}
sidebarToggle.onclick=()=>setSidebar(!document.body.classList.contains('sidebar-collapsed'));
try{setSidebar(localStorage.getItem('amayune.sidebar.collapsed')==='1');}catch{setSidebar(false);}
document.getElementById('expandGroups').onclick=()=>document.querySelectorAll('section:not([hidden]) details:not([hidden])').forEach(d=>d.open=true);
document.getElementById('collapseGroups').onclick=()=>document.querySelectorAll('section:not([hidden]) details:not([hidden])').forEach(d=>d.open=false);
const accents=[['Золото','#D9A441'],['Сакура','#EFA2BC'],['Нефрит','#56B68B'],['Фиалка','#9D86E8'],['Серебро','#BDC5D0'],['Сапфир','#5796DB'],['Рубин','#DF5868'],['Аметист','#B48AE8'],['Бирюза','#55C6C4']];
const palette=document.getElementById('accentQuick');
for(const [name,color] of accents){const b=document.createElement('button');b.type='button';b.className='accent-dot';b.style.backgroundColor=color;b.title=name;b.setAttribute('aria-label',name);b.onclick=()=>{settings=clean({...settings,accent:color});render();save();};palette.append(b);}
const originalRender=render;
render=function(){originalRender();for(const b of palette.children){b.setAttribute('aria-pressed',String(settings.accent===rgbToHex(b.style.backgroundColor)));}};
function rgbToHex(rgb){const m=rgb.match(/\d+/g);return m&&m.length>=3?'#'+m.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join('').toUpperCase():rgb.toUpperCase();}
page(['appearance','interface','connection','security','performance','notifications','maintenance','about'].includes(sessionStorage.getItem('amayune.page'))?sessionStorage.getItem('amayune.page'):'appearance');render();loadCloud();

let diagnosticReport=null;
document.getElementById('diagnose').onclick=async()=>{
 const el=document.getElementById('diagnosticResults');el.textContent='Проверка…';
 try{const data=await request('diagnostics');diagnosticReport=data.diagnostics;el.textContent=JSON.stringify(diagnosticReport,null,2);}
 catch(e){el.textContent='Ошибка диагностики: '+e.message;}
};
document.getElementById('copyDiagnostics').onclick=async()=>{if(!diagnosticReport)return notify('Сначала запустите диагностику');try{await navigator.clipboard.writeText(JSON.stringify(diagnosticReport,null,2));notify('Отчёт скопирован');}catch{notify('Не удалось скопировать отчёт');}};
function downloadJson(filename,obj){const url=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
document.getElementById('backupExport').onclick=async()=>{
 try{const data=await request('backup','POST',{appearance:settings});downloadJson('amayune-backup.json',data.backup);document.getElementById('backupStatus').textContent='Копия без секретов создана';}
 catch(e){document.getElementById('backupStatus').textContent=e.message;}
};
document.getElementById('backupImport').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>100000)throw Error('Файл слишком большой');const content=JSON.parse(await file.text());if(!confirm('Восстановить параметры из резервной копии?'))return;const result=await request('restore','POST',content);if(result.restored.appearance){settings=clean(result.restored.appearance);render();save();}cloud=result.restored.cloud;cloudFields();document.getElementById('backupStatus').textContent='Настройки восстановлены';}
 catch(err){document.getElementById('backupStatus').textContent='Не удалось восстановить: '+err.message;}finally{e.target.value='';}
};

const prefCollapsed=document.getElementById('prefCollapsed');
const prefSidebarWidth=document.getElementById('prefSidebarWidth');
const prefReducedMotion=document.getElementById('prefReducedMotion');
const prefSaveNotices=document.getElementById('prefSaveNotices');
function syncPreferences(){prefCollapsed.checked=document.body.classList.contains('sidebar-collapsed');prefSidebarWidth.value=String(settings.sidebar);document.getElementById('sidebarWidthValue').textContent=settings.sidebar+' px';prefReducedMotion.checked=settings.reduceMotion;prefSaveNotices.checked=localStorage.getItem('amayune.pref.notices')!=='0';}
prefCollapsed.onchange=e=>{setSidebar(e.target.checked);syncPreferences();};
prefSidebarWidth.oninput=e=>{settings=clean({...settings,sidebar:Number(e.target.value)});render();save();syncPreferences();};
prefReducedMotion.onchange=e=>{settings=clean({...settings,reduceMotion:e.target.checked});render();save();syncPreferences();};
prefSaveNotices.onchange=e=>{localStorage.setItem('amayune.pref.notices',e.target.checked?'1':'0');notify('Настройка уведомлений изменена');};
document.getElementById('focusSearch').onclick=()=>{setSidebar(false);searchInput.focus();};
async function refreshSecurity(){
 const box=document.getElementById('securityKeyStatus');
 try{const [data,diag]=await Promise.all([request('settings'),request('diagnostics')]);box.textContent=data.hasKey?'Ключ сохранён · '+diag.diagnostics.keyProtection:'Ключ не сохранён · '+diag.diagnostics.keyProtection;}
 catch(e){box.textContent='Ошибка проверки: '+e.message;}
}
document.getElementById('securityRefresh').onclick=refreshSecurity;
document.getElementById('securityDeleteKey').onclick=async()=>{if(!confirm('Безвозвратно удалить API-ключ Cloud.ru?'))return;try{await request('key','DELETE');cloudMessage('Ключ удалён');await refreshSecurity();}catch(e){notify('Ошибка удаления: '+e.message);}};
document.getElementById('clearLocalAppearance').onclick=()=>{if(!confirm('Сбросить оформление в этом браузере?'))return;settings=clean();render();save();syncPreferences();};
document.getElementById('openCloudParameters').onclick=()=>{page('connection');document.querySelectorAll('#connection details').forEach(d=>{if(d.querySelector('summary')?.textContent.includes('Параметры'))d.open=true;});};
document.getElementById('refreshAbout').onclick=async()=>{const el=document.getElementById('aboutEnvironment');try{const r=await request('diagnostics');el.textContent=JSON.stringify({Node:r.diagnostics.node,platform:r.diagnostics.platform,uptimeSeconds:r.diagnostics.uptimeSeconds},null,2);}catch(e){el.textContent=e.message;}};
const oldPage=page;
page=function(name){oldPage(name);if(name==='interface'||name==='notifications'||name==='performance')syncPreferences();if(name==='security')refreshSecurity();if(name==='about')document.getElementById('refreshAbout').click();if(name==='performance'){document.getElementById('performanceValues').textContent=cloud?'Максимум токенов: '+cloud.maxTokens+' · Параллельных запросов: '+cloud.concurrency+' · Тайм-аут: '+cloud.timeoutMs+' мс':'Параметры Cloud.ru не загружены';}};
syncPreferences();

async function refreshBackups(){
 const box=document.getElementById('backupItems');
 try{const data=await request('backups');box.replaceChildren(...data.backups.map(item=>{const row=document.createElement('div');row.className='backup-row';const label=document.createElement('span');label.textContent=item.name+' · '+Math.ceil(item.size/1024)+' КБ';const button=document.createElement('button');button.type='button';button.textContent='Восстановить';button.onclick=async()=>{if(!confirm('Заменить настройки Cloud.ru этой резервной копией? API-ключ не изменится.'))return;try{const restored=await request('backups/restore','POST',{name:item.name});cloud=restored.restored.cloud;cloudFields();notify('Резервная копия восстановлена');}catch(e){notify('Ошибка восстановления: '+e.message);}};row.append(label,button);return row;}));if(!data.backups.length)box.textContent='Сохранённых копий ещё нет';}
 catch(e){box.textContent='Ошибка списка копий: '+e.message;}
}
document.getElementById('backupRefresh').onclick=refreshBackups;
document.getElementById('backupSnapshot').onclick=async()=>{try{await request('backups','POST',{});notify('Резервная копия создана');await refreshBackups();}catch(e){notify('Ошибка создания копии: '+e.message);}};
refreshBackups();
