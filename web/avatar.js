(()=>{
 const mount=document.createElement('div');mount.className='amayune-avatar-dock';
 const avatar=document.createElement('button');avatar.type='button';avatar.className='amayune-avatar';avatar.id='amayuneAvatar';avatar.title='Левая кнопка — открыть чат; правая — настройки аватара';avatar.setAttribute('aria-label','Открыть чат Amayune');avatar.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="av-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".65"/></linearGradient></defs><path d="M32 5 39 24 59 32 39 40 32 59 25 40 5 32 25 24Z" fill="url(#av-grad)"/><circle cx="32" cy="32" r="5" fill="#fff"/></svg>';
 const panel=document.createElement('div');panel.className='amayune-avatar-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Настройки аватара');
 const heading=document.createElement('strong');heading.textContent='Аватар Amayune';
 const description=document.createElement('p');description.textContent='Левая кнопка — чат. Правая — оформление аватара.';
 const colors=document.createElement('div');colors.className='amayune-avatar-colors';
 for(const [name,color] of [['Золотой','#D9A441'],['Фиолетовый','#8B5CF6'],['Бирюзовый','#14B8A6'],['Розовый','#EC4899'],['Синий','#3B82F6']]){
  const button=document.createElement('button');button.type='button';button.title=name;button.setAttribute('aria-label',name);button.style.background=color;
  button.onclick=()=>{avatar.style.setProperty('--avatar-color',color);try{localStorage.setItem('amayune.avatar.color',color)}catch{}};
  colors.append(button);
 }
 const sizeLabel=document.createElement('label');sizeLabel.textContent='Размер';
 const size=document.createElement('input');size.type='range';size.min='48';size.max='96';size.value='66';size.setAttribute('aria-label','Размер аватара');
 size.oninput=()=>{avatar.style.setProperty('--avatar-size',size.value+'px');requestAnimationFrame(place);try{localStorage.setItem('amayune.avatar.size',size.value)}catch{}};
 sizeLabel.append(size);
 const close=document.createElement('button');close.type='button';close.textContent='Закрыть';close.onclick=()=>{panel.hidden=true;avatar.focus()};
 panel.append(heading,description,colors,sizeLabel,close);mount.append(avatar,panel);document.body.append(mount);
 try{const color=localStorage.getItem('amayune.avatar.color');if(/^#[0-9a-f]{6}$/i.test(color||''))avatar.style.setProperty('--avatar-color',color);const saved=Number(localStorage.getItem('amayune.avatar.size'));if(saved>=48&&saved<=96){size.value=String(saved);avatar.style.setProperty('--avatar-size',saved+'px')}}catch{}

 // JUUNIBI-style movable avatar: position is normalized and survives viewport changes.
 const POSITION_KEY='amayune.avatar.position.v1';const edge=12;
 let position={x:1,y:1};try{const stored=JSON.parse(localStorage.getItem(POSITION_KEY)||'null');if(stored&&Number.isFinite(stored.x)&&Number.isFinite(stored.y))position={x:Math.min(1,Math.max(0,stored.x)),y:Math.min(1,Math.max(0,stored.y))}}catch{}
 const range=()=>({w:Math.max(0,innerWidth-avatar.offsetWidth-2*edge),h:Math.max(0,innerHeight-avatar.offsetHeight-2*edge)});
 const place=()=>{const a=range();mount.style.left=(edge+position.x*a.w)+'px';mount.style.top=(edge+position.y*a.h)+'px'};
 const moveTo=(left,top)=>{const a=range();position={x:a.w?Math.min(1,Math.max(0,(left-edge)/a.w)):0,y:a.h?Math.min(1,Math.max(0,(top-edge)/a.h)):0};place()};
 const remember=()=>{try{localStorage.setItem(POSITION_KEY,JSON.stringify(position))}catch{}};
 const togglePanel=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)close.focus()};
 let suppressClick=false;
 avatar.addEventListener('pointerdown',e=>{if(e.button!==0)return;const rect=avatar.getBoundingClientRect();const dx=e.clientX-rect.left,dy=e.clientY-rect.top,sx=e.clientX,sy=e.clientY;let dragged=false;const pointer=e.pointerId;avatar.setPointerCapture(pointer);const onMove=m=>{if(!dragged&&Math.hypot(m.clientX-sx,m.clientY-sy)<6)return;dragged=true;avatar.classList.add('dragging');moveTo(m.clientX-dx,m.clientY-dy)};const onEnd=()=>{avatar.removeEventListener('pointermove',onMove);avatar.removeEventListener('pointerup',onEnd);avatar.removeEventListener('pointercancel',onEnd);avatar.classList.remove('dragging');if(dragged){suppressClick=true;remember();setTimeout(()=>{suppressClick=false},0)}};avatar.addEventListener('pointermove',onMove);avatar.addEventListener('pointerup',onEnd);avatar.addEventListener('pointercancel',onEnd)});
 avatar.addEventListener('keydown',e=>{const shift=e.shiftKey?80:20;const delta={ArrowLeft:[-shift,0],ArrowRight:[shift,0],ArrowUp:[0,-shift],ArrowDown:[0,shift]}[e.key];if(!delta)return;e.preventDefault();const rect=avatar.getBoundingClientRect();moveTo(rect.left+delta[0],rect.top+delta[1]);remember()});
 avatar.addEventListener('resize',place);window.addEventListener('resize',place);
 const status=document.createElement('span');status.className='amayune-avatar-status';status.setAttribute('aria-hidden','true');mount.append(status);
 const states={idle:'Готова к общению',thinking:'Формирует ответ',speaking:'Озвучивает ответ',error:'Ошибка соединения'};
 window.amayuneAvatarState=(next)=>{if(!Object.hasOwn(states,next))return;avatar.dataset.state=next;avatar.title='Amayune — '+states[next]+'; правая кнопка — настройки';status.dataset.state=next;status.title=states[next]};
 window.amayuneAvatarState('idle');
 window.addEventListener('message',event=>{if(event.origin!==location.origin||!event.data||event.data.type!=='amayune:avatar-state')return;window.amayuneAvatarState(event.data.state)});
 place();
 avatar.onclick=()=>{if(suppressClick)return;if(location.pathname!=='/chat'){if(window.amayuneToggleFloatingChat)window.amayuneToggleFloatingChat();else location.assign('/chat')}else document.getElementById('prompt')?.focus()};
 avatar.oncontextmenu=e=>{e.preventDefault();panel.hidden=!panel.hidden;if(!panel.hidden)close.focus()};
 document.addEventListener('pointerdown',e=>{if(!mount.contains(e.target))panel.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;avatar.focus()}});
})();
