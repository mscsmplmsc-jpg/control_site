(()=>{
const st=document.createElement('style');
st.textContent=`
#tskbody textarea{display:block;width:100%;margin-top:4px;padding:11px 12px;font:inherit;font-size:17px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;resize:vertical}
.dot{width:12px;height:12px;border-radius:50%;flex:none;display:inline-block}
.tk{display:flex;gap:10px;align-items:center;margin-top:8px;padding:10px 12px;background:var(--card);border:1px solid var(--line);border-radius:12px;cursor:pointer}
.tk input[type=checkbox]{width:22px;height:22px;margin:0;flex:none}
.tk .pi{flex:1}
.tk.dn .pi b{text-decoration:line-through;color:var(--mute)}
.od{color:var(--bad);font-weight:600}
.bar2{height:6px;border-radius:3px;background:var(--line);margin:6px 0 3px;overflow:hidden}
.bar2 i{display:block;height:100%;background:var(--acc)}
.sw{width:34px;height:34px;border-radius:50%;margin:0 6px 6px 0;border:2px solid transparent;color:var(--mute);font-size:18px;background:var(--card)}
.sw.on{border-color:var(--ink);box-shadow:inset 0 0 0 2px var(--bg)}
.lg{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.lg input{margin:0}
`;
document.head.appendChild(st);

const TK='tasks-v1';
const COLORS=[['#d9534f','красный'],['#e8923a','оранжевый'],['#d4b200','жёлтый'],['#4a9d5b','зелёный'],['#2fa7a0','бирюзовый'],['#4a7fd4','синий'],['#8e6bbf','фиолетовый'],['#8a949a','серый']];
const PR=['нет','низкий','средний','высокий'];
const REP={day:'каждый день',week:'каждую неделю',month:'каждый месяц',year:'каждый год'};
function addRep(s,rep){
  const [y,m,d]=s.split('-').map(Number);
  if(rep==='day'||rep==='week')return iso(new Date(y,m-1,d+(rep==='day'?1:7)));
  const tm=m-1+(rep==='month'?1:12),last=new Date(y,tm+1,0).getDate();
  return iso(new Date(y,tm,Math.min(d,last)));
}
let T={projects:[],tasks:[],legend:{}};
try{const j=JSON.parse(localStorage.getItem(TK));if(j&&Array.isArray(j.projects)&&Array.isArray(j.tasks))T={legend:{},...j}}catch(e){}
const sv=()=>{try{localStorage.setItem(TK,JSON.stringify(T));return true}catch(e){toast('Не удалось сохранить данные');return false}};
window.tskGet=()=>T;
window.tskSet=t=>{if(t&&Array.isArray(t.projects)&&Array.isArray(t.tasks)){T={legend:{},...t};sv()}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>iso(new Date());
const proj=id=>T.projects.find(p=>p.id===id);
const task=id=>T.tasks.find(t=>t.id===id);
const over=t=>!t.done&&!!t.due&&t.due<today();
const cname=c=>(COLORS.find(x=>x[0]===c)||[0,''])[1];
const dot=c=>c?`<span class="dot" style="background:${esc(c)}"></span>`:'';
const cdate=ts=>{const d=new Date(ts);return fdate(iso(d))+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const dueCmp=(a,b)=>(a.due||'9').localeCompare(b.due||'9');
const sortT=(a,b)=>((+!!a.done)-(+!!b.done))||((b.prio|0)-(a.prio|0))||dueCmp(a,b)||((a.created|0)-(b.created|0));
const opts=(l,s)=>l.map(([v,t])=>`<option value="${v}"${String(v)===String(s)?' selected':''}>${t}</option>`).join('');

/* отображение */
function row(t,withProj){
  const p=withProj&&proj(t.pid);
  const subs=t.subs.length?`подзадачи ${t.subs.filter(s=>s.done).length}/${t.subs.length}`:'';
  const meta=[p?esc(p.name):'',t.due?`<span class="${over(t)?'od':''}">${fdate(t.due)}</span>`:'',t.prio?PR[t.prio]:'',t.rep?'↻ '+REP[t.rep]:'',subs].filter(Boolean).join(' · ');
  return `<div class="tk${t.done?' dn':''}" data-a="task" data-id="${t.id}"><input type="checkbox" data-chk="${t.id}" ${t.done?'checked':''} aria-label="Выполнено">${dot(t.color)}<div class="pi"><b>${esc(t.title)}</b>${meta?`<div class="mute">${meta}</div>`:''}</div></div>`;
}
function pcard(p){
  const all=T.tasks.filter(t=>t.pid===p.id),dn=all.filter(t=>t.done).length;
  return `<div class="pc" data-a="proj" data-id="${p.id}">${dot(p.color)}<div class="pi" style="flex:1"><b>${esc(p.name)}</b>${p.prio?`<span class="tag">${PR[p.prio]}</span>`:''}${p.tags.length?`<div class="mute">${p.tags.map(x=>'#'+esc(x)).join(' ')}</div>`:''}<div class="bar2"><i style="width:${all.length?Math.round(dn/all.length*100):0}%"></i></div><div class="mute">Выполнено ${dn} из ${all.length}</div></div></div>`;
}
let F={},v={n:'home'};
const todayList=()=>T.tasks.filter(t=>!t.archived&&!t.done&&t.due&&t.due<=today());

function res(){
  const q=(F.q||'').trim().toLowerCase();
  if(q){
    const m=T.tasks.filter(t=>!t.archived&&(t.title+' '+(t.desc||'')+' '+t.comments.map(c=>c.text).join(' ')).toLowerCase().includes(q));
    return m.length?m.sort(sortT).map(t=>row(t,1)).join(''):'<p class="mute">Ничего не найдено.</p>';
  }
  const ps=T.projects.filter(p=>!F.tag||p.tags.includes(F.tag)).sort((a,b)=>(b.prio|0)-(a.prio|0)||a.name.localeCompare(b.name,'ru'));
  return ps.length?ps.map(pcard).join(''):'<p class="mute">Проектов пока нет. Создайте первый.</p>';
}
function vHome(){
  const tags=[...new Set(T.projects.flatMap(p=>p.tags))].sort();
  const n=todayList().length;
  return `<div class="acts"><button class="sm" data-a="today">Сегодня${n?' · '+n:''}</button><button class="sm" data-a="arch">Архив</button>${T.projects.length?'<button class="sm" data-a="quick">Быстрое добавление</button>':''}</div>
  <input id="t_q" placeholder="Поиск по задачам" value="${esc(F.q||'')}" style="margin-bottom:10px">
  <label>Тег<select id="t_tag">${opts([['','Все проекты'],...tags.map(x=>[x,'#'+x])],F.tag||'')}</select></label>
  <button class="primary" data-a="newp">+ Новый проект</button>
  <div id="t_res">${res()}</div>`;
}
function vProj(p){
  const all=T.tasks.filter(t=>t.pid===p.id),dn=all.filter(t=>t.done).length;
  let ts=all.filter(t=>!t.archived);
  if(F.st==='act')ts=ts.filter(t=>!t.done);else if(F.st==='done')ts=ts.filter(t=>t.done);else if(F.st==='over')ts=ts.filter(over);
  if(F.pr)ts=ts.filter(t=>String(t.prio|0)===F.pr);
  ts.sort(sortT);
  return `<button class="ghost" data-a="home">‹ Проекты</button>
  <div class="hd" style="margin:4px 0 8px">${dot(p.color)}<h1 style="margin:0">${esc(p.name)}</h1></div>
  <div class="mute">${p.prio?'Приоритет: '+PR[p.prio]+'. ':''}${p.tags.map(x=>'#'+esc(x)).join(' ')}</div>
  ${p.desc?`<p class="txt">${esc(p.desc)}</p>`:''}
  <div class="bar2"><i style="width:${all.length?Math.round(dn/all.length*100):0}%"></i></div><div class="mute">Выполнено ${dn} из ${all.length}</div>
  <div class="acts" style="margin-top:12px"><button class="sm" data-a="editp">Изменить проект</button><button class="sm" data-a="archdone">В архив выполненные</button></div>
  <button class="primary" data-a="newt">+ Новая задача</button>
  <button class="sm" data-a="quick" style="margin-top:10px">Быстрое добавление</button>
  <div class="grid2" style="margin-top:12px">
    <label>Статус<select id="f_st">${opts([['','Все'],['act','Активные'],['done','Выполненные'],['over','Просроченные']],F.st||'')}</select></label>
    <label>Приоритет<select id="f_pr">${opts([['','Любой'],['3','Высокий'],['2','Средний'],['1','Низкий'],['0','Без приоритета']],F.pr||'')}</select></label>
  </div>
  ${ts.length?ts.map(t=>row(t)).join(''):'<p class="mute">Задач нет.</p>'}`;
}
function vTask(t){
  const p=proj(t.pid);
  return `<button class="ghost" data-a="proj" data-id="${t.pid}">‹ ${esc(p?p.name:'Проект')}</button>
  <div class="hd" style="margin:4px 0 8px"><input type="checkbox" data-chk="${t.id}" ${t.done?'checked':''} style="width:26px;height:26px;margin:0;flex:none"><h1 style="margin:0${t.done?';text-decoration:line-through':''}">${esc(t.title)}</h1></div>
  <div class="inf"><span>Срок</span><span class="${over(t)?'od':''}">${t.due?fdate(t.due):'не задан'}</span></div>
  <div class="inf"><span>Приоритет</span><span>${PR[t.prio|0]}</span></div>
  ${t.rep?`<div class="inf"><span>Повтор</span><span>${REP[t.rep]}</span></div>`:''}
  ${t.color?`<div class="inf"><span>Цвет</span><span>${dot(t.color)} ${esc(T.legend[t.color]||cname(t.color))}</span></div>`:''}
  ${t.desc?`<h2>Описание</h2><p class="txt">${esc(t.desc)}</p>`:''}
  <h2>Подзадачи</h2>
  ${t.subs.map(s=>`<label class="ck"><input type="checkbox" data-sub="${s.id}" ${s.done?'checked':''}><span style="flex:1${s.done?';text-decoration:line-through;color:var(--mute)':''}">${esc(s.t)}</span><button type="button" class="del" data-a="delsub" data-id="${s.id}" style="padding:0">×</button></label>`).join('')}
  <div class="row" style="grid-template-columns:1fr auto"><input id="s_new" placeholder="Новая подзадача"><button class="sm" data-a="addsub" style="margin:0">+</button></div>
  <h2>Комментарии</h2>
  ${t.comments.map(c=>`<div class="day"><div class="dh"><span class="mute">${cdate(c.ts)}</span><button class="del" data-a="delcm" data-id="${c.id}" style="padding:0">Удалить</button></div><div class="txt">${esc(c.text)}</div></div>`).join('')}
  <textarea id="c_new" rows="2" placeholder="Комментарий" style="margin-top:10px"></textarea><button class="ghost" data-a="addcm">Добавить комментарий</button>
  <div class="acts" style="margin-top:18px"><button class="sm" data-a="editt">Изменить</button><button class="sm" data-a="toarch">В архив</button><button class="sm" data-a="delt" style="color:var(--bad);border-color:var(--bad)">Удалить</button></div>`;
}
function vToday(){
  const l=todayList().sort((a,b)=>dueCmp(a,b)||((b.prio|0)-(a.prio|0)));
  const od=l.filter(t=>t.due<today()),td=l.filter(t=>t.due===today());
  return `<button class="ghost" data-a="home">‹ Проекты</button><h1>Сегодня</h1>
  ${od.length?'<h2>Просрочено</h2>'+od.map(t=>row(t,1)).join(''):''}
  ${td.length?'<h2>На сегодня</h2>'+td.map(t=>row(t,1)).join(''):''}
  ${l.length?'':'<p class="mute">На сегодня задач нет.</p>'}`;
}
function vArch(){
  const l=T.tasks.filter(t=>t.archived).sort((a,b)=>(b.doneAt|0)-(a.doneAt|0));
  return `<button class="ghost" data-a="home">‹ Проекты</button><h1>Архив</h1>
  ${l.map(t=>{const p=proj(t.pid);return `<div class="day"><div class="dh"><b>${esc(t.title)}</b><span class="mute">${p?esc(p.name):''}</span></div>${t.doneAt?`<div class="mute">Выполнено ${fdate(iso(new Date(t.doneAt)))}</div>`:''}<button class="del" style="color:var(--acc);margin-right:18px" data-a="unarch" data-id="${t.id}">Восстановить</button><button class="del" data-a="delarch" data-id="${t.id}">Удалить</button></div>`}).join('')||'<p class="mute">Архив пуст.</p>'}
  ${l.length?'<button class="ghost" data-a="clrarch" style="color:var(--bad)">Очистить архив</button>':''}`;
}
function show(keep){
  const y=window.scrollY;
  let p=v.id&&proj(v.id),t=v.id&&task(v.id);
  if((v.n==='proj'&&!p)||(v.n==='task'&&!t))v={n:'home'};
  $('#tskbody').innerHTML=v.n==='proj'?vProj(p):v.n==='task'?vTask(t):v.n==='today'?vToday():v.n==='arch'?vArch():vHome();
  window.scrollTo(0,keep?y:0);
}
window.tskShow=()=>{v={n:'home'};F={};show()};

/* формы */
const swatches=sel=>`<div id="sw"><button type="button" class="sw${sel?'':' on'}" data-c="">×</button>${COLORS.map(([c,n])=>`<button type="button" class="sw${sel===c?' on':''}" data-c="${c}" style="background:${c}" aria-label="${n}"></button>`).join('')}</div><div class="mute" id="sw_l" style="min-height:20px"></div>`;
const swLbl=c=>{$('#sw_l').textContent=c?(T.legend[c]||cname(c)):''};
function pick(e,cur){
  const b=e.target.closest('.sw');if(!b)return cur;
  const c=b.dataset.c;$$('#sw .sw').forEach(x=>x.classList.toggle('on',x.dataset.c===c));swLbl(c);return c;
}
function projSheet(p){
  let col=p?p.color||'':'';
  openSheet(`<h2>${p?'Проект':'Новый проект'}</h2>
  <label>Название<input id="pj_n" value="${esc(p?p.name:'')}"></label>
  <label>Приоритет<select id="pj_p">${opts([[3,'Высокий'],[2,'Средний'],[1,'Низкий'],[0,'Без приоритета']],p?p.prio|0:0)}</select></label>
  <label>Теги (через запятую)<input id="pj_t" value="${esc(p?p.tags.join(', '):'')}"></label>
  <label>Описание<textarea id="pj_d" rows="3">${esc(p?p.desc||'':'')}</textarea></label>
  <div class="lbl">Цвет</div>${swatches(col)}
  <button class="primary" id="pj_s" style="margin-top:12px">Сохранить</button>${p?'<button class="del" id="pj_x" style="margin:10px 0;font-size:16px">Удалить проект</button>':''}<button class="ghost" id="pj_c">Закрыть</button>`);
  swLbl(col);
  $('#sheet').onclick=e=>{col=pick(e,col)};
  $('#pj_c').onclick=closeSheet;
  $('#pj_s').onclick=()=>{
    const name=$('#pj_n').value.trim();if(!name){toast('Укажите название');return}
    const o={name,prio:+$('#pj_p').value,tags:$('#pj_t').value.split(',').map(x=>x.trim().replace(/^#/,'')).filter(Boolean),desc:$('#pj_d').value.trim(),color:col};
    if(p)Object.assign(p,o);else{p={id:uid(),...o};T.projects.push(p)}
    sv();closeSheet();v={n:'proj',id:p.id};show();
  };
  if(p)$('#pj_x').onclick=()=>{
    if(!confirm('Удалить проект «'+p.name+'» вместе со всеми его задачами?'))return;
    T.tasks=T.tasks.filter(t=>t.pid!==p.id);T.projects=T.projects.filter(x=>x.id!==p.id);sv();closeSheet();v={n:'home'};show();
  };
}
function taskSheet(t,pid){
  let col=t?t.color||'':'';
  openSheet(`<h2>${t?'Задача':'Новая задача'}</h2>
  <label>Название<input id="tk_n" value="${esc(t?t.title:'')}"></label>
  <label>Описание<textarea id="tk_d" rows="3">${esc(t?t.desc||'':'')}</textarea></label>
  <div class="grid2"><label>Срок<input type="date" id="tk_due" value="${t?t.due||'':''}"></label>
  <label>Приоритет<select id="tk_p">${opts([[3,'Высокий'],[2,'Средний'],[1,'Низкий'],[0,'Без приоритета']],t?t.prio|0:0)}</select></label></div>
  <label>Проект<select id="tk_pr">${T.projects.map(p=>`<option value="${p.id}"${p.id===(t?t.pid:pid)?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
  <label>Повтор (нужен срок)<select id="tk_rep">${opts([['','Не повторять'],...Object.entries(REP)],t?t.rep||'':'')}</select></label>
  <div class="lbl">Цвет</div>${swatches(col)}
  <button class="primary" id="tk_s" style="margin-top:12px">Сохранить</button><button class="ghost" id="tk_c">Закрыть</button>`);
  swLbl(col);
  $('#sheet').onclick=e=>{col=pick(e,col)};
  $('#tk_c').onclick=closeSheet;
  $('#tk_s').onclick=()=>{
    const title=$('#tk_n').value.trim();if(!title){toast('Укажите название');return}
    const rep=$('#tk_rep').value,due=$('#tk_due').value;
    if(rep&&!due){toast('Для повторяющейся задачи укажите срок');return}
    const o={title,desc:$('#tk_d').value.trim(),due,prio:+$('#tk_p').value,pid:$('#tk_pr').value,color:col,rep};
    if(t)Object.assign(t,o);else{t={id:uid(),done:false,archived:false,subs:[],comments:[],created:Date.now(),...o};T.tasks.push(t)}
    sv();closeSheet();v=v.n==='task'?{n:'task',id:t.id}:{n:'proj',id:t.pid};show();
  };
}
function legendSheet(){
  openSheet(`<h2>Карта маркировки</h2><p class="mute">Запишите, что означает каждый цвет. Подсказка появится при выборе цвета у проектов и задач.</p>
  ${COLORS.map(([c,n])=>`<div class="lg">${dot(c)}<input data-lg="${c}" placeholder="${n}: что означает?" value="${esc(T.legend[c]||'')}"></div>`).join('')}
  <button class="primary" id="lg_s">Готово</button>`);
  $('#sheet').onchange=e=>{const c=e.target.dataset.lg;if(c){T.legend[c]=e.target.value.trim();sv()}};
  $('#lg_s').onclick=()=>{closeSheet();show(true)};
}
function quickSheet(pid){
  if(!T.projects.length){toast('Сначала создайте проект');return}
  openSheet(`<h2>Быстрое добавление</h2><p class="mute">Каждая строка станет отдельной задачей. Подробности можно добавить позже, открыв задачу.</p>
  <label>Проект<select id="q_p">${T.projects.map(p=>`<option value="${p.id}"${p.id===pid?' selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
  <label>Задачи, по одной в строке<textarea id="q_t" rows="8" placeholder="Молоко&#10;Хлеб&#10;Яйца"></textarea></label>
  <button class="primary" id="q_s">Добавить</button><button class="ghost" id="q_c">Закрыть</button>`);
  $('#q_c').onclick=closeSheet;
  $('#q_s').onclick=()=>{
    const ls=$('#q_t').value.split('\n').map(x=>x.replace(/^[\s\-–—•*·]+/,'').replace(/^\d+[.)]\s+/,'').trim()).filter(Boolean);
    if(!ls.length){toast('Впишите хотя бы одну задачу');return}
    const p2=$('#q_p').value,now=Date.now();
    ls.forEach((title,i)=>T.tasks.push({id:uid(),pid:p2,title,desc:'',due:'',prio:0,color:'',rep:'',done:false,archived:false,subs:[],comments:[],created:now+i}));
    sv();closeSheet();v={n:'proj',id:p2};show();toast('Добавлено задач: '+ls.length);
  };
  setTimeout(()=>{const t=$('#q_t');if(t)t.focus()},60);
}
document.addEventListener('click',e=>{if(e.target.closest('[data-tmap]'))legendSheet()});

/* действия */
const body=$('#tskbody');
body.addEventListener('click',e=>{
  if(e.target.closest('[data-chk],[data-sub]'))return;
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,id=b.dataset.id,t=v.n==='task'?task(v.id):null,p=v.n==='proj'?proj(v.id):null;
  if(a==='home'){v={n:'home'};show()}
  else if(a==='proj'){v={n:'proj',id};show()}
  else if(a==='task'){v={n:'task',id};show()}
  else if(a==='today'){v={n:'today'};show()}
  else if(a==='arch'){v={n:'arch'};show()}
  else if(a==='newp')projSheet(null);
  else if(a==='quick')quickSheet(p?p.id:'');
  else if(a==='editp'&&p)projSheet(p);
  else if(a==='newt'&&p)taskSheet(null,p.id);
  else if(a==='editt'&&t)taskSheet(t);
  else if(a==='archdone'&&p){T.tasks.forEach(x=>{if(x.pid===p.id&&x.done)x.archived=true});sv();show(true);toast('Выполненные задачи в архиве')}
  else if(a==='toarch'&&t){t.archived=true;sv();v={n:'proj',id:t.pid};show();toast('Задача в архиве')}
  else if(a==='delt'&&t){if(confirm('Удалить задачу «'+t.title+'»?')){T.tasks=T.tasks.filter(x=>x!==t);sv();v={n:'proj',id:t.pid};show()}}
  else if(a==='unarch'){const x=task(id);if(x){x.archived=false;sv();show(true)}}
  else if(a==='delarch'){if(confirm('Удалить задачу навсегда?')){T.tasks=T.tasks.filter(x=>x.id!==id);sv();show(true)}}
  else if(a==='clrarch'){if(confirm('Удалить все задачи из архива навсегда?')){T.tasks=T.tasks.filter(x=>!x.archived);sv();show(true)}}
  else if(a==='addsub'&&t){const s=$('#s_new').value.trim();if(s){t.subs.push({id:uid(),t:s,done:false});sv();show(true)}}
  else if(a==='delsub'&&t){t.subs=t.subs.filter(s=>s.id!==id);sv();show(true)}
  else if(a==='addcm'&&t){const s=$('#c_new').value.trim();if(s){t.comments.push({id:uid(),ts:Date.now(),text:s});sv();show(true)}}
  else if(a==='delcm'&&t){if(confirm('Удалить комментарий?')){t.comments=t.comments.filter(c=>c.id!==id);sv();show(true)}}
});
body.addEventListener('change',e=>{
  const x=e.target;
  if(x.dataset.chk){
    const t=task(x.dataset.chk);
    if(t&&x.checked&&t.rep&&t.due){
      T.tasks.push({...t,id:uid(),done:true,doneAt:Date.now(),archived:true,rep:'',comments:[],subs:t.subs.map(s=>({...s,id:uid()}))});
      let d=addRep(t.due,t.rep);while(d<=today())d=addRep(d,t.rep);
      t.due=d;t.done=false;t.doneAt=null;t.subs.forEach(s=>{s.done=false});
      sv();show(true);toast('Выполнено. Следующий срок: '+fdate(t.due));
    }else if(t){t.done=x.checked;t.doneAt=x.checked?Date.now():null;sv();show(true)}
  }
  else if(x.dataset.sub){const t=task(v.id),s=t&&t.subs.find(q=>q.id===x.dataset.sub);if(s){s.done=x.checked;sv();show(true)}}
  else if(x.id==='t_tag'){F.tag=x.value;$('#t_res').innerHTML=res()}
  else if(x.id==='f_st'){F.st=x.value;show(true)}
  else if(x.id==='f_pr'){F.pr=x.value;show(true)}
});
body.addEventListener('input',e=>{if(e.target.id==='t_q'){F.q=e.target.value;$('#t_res').innerHTML=res()}});
})();
