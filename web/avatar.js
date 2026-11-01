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
 size.oninput=()=>{avatar.style.setProperty('--avatar-size',size.value+'px');try{localStorage.setItem('amayune.avatar.size',size.value)}catch{}};
 sizeLabel.append(size);
 const close=document.createElement('button');close.type='button';close.textContent='Закрыть';close.onclick=()=>{panel.hidden=true;avatar.focus()};
 panel.append(heading,description,colors,sizeLabel,close);mount.append(avatar,panel);document.body.append(mount);
 try{const color=localStorage.getItem('amayune.avatar.color');if(/^#[0-9a-f]{6}$/i.test(color||''))avatar.style.setProperty('--avatar-color',color);const saved=Number(localStorage.getItem('amayune.avatar.size'));if(saved>=48&&saved<=96){size.value=String(saved);avatar.style.setProperty('--avatar-size',saved+'px')}}catch{}
 avatar.onclick=()=>{if(location.pathname!=='/chat')location.assign('/chat');else document.getElementById('prompt')?.focus()};
 avatar.oncontextmenu=e=>{e.preventDefault();panel.hidden=!panel.hidden;if(!panel.hidden)close.focus()};
 document.addEventListener('pointerdown',e=>{if(!mount.contains(e.target))panel.hidden=true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;avatar.focus()}});
})();
