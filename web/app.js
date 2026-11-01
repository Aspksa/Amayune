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
function notify(s){document.getElementById('status').textContent=s;}
function cloudMessage(s){document.getElementById('cloudStatus').textContent=s;const badge=document.getElementById('cloudConnectionBadge');if(badge)badge.textContent=s.startsWith('Соединение подтверждено')||s.startsWith('Ключ проверен')?'Подключено':s.startsWith('Проверяю')?'Проверка…':s.startsWith('Ключ сохранён')?'Ключ сохранён':s.startsWith('Проверка не пройдена')||s.startsWith('Авторизация')?'Ошибка проверки':'Не подключено';}
function save(){try{localStorage.setItem('amayune.appearance.v1',JSON.stringify(settings));notify('Сохранено');}catch{notify('Не удалось сохранить локально');}}
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
document.querySelectorAll('[data-cloud]').forEach(el=>el.addEventListener('change',()=>{if(!cloud)return;const k=el.dataset.cloud;cloud[k]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;pending=pending.catch(()=>{}).then(async()=>{try{const x=await request('settings','PUT',cloud);cloud=x.settings;notify('Параметры модели сохранены');}catch(e){notify('Не сохранено: '+e.message);}});}));
document.getElementById('showKey').onchange=e=>document.getElementById('apiKey').type=e.target.checked?'text':'password';
document.getElementById('saveKey').onclick=async()=>{const el=document.getElementById('apiKey');try{await request('key','PUT',{key:el.value});el.value='';el.type='password';document.getElementById('showKey').checked=false;cloudMessage('Ключ проверен Cloud.ru и безопасно сохранён');}catch(e){el.value='';cloudMessage(e.message);}};
document.getElementById('deleteKey').onclick=async()=>{if(!confirm('Удалить сохранённый ключ Cloud.ru?'))return;try{await request('key','DELETE');cloudMessage('Ключ удалён');}catch(e){notify(e.message);}};
document.getElementById('checkAll').onclick=async()=>{const box=document.getElementById('cloudStatus');cloudMessage('Проверяю доступ к списку моделей...');try{const data=await request('models');models=data.models;document.getElementById('models').replaceChildren(...models.map(m=>{const o=document.createElement('option');o.value=m.id;return o;}));const info=document.getElementById('modelInfo');info.replaceChildren(...models.slice(0,100).map(m=>{const p=document.createElement('p');p.textContent=[m.name,'ID: '+m.id,m.context===null?'':'Контекст: '+m.context,m.inputCost===null?'':'Вход: '+m.inputCost,m.outputCost===null?'':'Выход: '+m.outputCost].filter(Boolean).join(' · ');return p;}));cloudMessage('Соединение подтверждено · моделей: '+models.length+' · '+new Date(data.checkedAt).toLocaleString('ru-RU'));}catch(e){cloudMessage('Проверка не пройдена: '+e.message);}};
function page(name){document.getElementById('appearance').hidden=name!=='appearance';document.getElementById('connection').hidden=name!=='connection';document.querySelectorAll('[data-page]').forEach(n=>n.classList.toggle('active',n.dataset.page===name));sessionStorage.setItem('amayune.page',name);document.getElementById('settingsSubnav').hidden=false;document.getElementById('settingsNav').setAttribute('aria-expanded','true');}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>page(b.dataset.page));
document.getElementById('settingsNav').onclick=()=>{const sub=document.getElementById('settingsSubnav');sub.hidden=!sub.hidden;document.getElementById('settingsNav').setAttribute('aria-expanded',String(!sub.hidden));};
document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('details').forEach(d=>{const matches=d.textContent.toLowerCase().includes(q);d.hidden=!!q&&!matches;if(q&&matches)d.open=true;});});
page(sessionStorage.getItem('amayune.page')==='connection'?'connection':'appearance');render();loadCloud();
