(()=>{
const SK='store-v1';
let S={folders:[],files:[]};
try{const j=JSON.parse(localStorage.getItem(SK));if(j&&Array.isArray(j.folders)&&Array.isArray(j.files))S=j}catch(e){}
const sv=()=>{try{localStorage.setItem(SK,JSON.stringify(S));return true}catch(e){toast('Не удалось сохранить данные');return false}};
const fol=id=>S.folders.find(f=>f.id===id);
const byName=(a,b)=>a.name.localeCompare(b.name,'ru');
const fmtSize=n=>n<1024?n+' Б':n<1048576?Math.round(n/1024)+' КБ':(n/1048576).toFixed(1)+' МБ';
let cur='';

function pathOf(id){const p=[];let f=fol(id);while(f){p.unshift(f);f=fol(f.parent)}return p}
async function hy(root){for(const el of root.querySelectorAll('[data-m]')){const u=await mdb.url(el.dataset.m);if(u)el.src=u+(el.tagName==='VIDEO'?'#t=0.1':'')}}

function view(keep){
  if(cur&&!fol(cur))cur='';
  const f=cur?fol(cur):null,y=window.scrollY;
  const subs=S.folders.filter(x=>x.parent===cur).sort(byName);
  const fs=S.files.filter(x=>x.folder===cur).sort((a,b)=>b.ts-a.ts);
  const cnt=id=>S.folders.filter(x=>x.parent===id).length+S.files.filter(x=>x.folder===id).length;
  const crumb=['Хранилище',...pathOf(cur).map(p=>p.name)].map(esc).join(' / ');
  const b=$('#storebody');
  b.innerHTML=`${f?`<div class="nav"><button class="ghost" data-a="up">‹ Назад</button><button class="ghost" data-a="ren">Переименовать</button><button class="ghost bad" data-a="delf">Удалить папку</button></div>`:''}
  <div class="mute">${crumb}</div>
  <div class="acts" style="margin-top:12px"><button class="sm" data-a="newf">+ Папка</button><label class="sm up">+ Фото и видео<input type="file" id="s_in" accept="image/*,video/*" multiple hidden></label></div>
  ${subs.map(x=>`<div class="pc" data-a="open" data-id="${x.id}"><span class="av" style="border-radius:12px">📁</span><div class="pi"><b>${esc(x.name)}</b><div class="mute">элементов: ${cnt(x.id)}</div></div></div>`).join('')}
  ${fs.length?`<div class="gr">${fs.map(m=>`<button class="th" data-a="view" data-id="${m.id}">${m.kind==='video'?`<video data-m="${m.id}" preload="metadata" muted playsinline></video><span class="pl">▶</span>`:`<img data-m="${m.id}" alt="">`}</button>`).join('')}</div>`:''}
  ${!subs.length&&!fs.length?'<p class="mute">Здесь пока пусто.</p>':''}
  <p class="mute" style="margin-top:22px">Файлы копируются в память приложения на этом устройстве и остаются здесь, даже если удалить их из галереи телефона. Они не синхронизируются с другими устройствами. Если очистить данные браузера или удалить иконку приложения, файлы пропадут.</p>`;
  hy(b);window.scrollTo(0,keep?y:0);
}
window.storeShow=()=>{cur='';view()};

function nameSheet(title,val,cb){
  openSheet(`<h2>${title}</h2><label>Название<input id="n_v" value="${esc(val)}" autocomplete="off"></label><button class="primary" id="n_ok">Сохранить</button><button class="ghost" id="n_x">Закрыть</button>`);
  const ok=()=>{const v=$('#n_v').value.trim();if(!v){toast('Введите название');return}closeSheet();cb(v)};
  $('#n_x').onclick=closeSheet;$('#n_ok').onclick=ok;$('#n_v').onkeydown=e=>{if(e.key==='Enter')ok()};
  setTimeout(()=>{const i=$('#n_v');if(i)i.focus()},60);
}
async function delFolder(id){
  const ids=[id];
  for(let i=0;i<ids.length;i++)S.folders.forEach(f=>{if(f.parent===ids[i])ids.push(f.id)});
  const fl=S.files.filter(x=>ids.includes(x.folder)),f=fol(id);
  if(!confirm(`Удалить папку «${f.name}» вместе со всем содержимым (файлов: ${fl.length})? Это нельзя отменить.`))return;
  for(const x of fl){try{await mdb.mDel(x.id)}catch(e){}}
  const parent=f.parent;
  S.files=S.files.filter(x=>!ids.includes(x.folder));S.folders=S.folders.filter(x=>!ids.includes(x.id));
  sv();cur=parent;view();
}
async function viewer(id){
  const m=S.files.find(x=>x.id===id);if(!m)return;
  const u=await mdb.url(id);
  openSheet(`${m.kind==='video'?`<video class="big m" src="${u}" controls playsinline></video>`:`<img class="big m" src="${u}" alt="">`}
  <div class="mute" style="margin-top:8px">${esc(m.name)} · ${fmtSize(m.size)} · ${fdate(iso(new Date(m.ts)))}</div>
  <div class="acts" style="margin-top:12px"><button class="sm" id="v_dl">Скачать</button><button class="sm" id="v_del" style="color:var(--bad);border-color:var(--bad)">Удалить</button><button class="sm" id="v_x">Закрыть</button></div>`);
  $('#v_x').onclick=closeSheet;
  $('#v_dl').onclick=async()=>{const r=await mdb.mGet(id);if(r)mdb.share(r.blob,m.name,m.type,u)};
  $('#v_del').onclick=async()=>{
    if(!confirm('Удалить этот файл из приложения?'))return;
    try{await mdb.mDel(id)}catch(e){}
    S.files=S.files.filter(x=>x.id!==id);sv();closeSheet();view(true);
  };
}

const body=$('#storebody');
body.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,id=b.dataset.id;
  if(a==='open'){cur=id;view()}
  else if(a==='up'){const f=fol(cur);cur=f?f.parent:'';view()}
  else if(a==='newf')nameSheet('Новая папка','',v=>{S.folders.push({id:mdb.uid(),name:v,parent:cur});sv();view(true)});
  else if(a==='ren'){const f=fol(cur);if(f)nameSheet('Переименовать папку',f.name,v=>{f.name=v;sv();view(true)})}
  else if(a==='delf')delFolder(cur);
  else if(a==='view')viewer(id);
});
body.addEventListener('change',async e=>{
  if(e.target.id!=='s_in')return;
  const fs=[...e.target.files];e.target.value='';
  let bad=0;
  for(const f of fs){
    const id=mdb.uid();
    try{await mdb.mPut({id,blob:f});S.files.push({id,folder:cur,name:f.name||('media-'+id),type:f.type,size:f.size,kind:f.type.startsWith('video')?'video':'photo',ts:Date.now()})}
    catch(x){bad++}
  }
  sv();view(true);
  if(bad)toast('Не удалось сохранить файлов: '+bad+'. Возможно, не хватает места.');
});
})();
