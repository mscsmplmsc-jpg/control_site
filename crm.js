(()=>{
const st=document.createElement('style');
st.textContent=`
#crmbody textarea,#sheet textarea{display:block;width:100%;margin-top:4px;padding:11px 12px;font:inherit;font-size:17px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;resize:vertical}
.pc,.w{display:flex;gap:12px;align-items:center;margin-top:8px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;cursor:pointer}
.pc.gap{margin-top:26px}
.w{display:block}
.pi{min-width:0}.pi b{font-size:18px}.pi .mute{margin-top:1px}
.av{width:56px;height:56px;border-radius:50%;object-fit:cover;background:var(--line);display:inline-flex;align-items:center;justify-content:center;font-weight:600;flex:none;color:var(--mute)}
.av.big{width:96px;height:96px;font-size:36px}
.tag{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:99px;border:1px solid var(--line);font-size:12px;color:var(--mute);vertical-align:2px}
.hd{display:flex;gap:16px;align-items:center;margin:8px 0 12px}
.hd h1{margin:0}
.acts{margin:4px 0 12px}
.txt{white-space:pre-wrap;margin:0}
.clip{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;margin-top:2px}
.inf{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}.inf span:first-child{color:var(--mute);width:120px;flex:none;font-size:15px}
.inf a,.txt a{color:var(--acc)}
.ck{display:flex;align-items:center;gap:10px;font-size:17px;color:var(--ink);margin:10px 0}
.ck input{width:22px;height:22px;margin:0;flex:none}
.gr{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px}
.th{position:relative;aspect-ratio:1;padding:0;border-radius:8px;overflow:hidden;background:var(--line)}
.th img,.th video{width:100%;height:100%;object-fit:cover;display:block}
.pl{position:absolute;right:6px;bottom:4px;color:#fff;font-size:14px;text-shadow:0 0 4px #000}
.big.m{width:100%;max-height:68vh;object-fit:contain;border-radius:10px;background:#000}
.up{cursor:pointer}
#sheet ul{padding-left:20px;margin:6px 0}#sheet li{margin:5px 0}
`;
document.head.appendChild(st);

/* данные: текст в localStorage, фото и видео в IndexedDB */
const CK='crm-v1';
let C={people:[]};
try{const j=JSON.parse(localStorage.getItem(CK));if(j&&Array.isArray(j.people))C=j}catch(e){}
const sv=()=>{try{localStorage.setItem(CK,JSON.stringify(C));return true}catch(e){toast('Не удалось сохранить данные');return false}};
window.crmGet=()=>C;
window.crmSet=c=>{if(c&&Array.isArray(c.people)){C=c;sv()}};
const P=id=>C.people.find(p=>p.id===id);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

const idb=new Promise((res,rej)=>{const r=indexedDB.open('crm-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('m',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const tx=(mode,fn)=>idb.then(d=>new Promise((res,rej)=>{const t=d.transaction('m',mode);const q=fn(t.objectStore('m'));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)}));
const mPut=o=>tx('readwrite',s=>s.put(o));
const mGet=id=>tx('readonly',s=>s.get(id));
const mDel=id=>tx('readwrite',s=>s.delete(id));
const urls={};
async function url(id){if(urls[id])return urls[id];const r=await mGet(id);return r?(urls[id]=URL.createObjectURL(r.blob)):''}
async function hydrate(root){for(const el of root.querySelectorAll('[data-m]')){const u=await url(el.dataset.m);if(u)el.src=u+(el.tagName==='VIDEO'?'#t=0.1':'')}}
async function shrink(f){const bm=await createImageBitmap(f);const k=Math.min(1,640/Math.max(bm.width,bm.height));const c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);return new Promise(r=>c.toBlob(r,'image/jpeg',.85))}
async function share(blob,name,type,u){
  const f=new File([blob],name,{type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f]});return}catch(e){if(e.name==='AbortError')return}}
  const a=document.createElement('a');a.href=u;a.download=name;a.click();
}

window.mdb={mPut,mGet,mDel,url,share,uid};

/* отображение */
const rank=p=>p.sex?(p.ended?3:1):p.friend?4:p.ended?5:2;
const byName=(a,b)=>a.name.localeCompare(b.name,'ru');
const av=(p,big)=>p.photo?`<img class="av${big?' big':''}" data-m="${p.photo}" alt="">`:`<span class="av${big?' big':''}">${esc((p.name[0]||'?').toUpperCase())}</span>`;
const met=p=>[p.metWhen,p.metWhere].filter(Boolean).join(', ');
const lines=s=>s.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>/^https?:\/\//i.test(x)?`<a href="${esc(x)}" target="_blank" rel="noopener noreferrer">${esc(x.replace(/^https?:\/\/(www\.)?/i,''))}</a>`:esc(x)).join('<br>');
const tel=n=>`<a href="tel:${esc(n.replace(/[^\d+]/g,''))}">${esc(n)}</a>`;

function mini(p,flags,gap){
  return `<div class="pc${gap?' gap':''}" data-a="open" data-id="${p.id}">${av(p)}<div class="pi"><b>${esc(p.name)}</b>${flags?(p.sex?'<span class="tag">был секс</span>':'')+(p.ended?'<span class="tag">общение закончено</span>':'')+(p.friend?'<span class="tag">её друг</span>':''):''}
  ${met(p)?`<div class="mute">Познакомились: ${esc(met(p))}</div>`:''}${p.bday?`<div class="mute">День рождения: ${fdate(p.bday)}</div>`:''}${p.phone?`<div class="mute">${esc(p.phone)}</div>`:''}</div></div>`;
}
function vList(){
  const ps=[...C.people].sort((a,b)=>rank(a)-rank(b)||byName(a,b));
  let h='<button class="primary" data-a="new">+ Новая карточка</button>'+(ps.length?'<button class="ghost" data-a="exptxt">Выгрузить все карточки в текст</button>':''),last=0;
  if(!ps.length)h+='<p class="mute">Карточек пока нет. Создайте первую.</p>';
  ps.forEach(p=>{const r=rank(p);h+=mini(p,true,last&&r!==last);last=r});
  return h;
}
function vCard(p){
  const m=[...p.meets].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))[0];
  const inf=(k,v)=>v?`<div class="inf"><span>${k}</span><span>${v}</span></div>`:'';
  const blk=(t,s)=>s?`<h2>${t}</h2><p class="txt">${esc(s)}</p>`:'';
  const ck=(f,t)=>`<label class="ck"><input type="checkbox" data-f="${f}" ${p[f]?'checked':''}> ${t}</label>`;
  const ta=(k,t,n)=>`<label>${t}<textarea data-t="${k}" rows="${n}">${esc(p[k]||'')}</textarea></label>`;
  const ln=p.links.map(P).filter(Boolean).sort(byName);
  return `<button class="ghost" data-a="list">‹ Все карточки</button>
  <div class="hd">${av(p,1)}<h1>${esc(p.name)}</h1></div>
  <div class="acts"><button class="sm" data-a="edit">Изменить</button><button class="sm" data-a="media">Медиа · ${p.media.length}</button></div>
  ${inf('Познакомились',esc(met(p)))}${inf('День рождения',p.bday?fdate(p.bday):'')}${inf('Телефон',p.phone?tel(p.phone):'')}${inf('Соцсети',lines(p.socials||''))}
  ${blk('Личная информация',p.bio)}${blk('Ключевые воспоминания',p.memories)}${blk('Совместные планы',p.plans)}
  <h2>Последняя встреча</h2>
  <div class="w" data-a="meets">${m?`<b>${fdate(m.date)}</b><div class="clip">${esc(m.text)}</div>${p.meets.length>1?`<div class="mute" style="margin-top:6px">Всего встреч: ${p.meets.length}. Нажмите, чтобы открыть историю.</div>`:''}`:'<span class="mute">Встреч пока нет. Нажмите, чтобы добавить.</span>'}</div>
  <h2>Общий круг</h2>
  ${ln.map(q=>mini(q,false)).join('')}
  <button class="ghost" data-a="linkpick">+ Связать с карточкой</button>
  <h2>Отметки</h2>
  ${ck('sex','был секс')}${p.sex?ta('sexNotes','Заметки о сексе',4):''}
  ${ck('ended','общение закончено')}${p.ended?ta('reason','Причина',3):''}
  ${ck('friend','её друг')}`;
}
function vEdit(p){
  const n=!p;p=p||{name:'',metWhen:'',metWhere:'',bday:'',phone:'',socials:'',bio:'',memories:'',plans:''};
  const f=(k,t,x='')=>`<label>${t}<input id="f_${k}" value="${esc(p[k]||'')}" ${x}></label>`;
  const ta=(k,t,r)=>`<label>${t}<textarea id="f_${k}" rows="${r}">${esc(p[k]||'')}</textarea></label>`;
  return `<button class="ghost" data-a="${n?'list':'open'}" data-id="${p.id||''}">‹ Отмена</button>
  <h1>${n?'Новая карточка':'Изменить карточку'}</h1>
  <div class="hd"><div id="ph_prev">${n?'<span class="av big">?</span>':av(p,1)}</div><div><label class="sm up">Выбрать фото<input type="file" id="ph" accept="image/*" hidden></label>${!n&&p.photo?'<button class="ghost" data-a="rmph">Убрать фото</button>':''}</div></div>
  ${f('name','Имя')}${f('metWhen','Когда познакомились','placeholder="Дата или период"')}${f('metWhere','Где познакомились')}
  <label>День рождения<input type="date" id="f_bday" value="${esc(p.bday||'')}"></label>${f('phone','Телефон','type="tel"')}
  ${ta('socials','Соцсети (по одной ссылке в строке)',3)}${ta('bio','Личная информация, биография',4)}${ta('memories','Ключевые совместные воспоминания',4)}${ta('plans','Совместные планы',3)}
  <button class="primary" data-a="save">Сохранить</button>
  ${n?'':'<button class="del" style="margin-top:14px;font-size:16px" data-a="del">Удалить карточку</button>'}`;
}
function vMedia(p){
  return `<button class="ghost" data-a="open" data-id="${p.id}">‹ ${esc(p.name)}</button><h1>Медиа</h1>
  <label class="sm up">+ Добавить фото и видео<input type="file" id="mf" accept="image/*,video/*" multiple hidden></label>
  <p class="mute">Файлы копируются в приложение и останутся здесь, даже если удалить их из галереи телефона.</p>
  <div class="gr">${p.media.map(m=>`<button class="th" data-a="view" data-id="${m.id}">${m.kind==='video'?`<video data-m="${m.id}" preload="metadata" muted playsinline></video><span class="pl">▶</span>`:`<img data-m="${m.id}" alt="">`}</button>`).join('')}</div>`;
}

let v={n:'list'},draft={};
function show(keep){
  const y=window.scrollY,p=v.id?P(v.id):null;
  if((v.n==='card'||v.n==='media')&&!p)v={n:'list'};
  const b=$('#crmbody');
  b.innerHTML=v.n==='card'?vCard(p):v.n==='edit'?vEdit(p):v.n==='media'?vMedia(p):vList();
  hydrate(b);window.scrollTo(0,keep?y:0);
}
window.crmShow=()=>{v={n:'list'};show()};

/* действия */
function link(a,b,on){[[a,b],[b,a]].forEach(([x,y])=>{const p=P(x);p.links=p.links.filter(i=>i!==y);if(on)p.links.push(y)})}
async function saveForm(id){
  const g=k=>$('#f_'+k).value.trim();
  if(!g('name')){toast('Укажите имя');return}
  let p=id?P(id):null;
  if(!p){p={id:uid(),media:[],meets:[],links:[],sex:false,sexNotes:'',ended:false,reason:'',friend:false,photo:null};C.people.push(p)}
  Object.assign(p,{name:g('name'),metWhen:g('metWhen'),metWhere:g('metWhere'),bday:$('#f_bday').value,phone:g('phone'),socials:g('socials'),bio:g('bio'),memories:g('memories'),plans:g('plans')});
  try{
    if(draft.blob||draft.rm){
      if(p.photo){await mDel(p.photo);delete urls[p.photo];p.photo=null}
      if(draft.blob){const mid=uid();await mPut({id:mid,blob:draft.blob});p.photo=mid}
    }
  }catch(e){toast('Не удалось сохранить фото')}
  if(sv()){v={n:'card',id:p.id};show();toast('Карточка сохранена')}
}
async function delPerson(id){
  const p=P(id);if(!p||!confirm('Удалить карточку «'+p.name+'» вместе с фото и медиа?'))return;
  try{for(const m of p.media)await mDel(m.id);if(p.photo)await mDel(p.photo)}catch(e){}
  C.people=C.people.filter(q=>q.id!==id);C.people.forEach(q=>q.links=q.links.filter(i=>i!==id));
  sv();v={n:'list'};show();toast('Карточка удалена');
}
function meetsSheet(p){
  const ms=[...p.meets].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
  openSheet(`<h2>Встречи</h2><label>Дата<input type="date" id="mt_d" value="${iso(new Date())}"></label><label>Заметка<textarea id="mt_t" rows="3"></textarea></label><button class="primary" id="mt_s">Добавить встречу</button>
  ${ms.map(m=>`<div class="day"><div class="dh"><b>${fdate(m.date)}</b><button class="del" style="padding:0" data-md="${m.id}">Удалить</button></div><div class="txt">${esc(m.text)}</div></div>`).join('')}
  <button class="ghost" id="mt_x">Закрыть</button>`);
  $('#mt_x').onclick=closeSheet;
  $('#mt_s').onclick=()=>{
    const d=$('#mt_d').value,t=$('#mt_t').value.trim();
    if(!d||!t){toast('Нужны дата и заметка');return}
    p.meets.push({id:uid(),date:d,text:t});sv();show(true);meetsSheet(p);
  };
  $('#sheet').onclick=e=>{const b=e.target.closest('[data-md]');if(!b||!confirm('Удалить эту встречу?'))return;p.meets=p.meets.filter(m=>m.id!==b.dataset.md);sv();show(true);meetsSheet(p)};
}
function linkSheet(p){
  const o=C.people.filter(q=>q.id!==p.id).sort(byName);
  openSheet(`<h2>Общий круг</h2>${o.length?o.map(q=>`<label class="ck"><input type="checkbox" data-l="${q.id}" ${p.links.includes(q.id)?'checked':''}> ${esc(q.name)}</label>`).join(''):'<p class="mute">Сначала создайте другие карточки.</p>'}<button class="primary" id="l_ok">Готово</button>`);
  $('#l_ok').onclick=()=>{closeSheet();show(true)};
  $('#sheet').onchange=e=>{const id=e.target.dataset.l;if(id){link(p.id,id,e.target.checked);sv()}};
}
async function viewer(p,mid){
  const m=p.media.find(x=>x.id===mid);if(!m)return;
  const u=await url(mid);
  openSheet(`${m.kind==='video'?`<video class="big m" src="${u}" controls playsinline></video>`:`<img class="big m" src="${u}" alt="">`}
  <div class="acts" style="margin-top:12px"><button class="sm" id="v_dl">Скачать</button><button class="sm" id="v_del" style="color:var(--bad);border-color:var(--bad)">Удалить</button><button class="sm" id="v_x">Закрыть</button></div>`);
  $('#v_x').onclick=closeSheet;
  $('#v_dl').onclick=async()=>{const r=await mGet(mid);if(r)share(r.blob,m.name,m.type,u)};
  $('#v_del').onclick=async()=>{
    if(!confirm('Удалить этот файл из приложения?'))return;
    try{await mDel(mid)}catch(e){}
    delete urls[mid];p.media=p.media.filter(x=>x.id!==mid);sv();closeSheet();show(true);
  };
}

function exportText(){
  if(!C.people.length){toast('Карточек пока нет');return}
  const ps=[...C.people].sort((a,b)=>rank(a)-rank(b)||byName(a,b));
  const out=['CRM — выгрузка от '+fdate(iso(new Date())),'Карточек: '+ps.length,''];
  ps.forEach(p=>{
    out.push('==============================',p.name,'==============================');
    const add=(k,x)=>{if(x&&String(x).trim())out.push(k+': '+String(x).trim())};
    const blk=(k,x)=>{if(x&&x.trim())out.push('',k+':',x.trim())};
    add('Когда познакомились',p.metWhen);add('Где познакомились',p.metWhere);add('День рождения',p.bday&&fdate(p.bday));add('Телефон',p.phone);
    blk('Соцсети',p.socials);blk('Личная информация',p.bio);blk('Ключевые воспоминания',p.memories);blk('Совместные планы',p.plans);
    if(p.meets.length){out.push('','История встреч:');[...p.meets].sort((a,b)=>a.date.localeCompare(b.date)).forEach(m=>out.push('  '+fdate(m.date)+' — '+m.text.replace(/\n/g,'\n    ')))}
    const ln=p.links.map(P).filter(Boolean).map(q=>q.name);if(ln.length)out.push('','Общий круг: '+ln.join(', '));
    const fl=[p.sex&&'был секс',p.ended&&'общение закончено',p.friend&&'её друг'].filter(Boolean);
    if(fl.length)out.push('','Отметки: '+fl.join(', '));
    if(p.sex)blk('Заметки о сексе',p.sexNotes);
    if(p.ended)blk('Причина',p.reason);
    if(p.media.length)out.push('','Медиафайлов в приложении: '+p.media.length+' (в выгрузку не входят)');
    out.push('','');
  });
  const blob=new Blob([out.join('\n')],{type:'text/plain'});
  share(blob,'crm-'+iso(new Date())+'.txt','text/plain',URL.createObjectURL(blob));
}
document.addEventListener('click',e=>{
  if(!e.target.closest('[data-help="crm"]'))return;
  openSheet(`<h2>Инструкция по CRM</h2>
<p class="mute">Здесь хранятся карточки знакомых, чтобы ничего о людях не забывать. Всё лежит только в этом телефоне.</p>
<h2>Создать карточку</h2>
<ul><li>Нажмите «+ Новая карточка». Обязательно только имя, остальное заполняйте по желанию.</li>
<li>Поля: фото, когда и где познакомились, день рождения, телефон, соцсети (по одной ссылке в строке), личная информация, ключевые воспоминания, совместные планы.</li>
<li>Фото копируется в приложение, поэтому его можно спокойно удалить из галереи телефона.</li></ul>
<h2>Список</h2>
<ul><li>В списке видны фото, имя, где и когда познакомились, день рождения, телефон и отметки. Нажмите на карточку, чтобы открыть всю информацию.</li>
<li>Порядок групп сверху вниз: «был секс»; без отметок; «был секс» и «общение закончено»; «её друг»; только «общение закончено». Между группами увеличенный отступ. Внутри группы по алфавиту.</li></ul>
<h2>Внутри карточки</h2>
<ul><li><b>Изменить</b>: правка всех полей, фото и удаление карточки.</li>
<li><b>Последняя встреча</b>: виджет показывает дату и заметку последней встречи. Нажмите на него, чтобы увидеть всю историю, добавить встречу (дата и текст) или удалить ненужную.</li>
<li><b>Общий круг</b>: «+ Связать с карточкой» связывает людей с общими знакомыми. Связь двусторонняя: она появится в обеих карточках. Нажмите на виджет связанного человека, чтобы перейти к его карточке.</li>
<li><b>Отметки</b>: «был секс», «общение закончено», «её друг». Поставить и снять «был секс» можно только после подтверждения. Пока заполнены «Заметки о сексе», отметку снять нельзя: сначала очистите заметки. У «общение закончено» появляется поле «Причина».</li>
<li>Текстовые поля отметок сохраняются автоматически, когда вы выходите из поля.</li></ul>
<h2>Медиа</h2>
<ul><li>Кнопка «Медиа» открывает галерею человека. «+ Добавить» загружает фото и видео, можно выбрать сразу несколько.</li>
<li>Файлы копируются в приложение и остаются, даже если вы удалите их из галереи телефона. Смотреть их можно прямо здесь.</li>
<li>Нажмите на файл: «Скачать» откроет меню iPhone, где можно сохранить его в «Фото» или «Файлы». «Удалить» убирает файл только из приложения.</li></ul>
<h2>Выгрузка в текст</h2>
<ul><li>«Выгрузить все карточки в текст» внизу под кнопкой создания собирает все заполненные поля всех карточек в один читаемый файл .txt. Фото и видео в него не входят.</li>
<li>Готовый файл не защищён паролем. Храните и отправляйте его осторожно.</li></ul>
<h2>Пароль и сохранность</h2>
<ul><li>«Пароль» вверху экрана ставит, меняет или снимает пароль на раздел. Забытый пароль восстановить нельзя.</li>
<li>Пароль спросят снова после полного закрытия приложения.</li>
<li>Резервная копия в разделе «Учет часов» (Статистика → «Резервная копия данных») сохраняет и текст CRM, но не фото и видео. Если очистить данные Safari или удалить иконку, медиа пропадут безвозвратно.</li></ul>
<button class="ghost" id="hx">Закрыть</button>`);
  $('#hx').onclick=closeSheet;
});

const body=$('#crmbody');
body.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,id=b.dataset.id,p=v.id?P(v.id):null;
  if(a==='new'){draft={};v={n:'edit'};show()}
  else if(a==='list'){v={n:'list'};show()}
  else if(a==='open'){v={n:'card',id};show()}
  else if(a==='edit'){draft={};v={n:'edit',id:v.id};show()}
  else if(a==='media'){v={n:'media',id:v.id};show()}
  else if(a==='meets')meetsSheet(p);
  else if(a==='linkpick')linkSheet(p);
  else if(a==='view')viewer(p,id);
  else if(a==='save')saveForm(v.id);
  else if(a==='del')delPerson(v.id);
  else if(a==='exptxt')exportText();
  else if(a==='rmph'){draft.rm=true;draft.blob=null;$('#ph_prev').innerHTML='<span class="av big">?</span>';b.hidden=true}
});
body.addEventListener('change',async e=>{
  const t=e.target,p=v.id?P(v.id):null;
  if(t.id==='ph'&&t.files[0]){
    try{draft.blob=await shrink(t.files[0]);draft.rm=false;$('#ph_prev').innerHTML=`<img class="av big" src="${URL.createObjectURL(draft.blob)}" alt="">`}catch(x){toast('Не удалось открыть это фото')}
    t.value='';
  }else if(t.id==='mf'&&p){
    let bad=0;
    for(const f of t.files){
      const id=uid();
      try{await mPut({id,blob:f});p.media.push({id,kind:f.type.startsWith('video')?'video':'photo',name:f.name||('media-'+id),type:f.type})}catch(x){bad++}
    }
    sv();t.value='';show(true);
    if(bad)toast('Не удалось сохранить файлов: '+bad+'. Возможно, не хватает места.');
  }else if(t.dataset.t&&p){p[t.dataset.t]=t.value;sv()}
  else if(t.dataset.f&&p){
    const f=t.dataset.f,on=t.checked;
    if(f==='sex'){
      if(on){if(!confirm('Отметить «был секс»?')){t.checked=false;return}}
      else{
        if((p.sexNotes||'').trim()){t.checked=true;alert('Сначала полностью очистите «Заметки о сексе», затем можно будет снять отметку.');return}
        if(!confirm('Снять отметку «был секс»?')){t.checked=true;return}
        p.sexNotes='';
      }
    }
    p[f]=on;sv();show(true);
  }
});
})();
