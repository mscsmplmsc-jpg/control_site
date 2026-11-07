(()=>{
const st=document.createElement('style');
st.textContent=`
.ev{margin-top:8px;padding:10px 12px;background:var(--card);border:1px solid var(--line);border-left-width:5px;border-radius:12px;cursor:pointer}
.ev b{font-variant-numeric:tabular-nums}
.dayh{margin:18px 0 0;font-size:17px}
.dayh.td{color:var(--acc)}
.dayh small{font-weight:400;color:var(--mute);font-size:13px;margin-left:6px}
.wk{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px}
.wk label{display:flex;align-items:center;gap:6px;margin:0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font-size:15px}
.wk input{width:18px;height:18px;margin:0}
.sw2{width:30px;height:30px;border-radius:50%;margin:0 6px 6px 0;border:2px solid transparent}
.sw2.on{border-color:var(--ink);box-shadow:inset 0 0 0 2px var(--bg)}
.kb{flex:1;padding:11px 8px;border:1px solid var(--acc);border-radius:10px;color:var(--acc);background:none;font-size:16px}
.kb.on{background:var(--acc);color:var(--onacc);font-weight:600}
`;
document.head.appendChild(st);

const SK='sched-v1';
const COLORS=['#d9534f','#e8923a','#d4b200','#4a9d5b','#2fa7a0','#4a7fd4','#8e6bbf','#8a949a'];
const DN=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],DFULL=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
let D={items:[]};
try{const j=JSON.parse(localStorage.getItem(SK));if(j&&Array.isArray(j.items))D=j}catch(e){}
const sv=()=>{try{localStorage.setItem(SK,JSON.stringify(D));return true}catch(e){toast('Не удалось сохранить данные');return false}};
window.schedGet=()=>D;
window.schedSet=d=>{if(d&&Array.isArray(d.items)){D=d;sv()}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let off=0;

const dowOf=s=>(new Date(s+'T12:00:00').getDay()+6)%7;
function weekDates(){
  const t=new Date();t.setHours(12,0,0,0);
  t.setDate(t.getDate()-((t.getDay()+6)%7)+off*7);
  return [...Array(7)].map((_,i)=>{const d=new Date(t);d.setDate(t.getDate()+i);return d});
}
function occ(date){
  const dow=dowOf(date);
  return D.items.filter(e=>e.kind==='once'?e.date===date:(e.days||[]).includes(dow)&&(!e.from||date>=e.from)&&(!e.until||date<=e.until)&&!(e.skip||[]).includes(date))
    .sort((a,b)=>(a.start||'99').localeCompare(b.start||'99'));
}
const timeOf=e=>e.start?e.start+(e.end?'–'+e.end:''):'весь день';

function view(keep){
  const y=window.scrollY,ds=weekDates(),today=iso(new Date());
  const a=ds[0],z=ds[6];
  const label=`${pad(a.getDate())}.${pad(a.getMonth()+1)} – ${pad(z.getDate())}.${pad(z.getMonth()+1)}.${z.getFullYear()}`;
  $('#schedbody').innerHTML=`<div class="pn"><button data-a="prev" aria-label="Предыдущая неделя" style="font-size:24px;padding:2px 16px;color:var(--acc)">‹</button><b>${label}</b><button data-a="next" aria-label="Следующая неделя" style="font-size:24px;padding:2px 16px;color:var(--acc)">›</button></div>
  <div class="acts">${off?'<button class="sm" data-a="now">Эта неделя</button>':''}</div>
  <button class="primary" data-a="new">+ Событие</button>
  ${ds.map((d,i)=>{
    const key=iso(d),list=occ(key);
    return `<h2 class="dayh${key===today?' td':''}">${DN[i]}, ${pad(d.getDate())}.${pad(d.getMonth()+1)}${key===today?'<small>сегодня</small>':''}</h2>`+
    (list.length?list.map(e=>`<div class="ev" style="border-left-color:${esc(e.color||'#8a949a')}" data-a="ev" data-id="${e.id}" data-d="${key}"><b>${esc(timeOf(e))}</b> ${esc(e.title)}${e.kind==='once'?' <span class="mute">· разовое</span>':''}${e.place?`<div class="mute">${esc(e.place)}</div>`:''}</div>`).join(''):'<div class="mute" style="margin-top:6px">Свободно</div>');
  }).join('')}`;
  window.scrollTo(0,keep?y:0);
}
window.schedShow=()=>{off=0;view()};

function evSheet(e,dateHint){
  let kind=e?e.kind:'week',col=e?e.color||COLORS[5]:COLORS[5];
  const days=e&&e.days?e.days:[dateHint?dowOf(dateHint):dowOf(iso(new Date()))];
  openSheet(`<h2>${e?'Изменить событие':'Новое событие'}</h2>
  <label>Название<input id="e_t" value="${esc(e?e.title:'')}" autocomplete="off"></label>
  <div class="seg2" style="display:flex;gap:8px;margin:4px 0 10px"><button type="button" id="e_w" class="kb">Каждую неделю</button><button type="button" id="e_o" class="kb">Один раз</button></div>
  <div id="e_wk"><div class="lbl">Дни недели</div><div class="wk">${DN.map((n,i)=>`<label><input type="checkbox" data-dw="${i}" ${days.includes(i)?'checked':''}> ${n}</label>`).join('')}</div>
    <div class="grid2"><label>Действует с<input type="date" id="e_f" value="${e&&e.from||''}"></label><label>Действует до<input type="date" id="e_u" value="${e&&e.until||''}"></label></div></div>
  <div id="e_on"><label>Дата<input type="date" id="e_d" value="${e&&e.date||dateHint||iso(new Date())}"></label></div>
  <div class="grid2"><label>Начало<input type="time" id="e_s" value="${e&&e.start||''}"></label><label>Конец<input type="time" id="e_e" value="${e&&e.end||''}"></label></div>
  <label>Место<input id="e_p" value="${esc(e?e.place||'':'')}" autocomplete="off"></label>
  <label>Заметка<input id="e_n" value="${esc(e?e.note||'':'')}" autocomplete="off"></label>
  <div class="lbl">Цвет</div><div id="e_c">${COLORS.map(c=>`<button type="button" class="sw2${c===col?' on':''}" data-c="${c}" style="background:${c}" aria-label="Цвет"></button>`).join('')}</div>
  <button class="primary" id="e_sv" style="margin-top:10px">Сохранить</button><button class="ghost" id="e_x">Закрыть</button>`);
  const paint=()=>{
    $('#e_w').classList.toggle('on',kind==='week');$('#e_o').classList.toggle('on',kind==='once');
    $('#e_wk').hidden=kind!=='week';$('#e_on').hidden=kind!=='once';
  };
  paint();
  $('#e_w').onclick=()=>{kind='week';paint()};$('#e_o').onclick=()=>{kind='once';paint()};
  $('#e_x').onclick=closeSheet;
  $('#sheet').onclick=ev=>{const b=ev.target.closest('#e_c .sw2');if(b){col=b.dataset.c;$$('#e_c .sw2').forEach(x=>x.classList.toggle('on',x===b))}};
  $('#e_sv').onclick=()=>{
    const title=$('#e_t').value.trim(),start=$('#e_s').value,end=$('#e_e').value;
    if(!title){toast('Введите название');return}
    if(start&&end&&end<=start){toast('Конец должен быть позже начала');return}
    const r={title,kind,start,end,place:$('#e_p').value.trim(),note:$('#e_n').value.trim(),color:col};
    if(kind==='week'){
      r.days=$$('[data-dw]').filter(x=>x.checked).map(x=>+x.dataset.dw);
      if(!r.days.length){toast('Выберите хотя бы один день недели');return}
      r.from=$('#e_f').value;r.until=$('#e_u').value;r.date='';
      if(r.from&&r.until&&r.until<r.from){toast('Дата окончания раньше начала');return}
    }else{
      r.date=$('#e_d').value;if(!r.date){toast('Укажите дату');return}
      r.days=[];r.from='';r.until='';
    }
    if(e)Object.assign(e,r,{skip:kind==='week'?(e.skip||[]):[]});else D.items.push({id:uid(),skip:[],...r});
    sv();closeSheet();view(true);
  };
}
function showSheet(e,date){
  const row=(k,v)=>v?`<div class="inf"><span>${k}</span><span>${v}</span></div>`:'';
  openSheet(`<h2 style="color:${esc(e.color||'inherit')}">${esc(e.title)}</h2>
  ${row('Когда',`${DFULL[dowOf(date)]}, ${fdate(date)}`)}${row('Время',esc(timeOf(e)))}${row('Повтор',e.kind==='week'?'каждую неделю: '+e.days.map(i=>DN[i]).join(', ')+(e.from?', с '+fdate(e.from):'')+(e.until?', до '+fdate(e.until):''):'разовое событие')}${row('Место',esc(e.place||''))}${row('Заметка',esc(e.note||''))}
  <div class="acts" style="margin-top:14px"><button class="sm" id="v_ed">Изменить</button>${e.kind==='week'?'<button class="sm" id="v_sk">Пропустить эту дату</button>':''}</div>
  <button class="ghost" id="v_del" style="color:var(--bad)">${e.kind==='week'?'Удалить из расписания':'Удалить событие'}</button><button class="ghost" id="v_x">Закрыть</button>`);
  $('#v_x').onclick=closeSheet;
  $('#v_ed').onclick=()=>evSheet(e,date);
  const sk=$('#v_sk');
  if(sk)sk.onclick=()=>{e.skip=[...(e.skip||[]),date];sv();closeSheet();view(true);toast('Эта дата пропущена, остальные остаются')};
  $('#v_del').onclick=()=>{if(!confirm(e.kind==='week'?'Удалить событие из расписания полностью (все недели)?':'Удалить это событие?'))return;D.items=D.items.filter(x=>x!==e);sv();closeSheet();view(true)};
}

const body=$('#schedbody');
body.addEventListener('click',e=>{
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a;
  if(a==='prev'){off--;view()}else if(a==='next'){off++;view()}else if(a==='now'){off=0;view()}
  else if(a==='new')evSheet(null);
  else if(a==='ev'){const ev=D.items.find(x=>x.id===b.dataset.id);if(ev)showSheet(ev,b.dataset.d)}
});
})();
