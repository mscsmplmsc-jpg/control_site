(()=>{
const st=document.createElement('style');
st.textContent=`
#tskbody textarea{display:block;width:100%;margin-top:4px;padding:11px 12px;font:inherit;font-size:17px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;resize:vertical}
.dot{width:12px;height:12px;border-radius:50%;flex:none;display:inline-block}
.tc{margin-top:10px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;cursor:pointer}
.tch{display:flex;justify-content:space-between;align-items:center;gap:8px}
.tch b{font-size:18px}
.sb{display:flex;align-items:center;gap:10px;margin:8px 0 0;font-size:16px;color:var(--ink)}
.sb input,.sb2 input{width:20px;height:20px;margin:0;flex:none}
.sb2{display:flex;gap:10px;align-items:flex-start;margin-top:10px}
.nav{display:flex;flex-wrap:wrap;gap:0 16px;align-items:center;margin-bottom:6px}
.nav button{padding:8px 0;font-size:15px;color:var(--acc)}
.nav .bad{color:var(--bad)}
.st{font-size:20px;padding:0 4px;color:var(--gold)}
.od{color:var(--bad);font-weight:600}
.bar2{height:6px;border-radius:3px;background:var(--line);margin:8px 0 3px;overflow:hidden}
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
let T={projects:[],tasks:[],legend:{}};
try{const j=JSON.parse(localStorage.getItem(TK));if(j&&Array.isArray(j.projects)&&Array.isArray(j.tasks))T={legend:{},...j}}catch(e){}
function norm(){ // перенос данных из прежней версии
  T.tasks.forEach(t=>{
    if(t.done&&!t.archived)t.archived=true;
    delete t.done;delete t.doneAt;delete t.rep;
    t.subs=t.subs||[];t.comments=t.comments||[];
    t.subs.forEach(s=>{if(s.done&&!s.doneAt)s.doneAt=Date.now()});
  });
}
norm();
const sv=()=>{try{localStorage.setItem(TK,JSON.stringify(T));return true}catch(e){toast('Не удалось сохранить данные');return false}};
window.tskGet=()=>T;
window.tskSet=t=>{if(t&&Array.isArray(t.projects)&&Array.isArray(t.tasks)){T={legend:{},...t};norm();sv()}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const today=()=>iso(new Date());
const proj=id=>T.projects.find(p=>p.id===id);
const task=id=>T.tasks.find(t=>t.id===id);
const complete=t=>t.subs.length>0&&t.subs.every(s=>s.done);
const over=t=>!!t.due&&t.due<today()&&!complete(t);
const cname=c=>(COLORS.find(x=>x[0]===c)||[0,''])[1];
const dot=c=>c?`<span class="dot" style="background:${esc(c)}"></span>`:'';
const cdate=ts=>{const d=new Date(ts);return fdate(iso(d))+' '+pad(d.getHours())+':'+pad(d.getMinutes())};
const dueCmp=(a,b)=>(a.due||'9').localeCompare(b.due||'9');
const sortT=(a,b)=>((+complete(a))-(+complete(b)))||((b.prio|0)-(a.prio|0))||dueCmp(a,b)||((a.created|0)-(b.created|0));
const opts=(l,s)=>l.map(([v,t])=>`<option value="${v}"${String(v)===String(s)?' selected':''}>${t}</option>`).join('');

/* выполненные подзадачи уходят в архив в 00:00 по Москве (UTC+3) */
function sweep(){
  const start=Math.floor((Date.now()+3*36e5)/864e5)*864e5-3*36e5;
  let ch=false;
  T.tasks.forEach(t=>t.subs.forEach(s=>{if(s.done&&!s.arch&&s.doneAt&&s.doneAt<start){s.arch=true;ch=true}}));
  if(ch)sv();
}

/* отображение */
function tcard(t,withProj){
  const p=withProj&&proj(t.pid),all=t.subs,dn=all.filter(s=>s.done).length;
  const undone=all.filter(s=>!s.done),shown=undone.slice(0,4),rest=undone.length-shown.length;
  const meta=[p?esc(p.name):'',t.due?`<span class="${over(t)?'od':''}">${fdate(t.due)}</span>`:'',t.prio?PR[t.prio]:'',all.length?`${dn}/${all.length}`:''].filter(Boolean).join(' · ');
  return `<div class="tc" data-a="task" data-id="${t.id}"><div class="tch"><b>${esc(t.title)}</b>${dot(t.color)}</div>
  ${meta?`<div class="mute">${meta}</div>`:''}
  ${all.length?`<div class="bar2"><i style="width:${Math.round(dn/all.length*100)}%"></i></div>`:''}
  ${shown.map(s=>`<label class="sb"><input type="checkbox" data-sub="${s.id}" data-t="${t.id}" aria-label="Выполнено"><span>${s.imp?'★ ':''}${esc(s.t)}</span></label>`).join('')}
  ${rest>0?`<div class="mute" style="margin-top:6px">и ещё ${rest}</div>`:''}
  ${!all.length?'<div class="mute" style="margin-top:6px">Подзадач нет</div>':!undone.length?'<div class="mute" style="margin-top:6px">Все подзадачи выполнены</div>':''}</div>`;
}
function pcard(p){
  const subs=T.tasks.filter(t=>t.pid===p.id).flatMap(t=>t.subs),dn=subs.filter(s=>s.done).length;
  return `<div class="pc" data-a="proj" data-id="${p.id}">${dot(p.color)}<div class="pi" style="flex:1"><b>${esc(p.name)}</b>${p.prio?`<span class="tag">${PR[p.prio]}</span>`:''}${p.tags.length?`<div class="mute">${p.tags.map(x=>'#'+esc(x)).join(' ')}</div>`:''}<div class="bar2"><i style="width:${subs.length?Math.round(dn/subs.length*100):0}%"></i></div><div class="mute">Подзадач выполнено ${dn} из ${subs.length}</div></div></div>`;
}
let F={},v={n:'home'};
const todayList=()=>T.tasks.filter(t=>!t.archived&&!complete(t)&&t.due&&t.due<=today());
const impList=()=>{const r=[];T.tasks.forEach(t=>{if(!t.archived)t.subs.forEach(s=>{if(s.imp&&!s.done)r.push([t,s])})});return r};

function res(){
  const q=(F.q||'').trim().toLowerCase();
  if(q){
    const m=T.tasks.filter(t=>!t.archived&&(t.title+' '+(t.desc||'')+' '+t.subs.map(s=>s.t).join(' ')+' '+t.comments.map(c=>c.text).join(' ')).toLowerCase().includes(q));
    return m.length?m.sort(sortT).map(t=>tcard(t,1)).join(''):'<p class="mute">Ничего не найдено.</p>';
  }
  const ps=T.projects.filter(p=>!F.tag||p.tags.includes(F.tag)).sort((a,b)=>(b.prio|0)-(a.prio|0)||a.name.localeCompare(b.name,'ru'));
  return ps.length?ps.map(pcard).join(''):'<p class="mute">Проектов пока нет. Создайте первый.</p>';
}
function vHome(){
  const tags=[...new Set(T.projects.flatMap(p=>p.tags))].sort(),n=todayList().length,im=impList();
  return `<div class="nav"><button class="ghost" data-a="today">Сегодня${n?' · '+n:''}</button><button class="ghost" data-a="arch">Архив</button></div>
  ${im.length?`<div class="tc" style="cursor:default"><b>★ Важное</b>${im.map(([t,s])=>`<div class="sb2"><input type="checkbox" data-sub="${s.id}" data-t="${t.id}" aria-label="Выполнено"><div class="pi" data-a="task" data-id="${t.id}" style="cursor:pointer">${esc(s.t)}<div class="mute">${esc(t.title)}${proj(t.pid)?' · '+esc(proj(t.pid).name):''}</div></div></div>`).join('')}</div>`:''}
  <input id="t_q" placeholder="Поиск по задачам" value="${esc(F.q||'')}" style="margin:12px 0 10px">
  <label>Тег<select id="t_tag">${opts([['','Все проекты'],...tags.map(x=>[x,'#'+x])],F.tag||'')}</select></label>
  <button class="primary" data-a="newp">+ Новый проект</button>
  <div id="t_res">${res()}</div>`;
}
function vProj(p){
  const all=T.tasks.filter(t=>t.pid===p.id),subs=all.flatMap(t=>t.subs),dn=subs.filter(s=>s.done).length;
  let ts=all.filter(t=>!t.archived);
  if(F.st==='act')ts=ts.filter(t=>!complete(t));else if(F.st==='done')ts=ts.filter(complete);else if(F.st==='over')ts=ts.filter(over);
  if(F.pr)ts=ts.filter(t=>String(t.prio|0)===F.pr);
  ts.sort(sortT);
  return `<div class="nav"><button class="ghost" data-a="home">‹ Проекты</button><button class="ghost" data-a="editp">Изменить проект</button><button class="ghost" data-a="archdone">В архив выполненное</button></div>
  <div class="hd" style="margin:4px 0 8px">${dot(p.color)}<h1 style="margin:0">${esc(p.name)}</h1></div>
  <div class="mute">${p.prio?'Приоритет: '+PR[p.prio]+'. ':''}${p.tags.map(x=>'#'+esc(x)).join(' ')}</div>
  ${p.desc?`<p class="txt">${esc(p.desc)}</p>`:''}
  <div class="bar2"><i style="width:${subs.length?Math.round(dn/subs.length*100):0}%"></i></div><div class="mute">Подзадач выполнено ${dn} из ${subs.length}</div>
  <button class="primary" data-a="newt" style="margin-top:12px">+ Новая задача</button>
  <div class="grid2" style="margin-top:12px">
    <label>Статус<select id="f_st">${opts([['','Все'],['act','Не завершённые'],['done','Завершённые'],['over','Просроченные']],F.st||'')}</select></label>
    <label>Приоритет<select id="f_pr">${opts([['','Любой'],['3','Высокий'],['2','Средний'],['1','Низкий'],['0','Без приоритета']],F.pr||'')}</select></label>
  </div>
  ${ts.length?ts.map(t=>tcard(t)).join(''):'<p class="mute">Задач нет.</p>'}`;
}
function vTask(t){
  const p=proj(t.pid),act=t.subs.filter(s=>!s.done),dn=t.subs.filter(s=>s.done&&!s.arch),ar=t.subs.filter(s=>s.arch).length;
  const sr=s=>`<label class="ck"><input type="checkbox" data-sub="${s.id}" data-t="${t.id}" ${s.done?'checked':''}><span style="flex:1${s.done?';text-decoration:line-through;color:var(--mute)':''}">${esc(s.t)}</span><button type="button" class="st" data-a="imp" data-id="${s.id}" aria-label="Важно">${s.imp?'★':'☆'}</button><button type="button" class="del" data-a="delsub" data-id="${s.id}" style="padding:0">×</button></label>`;
  return `<div class="nav"><button class="ghost" data-a="proj" data-id="${t.pid}">‹ ${esc(p?p.name:'Проект')}</button><button class="ghost" data-a="editt">Изменить</button><button class="ghost" data-a="toarch">В архив</button><button class="ghost bad" data-a="delt">Удалить</button></div>
  <div class="hd" style="margin:4px 0 8px">${dot(t.color)}<h1 style="margin:0">${esc(t.title)}</h1></div>
  <div class="inf"><span>Срок</span><span class="${over(t)?'od':''}">${t.due?fdate(t.due):'не задан'}</span></div>
  <div class="inf"><span>Приоритет</span><span>${PR[t.prio|0]}</span></div>
  ${t.color?`<div class="inf"><span>Цвет</span><span>${dot(t.color)} ${esc(T.legend[t.color]||cname(t.color))}</span></div>`:''}
  ${t.desc?`<h2>Описание</h2><p class="txt">${esc(t.desc)}</p>`:''}
  <h2>Подзадачи</h2>
  ${complete(t)?'<p class="mute">Все подзадачи выполнены. Задачу можно отправить в архив кнопкой вверху.</p>':''}
  ${act.map(sr).join('')}${dn.map(sr).join('')}
  ${ar?`<div class="mute" style="margin-top:6px">В архиве подзадач: ${ar}</div>`:''}
  <div class="row" style="grid-template-columns:1fr auto;margin-top:10px"><input id="s_new" placeholder="Новая подзадача"><button class="sm" data-a="addsub" style="margin:0">+</button></div>
  <h2>Комментарии</h2>
  ${t.comments.map(c=>`<div class="day"><div class="dh"><span class="mute">${cdate(c.ts)}</span><button class="del" data-a="delcm" data-id="${c.id}" style="padding:0">Удалить</button></div><div class="txt">${esc(c.text)}</div></div>`).join('')}
  <textarea id="c_new" rows="2" placeholder="Комментарий" style="margin-top:10px"></textarea><button class="ghost" data-a="addcm">Добавить комментарий</button>`;
}
function vToday(){
  const l=todayList().sort((a,b)=>dueCmp(a,b)||((b.prio|0)-(a.prio|0)));
  const od=l.filter(t=>t.due<today()),td=l.filter(t=>t.due===today());
  return `<div class="nav"><button class="ghost" data-a="home">‹ Проекты</button></div><h1>Сегодня</h1>
  ${od.length?'<h2>Просрочено</h2>'+od.map(t=>tcard(t,1)).join(''):''}
  ${td.length?'<h2>На сегодня</h2>'+td.map(t=>tcard(t,1)).join(''):''}
  ${l.length?'':'<p class="mute">На сегодня задач нет.</p>'}`;
}
function vArch(){
  const at=T.tasks.filter(t=>t.archived),as=[];
  T.tasks.forEach(t=>t.subs.forEach(s=>{if(s.arch)as.push([t,s])}));
  as.sort((a,b)=>(b[1].doneAt|0)-(a[1].doneAt|0));
  const btn=(a,id,lbl,c)=>`<button class="del" style="${c?'color:var(--acc);margin-right:18px;':''}" data-a="${a}" data-id="${id}">${lbl}</button>`;
  return `<div class="nav"><button class="ghost" data-a="home">‹ Проекты</button></div><h1>Архив</h1>
  ${as.length?'<h2>Подзадачи</h2>'+as.map(([t,s])=>`<div class="day"><div class="dh"><span>${esc(s.t)}</span><span class="mute">${esc(t.title)}</span></div>${s.doneAt?`<div class="mute">Выполнено ${fdate(iso(new Date(s.doneAt)))}</div>`:''}${btn('unsub',t.id+':'+s.id,'Восстановить',1)}${btn('rmsub',t.id+':'+s.id,'Удалить')}</div>`).join(''):''}
  ${at.length?'<h2>Задачи</h2>'+at.map(t=>{const p=proj(t.pid);return `<div class="day"><div class="dh"><b>${esc(t.title)}</b><span class="mute">${p?esc(p.name):''}</span></div>${btn('unarch',t.id,'Восстановить',1)}${btn('delarch',t.id,'Удалить')}</div>`}).join(''):''}
  ${as.length||at.length?'<button class="ghost" data-a="clrarch" style="color:var(--bad)">Очистить архив</button>':'<p class="mute">Архив пуст.</p>'}`;
}
function show(keep){
  sweep();
  const y=window.scrollY,p=v.id&&proj(v.id),t=v.id&&task(v.id);
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
  <div class="lbl">Цвет</div>${swatches(col)}
  <button class="primary" id="tk_s" style="margin-top:12px">Сохранить</button><button class="ghost" id="tk_c">Закрыть</button>`);
  swLbl(col);
  $('#sheet').onclick=e=>{col=pick(e,col)};
  $('#tk_c').onclick=closeSheet;
  $('#tk_s').onclick=()=>{
    const title=$('#tk_n').value.trim();if(!title){toast('Укажите название');return}
    const o={title,desc:$('#tk_d').value.trim(),due:$('#tk_due').value,prio:+$('#tk_p').value,pid:$('#tk_pr').value,color:col};
    if(t)Object.assign(t,o);else{t={id:uid(),archived:false,subs:[],comments:[],created:Date.now(),...o};T.tasks.push(t)}
    sv();closeSheet();v=v.n==='task'?{n:'task',id:t.id}:{n:'proj',id:t.pid};show();
  };
}
function legendSheet(){
  openSheet(`<h2>Карта маркировки</h2><p class="mute">Запишите, что означает каждый цвет. Подсказка появится при выборе цвета у проектов и задач.</p>
  ${COLORS.map(([c,n])=>`<div class="lg">${dot(c)}<input data-lg="${c}" placeholder="${n}: что означает?" value="${esc(T.legend[c]||'')}"></div>`).join('')}
  <button class="primary" id="lg_s">Готово</button>`);
  window._sc=()=>show(true);
  $('#sheet').onchange=e=>{const c=e.target.dataset.lg;if(c){T.legend[c]=e.target.value.trim();sv()}};
  $('#lg_s').onclick=closeSheet;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-tmap]'))legendSheet()});

/* действия */
const body=$('#tskbody');
body.addEventListener('click',e=>{
  if(e.target.closest('[data-sub],.sb'))return;
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a,id=b.dataset.id,t=v.n==='task'?task(v.id):null,p=v.n==='proj'?proj(v.id):null;
  const pair=()=>{const [ti,si]=(id||'').split(':'),tt=task(ti);return [tt,tt&&tt.subs.find(s=>s.id===si)]};
  if(a==='home'){v={n:'home'};show()}
  else if(a==='proj'){v={n:'proj',id};show()}
  else if(a==='task'){v={n:'task',id};show()}
  else if(a==='today'){v={n:'today'};show()}
  else if(a==='arch'){v={n:'arch'};show()}
  else if(a==='newp')projSheet(null);
  else if(a==='editp'&&p)projSheet(p);
  else if(a==='newt'&&p)taskSheet(null,p.id);
  else if(a==='editt'&&t)taskSheet(t);
  else if(a==='archdone'&&p){T.tasks.forEach(x=>{if(x.pid===p.id)x.subs.forEach(s=>{if(s.done)s.arch=true})});sv();show(true);toast('Выполненные подзадачи в архиве')}
  else if(a==='toarch'&&t){t.archived=true;sv();v={n:'proj',id:t.pid};show();toast('Задача в архиве')}
  else if(a==='delt'&&t){if(confirm('Удалить задачу «'+t.title+'»?')){T.tasks=T.tasks.filter(x=>x!==t);sv();v={n:'proj',id:t.pid};show()}}
  else if(a==='unarch'){const x=task(id);if(x){x.archived=false;sv();show(true)}}
  else if(a==='delarch'){if(confirm('Удалить задачу навсегда?')){T.tasks=T.tasks.filter(x=>x.id!==id);sv();show(true)}}
  else if(a==='unsub'){const [,s]=pair();if(s){s.arch=false;s.done=false;s.doneAt=null;sv();show(true)}}
  else if(a==='rmsub'){const [x,s]=pair();if(s&&confirm('Удалить подзадачу навсегда?')){x.subs=x.subs.filter(q=>q!==s);sv();show(true)}}
  else if(a==='clrarch'){if(confirm('Удалить всё из архива навсегда?')){T.tasks=T.tasks.filter(x=>!x.archived);T.tasks.forEach(x=>{x.subs=x.subs.filter(s=>!s.arch)});sv();show(true)}}
  else if(a==='addsub'&&t){const s=$('#s_new').value.trim();if(s){t.subs.push({id:uid(),t:s,done:false,doneAt:null,imp:false,arch:false});sv();show(true)}}
  else if(a==='imp'&&t){const s=t.subs.find(q=>q.id===id);if(s){s.imp=!s.imp;sv();show(true)}}
  else if(a==='delsub'&&t){t.subs=t.subs.filter(s=>s.id!==id);sv();show(true)}
  else if(a==='addcm'&&t){const s=$('#c_new').value.trim();if(s){t.comments.push({id:uid(),ts:Date.now(),text:s});sv();show(true)}}
  else if(a==='delcm'&&t){if(confirm('Удалить комментарий?')){t.comments=t.comments.filter(c=>c.id!==id);sv();show(true)}}
});
body.addEventListener('change',e=>{
  const x=e.target;
  if(x.dataset.sub){
    const t=task(x.dataset.t||v.id),s=t&&t.subs.find(q=>q.id===x.dataset.sub);
    if(s){s.done=x.checked;s.doneAt=x.checked?Date.now():null;if(!x.checked)s.arch=false;sv();show(true)}
  }
  else if(x.id==='t_tag'){F.tag=x.value;$('#t_res').innerHTML=res()}
  else if(x.id==='f_st'){F.st=x.value;show(true)}
  else if(x.id==='f_pr'){F.pr=x.value;show(true)}
});
body.addEventListener('input',e=>{if(e.target.id==='t_q'){F.q=e.target.value;$('#t_res').innerHTML=res()}});
})();
