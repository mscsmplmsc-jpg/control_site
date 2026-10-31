(()=>{
const API=String(window.APP_API||'').trim().replace(/\/+$/,'');
if(!/^https?:\/\//.test(API))return; // сервер не настроен: приложение работает как раньше

const st=document.createElement('style');
st.textContent='#auth{position:fixed;inset:0;z-index:40;background:var(--bg);overflow:auto;padding:env(safe-area-inset-top) 16px}.ag{max-width:420px;margin:12vh auto 0}.dv{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}';
document.head.appendChild(st);

const SK='sess-v1',RK='sync-rev-v1';
const LOC={hours:'uchet-chasov-v1',crm:'crm-v1',rem:'rem-v1',tsk:'tasks-v1'};
const KEYS=['hours','crm','rem','tsk','meta'];
const NAMES={hours:'Учет часов',crm:'CRM',rem:'Напоминания',tsk:'Задачи',meta:'Пароли и коды'};
const META=[['feat','feat-v1'],['locks','locks-v1']];
let sess=null,S={},busy=false,status={};
try{sess=JSON.parse(localStorage.getItem(SK))}catch(e){}
try{S=JSON.parse(localStorage.getItem(RK))||{}}catch(e){}
const saveS=()=>localStorage.setItem(RK,JSON.stringify(S));
const EMPTY_META=JSON.stringify({feat:null,locks:null});
const getLoc=k=>k==='meta'?JSON.stringify(Object.fromEntries(META.map(([a,b])=>[a,localStorage.getItem(b)]))):(localStorage.getItem(LOC[k])||'');
function setLoc(k,s){
  if(k==='meta'){const m=JSON.parse(s||'{}');META.forEach(([a,b])=>{m[a]==null?localStorage.removeItem(b):localStorage.setItem(b,m[a])})}
  else if(s)localStorage.setItem(LOC[k],s);else localStorage.removeItem(LOC[k]);
}
const isEmpty=(k,s)=>k==='meta'?(!s||s===EMPTY_META):!s;

async function call(o){
  const c=new AbortController(),tm=setTimeout(()=>c.abort(),20000);
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(o),signal:c.signal});
    let j={};try{j=await r.json()}catch(e){}
    j._s=r.status;return j;
  }finally{clearTimeout(tm)}
}
const sc=o=>call({s:sess&&sess.t,...o});
window.authCall=o=>sc(o);
window.authUser=()=>sess?sess.user:null;
const sheetOpen=()=>!$('#md').hidden;
function setStatus(s){status={s,t:Date.now()};const el=$('#ac_s');if(el)el.textContent=statusText()}
const statusText=()=>status.s==='ok'?'Синхронизировано в '+pad(new Date(status.t).getHours())+':'+pad(new Date(status.t).getMinutes()):status.s==='offline'?'Нет связи с сервером. Изменения отправятся позже.':'Ожидание синхронизации…';

/* ---------- синхронизация ---------- */
async function pushKey(k,base){
  const str=getLoc(k),j=await sc({op:'push',k,base,data:str});
  if(j.ok){S[k]={rev:j.rev,str};return true}
  if(j.error==='conflict')return false;
  throw new Error(j.error||'push');
}
function askConflict(keys,docs){
  return new Promise(res=>{
    openSheet(`<h2>Данные отличаются</h2><p class="mute">На сервере и на этом устройстве разные данные: ${keys.map(k=>NAMES[k]).join(', ')}. Какую версию оставить? Выбранная заменит другую.</p><button class="primary" id="cf_s">Взять с сервера</button><button class="ghost" id="cf_m">Оставить с этого устройства</button>`);
    window._sc=()=>res();
    $('#cf_s').onclick=()=>{window._sc=null;keys.forEach(k=>{const d=docs[k];if(d){setLoc(k,d.data);S[k]={rev:d.rev,str:d.data}}});saveS();closeSheet();location.reload();res()};
    $('#cf_m').onclick=async()=>{window._sc=null;closeSheet();try{for(const k of keys)await pushKey(k,docs[k]?docs[k].rev:0);saveS();setStatus('ok')}catch(e){setStatus('offline')}res()};
  });
}
async function syncNow(){
  if(busy||!sess||sheetOpen())return;
  busy=true;
  try{
    const j=await sc({op:'pull'});
    if(j._s===401){dropSession();return}
    if(!j.docs)throw new Error('pull');
    let reload=false;const conflicts=[];
    for(const k of KEYS){
      const sv=j.docs[k],loc=getLoc(k),s=S[k];
      if(!s){ // первая синхронизация этого устройства
        if(!sv){if(isEmpty(k,loc))S[k]={rev:0,str:loc};else if(!(await pushKey(k,0)))conflicts.push(k)}
        else if(isEmpty(k,loc)){setLoc(k,sv.data);S[k]={rev:sv.rev,str:sv.data};reload=true}
        else if(loc===sv.data)S[k]={rev:sv.rev,str:loc};
        else conflicts.push(k);
      }else{
        const dirty=loc!==s.str;
        if(sv&&sv.rev>s.rev){if(!dirty){setLoc(k,sv.data);S[k]={rev:sv.rev,str:sv.data};reload=true}else conflicts.push(k)}
        else if(dirty&&!(await pushKey(k,s.rev)))conflicts.push(k);
      }
    }
    saveS();
    if(conflicts.length){await askConflict(conflicts,j.docs);return}
    setStatus('ok');
    if(reload)location.reload();
  }catch(e){setStatus('offline')}
  finally{busy=false}
}
async function pushDirty(){
  let ok=true,conflict=false;
  for(const k of KEYS){
    const s=S[k];if(!s||getLoc(k)===s.str)continue;
    try{if(!(await pushKey(k,s.rev))){conflict=true;ok=false}}catch(e){ok=false;setStatus('offline')}
  }
  saveS();
  if(conflict)setTimeout(syncNow,0);
  else if(ok&&status.s!=='ok')setStatus('ok');
  return ok;
}
setInterval(async()=>{if(!sess||busy)return;busy=true;try{await pushDirty()}finally{busy=false}},4000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow()});

/* ---------- вход ---------- */
const devLabel=()=>{const u=navigator.userAgent;return (/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':/Windows/.test(u)?'Windows':'Устройство')+' · '+fdate(iso(new Date()))};
function dropSession(){sess=null;localStorage.removeItem(SK);busy=false;gate('Сессия закончилась, войдите снова.')}
function gate(msg){
  let g=$('#auth');if(!g){g=document.createElement('div');g.id='auth';document.body.appendChild(g)}
  g.hidden=false;
  g.innerHTML=`<div class="ag"><h1>Мои часы</h1><p class="mute">Войдите или создайте аккаунт. Это устройство запомнится.</p>
  <label>Имя<input id="a_n" autocapitalize="off" autocorrect="off" autocomplete="username"></label>
  <label>Пароль<input id="a_p" type="password" autocomplete="current-password"></label>
  <div class="err" id="a_e">${esc(msg||'')}</div>
  <button class="primary" id="a_in">Войти</button><button class="ghost" id="a_up">Создать аккаунт</button><button class="ghost" id="a_ping" style="color:var(--mute);font-size:14px">Проверить связь с сервером</button><button class="ghost" id="a_skip" style="color:var(--mute);font-size:14px">Продолжить без входа (данные только на этом устройстве)</button><div id="a_d"></div></div>`;
  $('#a_in').onclick=()=>login('login');$('#a_up').onclick=()=>login('reg');
  $('#a_ping').onclick=async()=>{
    const el=$('#a_e');el.textContent='Проверяю связь…';
    const t0=Date.now(),c=new AbortController(),tm=setTimeout(()=>c.abort(),15000);
    try{const r=await fetch(API,{cache:'no-store',signal:c.signal});const j=await r.json();el.textContent=j&&j.ok?'Сервер отвечает ('+(Date.now()-t0)+' мс).':'Сервер ответил странно (код '+r.status+').'}
    catch(e){el.textContent='Сервер не отвечает за 15 секунд. Возможно, соединение с ним блокирует провайдер или сеть. Попробуйте Wi-Fi или другой интернет.'}
    finally{clearTimeout(tm)}
  };
  $('#a_skip').onclick=()=>{localStorage.setItem('auth-skip','1');$('#auth').hidden=true};
  $('#a_p').onkeydown=e=>{if(e.key==='Enter')login('login')};
}
let logging=false;
async function login(op,remove){
  if(logging)return;
  const name=$('#a_n').value,pass=$('#a_p').value;
  if(!name.trim()||!pass){$('#a_e').textContent='Введите имя и пароль';return}
  $('#a_e').textContent='Подождите… (до 20 секунд)';logging=true;$$('#auth button').forEach(b=>{b.disabled=true});
  try{
    const j=await call({op,name,pass,label:devLabel(),remove});
    if(j.ok){sess={t:j.token,user:j.user};localStorage.setItem(SK,JSON.stringify(sess));localStorage.removeItem('auth-skip');S={};saveS();$('#auth').hidden=true;$('#acctbtn').hidden=false;syncNow();return}
    if(j.error==='limit'){
      $('#a_e').textContent='На этом аккаунте уже запомнено 3 устройства. Уберите одно, чтобы войти здесь.';
      $('#a_d').innerHTML=j.devices.map(d=>`<div class="dv"><span>${esc(d.label)}<br><span class="mute">был в сети ${fdate(iso(new Date(d.last)))}</span></span><button class="sm" data-rm="${esc(d.id)}" style="margin:0">Убрать</button></div>`).join('');
      $('#a_d').onclick=e=>{const b=e.target.closest('[data-rm]');if(b)login('login',b.dataset.rm)};
      return;
    }
    $('#a_e').textContent=j.error||'Ошибка входа';
  }catch(e){$('#a_e').textContent='Сервер не отвечает. Проверьте интернет и нажмите «Проверить связь с сервером».'}
  finally{logging=false;$$('#auth button').forEach(b=>{b.disabled=false})}
}

/* ---------- аккаунт ---------- */
function acct(){
  if(!sess){localStorage.removeItem('auth-skip');gate();return}
  openSheet(`<h2>Аккаунт</h2><p><b>${esc(sess.user)}</b></p><p class="mute" id="ac_s">${esc(statusText())}</p>
  <p class="mute">Тексты синхронизируются между устройствами. Фото и видео остаются только на устройстве, где их добавили.</p>
  <button class="primary" id="ac_sync">Синхронизировать сейчас</button><button class="ghost" id="ac_dev">Устройства</button><button class="ghost" id="ac_out" style="color:var(--bad)">Выйти</button><button class="ghost" id="ac_x">Закрыть</button>`);
  $('#ac_x').onclick=closeSheet;
  $('#ac_sync').onclick=async()=>{if(busy)return;closeSheet();await syncNow()};
  $('#ac_dev').onclick=devices;
  $('#ac_out').onclick=logout;
}
async function devices(){
  openSheet('<h2>Устройства</h2><p class="mute">Загрузка…</p>');
  try{
    const j=await sc({op:'devices'});if(!j.ok)throw 0;
    openSheet(`<h2>Устройства</h2><p class="mute">Запомнено устройств: ${j.devices.length} из 3.</p>${j.devices.map(d=>`<div class="dv"><span>${esc(d.label)}${d.current?' (это устройство)':''}<br><span class="mute">был в сети ${fdate(iso(new Date(d.last)))}</span></span>${d.current?'':`<button class="sm" data-rv="${esc(d.id)}" style="margin:0">Убрать</button>`}</div>`).join('')}<button class="ghost" id="dv_x">Закрыть</button>`);
    $('#dv_x').onclick=closeSheet;
    $('#sheet').onclick=async e=>{const b=e.target.closest('[data-rv]');if(!b||!confirm('Убрать это устройство? На нём придётся войти заново.'))return;await sc({op:'revoke',id:b.dataset.rv});devices()};
  }catch(e){openSheet('<h2>Устройства</h2><p class="mute">Не удалось загрузить список. Проверьте связь.</p><button class="ghost" id="dv_x">Закрыть</button>');$('#dv_x').onclick=closeSheet}
}
async function logout(){
  if(!confirm('Выйти из аккаунта? Все данные на этом устройстве будут удалены, включая фото и видео CRM, которых нет на других устройствах. Тексты останутся на сервере.'))return;
  busy=true;
  let ok=true;
  try{ok=await pushDirty()}catch(e){ok=false}
  if(!ok&&!confirm('Последние изменения не удалось отправить на сервер, они будут потеряны. Всё равно выйти?')){busy=false;return}
  let ep='';try{ep=JSON.parse(localStorage.getItem('push-sub')).endpoint}catch(e){}
  try{await sc({op:'logout',ep})}catch(e){}
  Object.values(LOC).concat(['feat-v1','locks-v1','push-sub','chat-peers-v1','chat-seen-v1','chat-files-v1',SK,RK]).forEach(k=>localStorage.removeItem(k));
  const r=indexedDB.open('crm-media',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('m',{keyPath:'id'});
  r.onsuccess=()=>{const t=r.result.transaction('m','readwrite');t.objectStore('m').clear();t.oncomplete=()=>location.reload()};
  r.onerror=()=>location.reload();
}
$('#acctbtn').onclick=acct;
$('#acctbtn').hidden=false;

if(sess){syncNow()}else if(localStorage.getItem('auth-skip')!=='1')gate();
})();
