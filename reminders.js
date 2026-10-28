(()=>{
const st=document.createElement('style');
st.textContent=`
#rembody textarea{display:block;width:100%;margin-top:4px;padding:11px 12px;font:inherit;font-size:17px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;resize:vertical}
.ri{margin-top:8px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;cursor:pointer}
.ri.past{opacity:.7}
.ri b{font-variant-numeric:tabular-nums}
`;
document.head.appendChild(st);

const RK='rem-v1';
let R={items:[]};
try{const j=JSON.parse(localStorage.getItem(RK));if(j&&Array.isArray(j.items))R=j}catch(e){}
const sv=()=>{try{localStorage.setItem(RK,JSON.stringify(R));return true}catch(e){toast('Не удалось сохранить');return false}};
window.remGet=()=>R;
window.remSet=r=>{if(r&&Array.isArray(r.items)){R=r;sv()}};

const when=w=>{const [d,t]=w.split('T');return fdate(d)+', '+t};
const past=r=>new Date(r.when)<new Date();
const by=r=>r.when;
async function hy(root){for(const el of root.querySelectorAll('[data-m]')){const u=await mdb.url(el.dataset.m);if(u)el.src=u+(el.tagName==='VIDEO'?'#t=0.1':'')}}
const thumb=m=>`<button class="th" data-mv="${m.id}">${m.kind==='video'?`<video data-m="${m.id}" preload="metadata" muted playsinline></video><span class="pl">▶</span>`:`<img data-m="${m.id}" alt="">`}</button>`;

let v='list',draft={files:[]};

function vList(){
  const up=R.items.filter(r=>!past(r)).sort((a,b)=>by(a).localeCompare(by(b)));
  const ps=R.items.filter(past).sort((a,b)=>by(b).localeCompare(by(a)));
  const it=r=>`<div class="ri${past(r)?' past':''}" data-id="${r.id}"><b>${esc(when(r.when))}</b>${r.media.length?`<span class="tag">файлов: ${r.media.length}</span>`:''}<div class="clip">${esc(r.text)}</div><button class="del" data-del="${r.id}">Удалить</button></div>`;
  return '<button class="primary" data-a="new">+ Новое напоминание</button>'
    +(up.length?'<h2>Предстоящие</h2>'+up.map(it).join(''):'')
    +(ps.length?'<h2>История</h2>'+ps.map(it).join('')+'<button class="ghost" data-a="clr">Очистить историю</button>':'')
    +(R.items.length?'':'<p class="mute">Напоминаний пока нет.</p>');
}
function vNew(){
  return `<button class="ghost" data-a="list">‹ Отмена</button><h1>Новое напоминание</h1>
  <label>Текст<textarea id="r_t" rows="4"></textarea></label>
  <div class="grid2"><label>Дата<input type="date" id="r_d"></label><label>Время<input type="time" id="r_h"></label></div>
  <label class="sm up">+ Прикрепить фото и видео<input type="file" id="r_f" accept="image/*,video/*" multiple hidden></label>
  <div id="r_fl" class="mute" style="margin-bottom:12px"></div>
  <button class="primary" data-a="save">Сохранить</button>
  <p class="mute">Чтобы пришло уведомление, после сохранения добавьте напоминание в Календарь iPhone.</p>`;
}
function flist(){
  const el=$('#r_fl');if(!el)return;
  el.innerHTML=draft.files.length?'Прикреплено: '+draft.files.map(f=>esc(f.name)).join(', ')+'<button class="ghost" data-a="clrf" style="padding:0 0 0 10px">Убрать все</button>':'';
}
function show(){
  $('#rembody').innerHTML=v==='new'?vNew():vList();
  if(v==='new'){const d=new Date(Date.now()+36e5);$('#r_d').value=iso(d);$('#r_h').value=pad(d.getHours())+':00';flist()}
  else hy($('#rembody'));
  window.scrollTo(0,0);
}
window.remShow=()=>{v='list';show()};

async function remove(rs){
  for(const r of rs)for(const m of r.media){try{await mdb.mDel(m.id)}catch(e){}}
  const ids=new Set(rs.map(r=>r.id));
  R.items=R.items.filter(r=>!ids.has(r.id));sv();show();
}
async function save(){
  const text=$('#r_t').value.trim(),d=$('#r_d').value,h=$('#r_h').value;
  if(!text||!d||!h){toast('Нужны текст, дата и время');return}
  const r={id:mdb.uid(),text,when:d+'T'+h,media:[]};let bad=0;
  for(const f of draft.files){
    const id=mdb.uid();
    try{await mdb.mPut({id,blob:f});r.media.push({id,kind:f.type.startsWith('video')?'video':'photo',name:f.name||('media-'+id),type:f.type})}catch(e){bad++}
  }
  R.items.push(r);
  if(!sv()){R.items.pop();return}
  v='list';draft={files:[]};show();
  if(bad)toast('Не удалось сохранить файлов: '+bad);
  detail(r,true);
}

/* Календарь: событие с сигналом в нужное время */
function cal(r){
  const q=s=>s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const [d,t]=r.when.split('T');
  const s=d.replace(/-/g,'')+'T'+t.replace(':','')+'00';
  const e=new Date(new Date(r.when).getTime()+30*60000);
  const end=iso(e).replace(/-/g,'')+'T'+pad(e.getHours())+pad(e.getMinutes())+'00';
  const now=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
  const title=r.text.split('\n')[0].slice(0,80);
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Moi Chasy//RU','CALSCALE:GREGORIAN','BEGIN:VEVENT','UID:'+r.id+'@moi-chasy','DTSTAMP:'+now,'DTSTART:'+s,'DTEND:'+end,'SUMMARY:'+q(title),'DESCRIPTION:'+q(r.text),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+q(title),'TRIGGER:PT0S','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'});
  mdb.share(blob,'napominanie.ics','text/calendar',URL.createObjectURL(blob));
}

function detail(r,fresh){
  openSheet(`<h2>${fresh?'Напоминание сохранено':'Напоминание'}</h2><b>${esc(when(r.when))}</b><p class="txt">${esc(r.text)}</p>
  ${r.media.length?`<div class="gr">${r.media.map(thumb).join('')}</div>`:''}
  <p class="mute" style="margin-top:14px">Чтобы уведомление пришло в это время, добавьте напоминание в Календарь iPhone. Если откроется меню, выберите «Календарь». Если нет, сохраните файл в «Файлы» и нажмите на него: Календарь предложит добавить событие.</p>
  <button class="primary" id="d_cal">Добавить в Календарь</button><button class="ghost" id="d_x">Закрыть</button>`);
  hy($('#sheet'));
  $('#d_x').onclick=closeSheet;
  $('#d_cal').onclick=()=>cal(r);
  $('#sheet').onclick=e=>{const b=e.target.closest('[data-mv]');if(b)mview(r,b.dataset.mv)};
}
async function mview(r,id){
  const m=r.media.find(x=>x.id===id);if(!m)return;
  const u=await mdb.url(id);
  openSheet(`${m.kind==='video'?`<video class="big m" src="${u}" controls playsinline></video>`:`<img class="big m" src="${u}" alt="">`}
  <div class="acts" style="margin-top:12px"><button class="sm" id="v_dl">Скачать</button><button class="sm" id="v_x">Назад</button></div>`);
  $('#v_x').onclick=()=>detail(r);
  $('#v_dl').onclick=async()=>{const x=await mdb.mGet(id);if(x)mdb.share(x.blob,m.name,m.type,u)};
}

const body=$('#rembody');
body.addEventListener('click',async e=>{
  const d=e.target.closest('[data-del]');
  if(d){const r=R.items.find(x=>x.id===d.dataset.del);if(r&&confirm('Удалить это напоминание вместе с файлами?'))await remove([r]);return}
  const b=e.target.closest('[data-a]');
  if(b){
    const a=b.dataset.a;
    if(a==='new'){draft={files:[]};v='new';show()}
    else if(a==='list'){v='list';show()}
    else if(a==='save')save();
    else if(a==='clrf'){draft.files=[];flist()}
    else if(a==='clr'){const ps=R.items.filter(past);if(ps.length&&confirm('Удалить всю историю ('+ps.length+' шт.) вместе с файлами?'))await remove(ps)}
    return;
  }
  const it=e.target.closest('.ri');
  if(it){const r=R.items.find(x=>x.id===it.dataset.id);if(r)detail(r)}
});
body.addEventListener('change',e=>{
  if(e.target.id==='r_f'){const fs=[...e.target.files];e.target.value='';draft.files.push(...fs);flist()}
});
})();
