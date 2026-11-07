(()=>{
const st=document.createElement('style');
st.textContent=`
.mrow{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);cursor:pointer}
.inc{color:#2f8a46;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.exp{color:var(--bad);font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums}
.pn{display:flex;justify-content:space-between;align-items:center;margin:6px 0 10px}
.pn button{font-size:24px;padding:2px 16px;color:var(--acc)}
.sumg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:6px 0 12px}
.sumg div{padding:10px 8px;background:var(--card);border:1px solid var(--line);border-radius:12px;text-align:center}
.sumg span{display:block;font-size:12px;color:var(--mute)}
.sumg b{font-size:16px;font-variant-numeric:tabular-nums}
.dh2{display:flex;justify-content:space-between;margin:16px 0 0;font-size:13px;color:var(--mute)}
.seg2{display:flex;gap:8px;margin:12px 0 0}
.seg2 button{flex:1;padding:12px 8px;border-radius:12px;border:1px solid var(--line);background:var(--card);font-size:16px;color:var(--mute)}
.seg2 button.on{font-weight:600;color:#fff;border-color:transparent}
.seg2 .bi.on{background:#2f8a46}.seg2 .bo.on{background:var(--bad)}
`;
document.head.appendChild(st);

const MK='money-v1';
const GREEN='#2f8a46',RED='#c4524d';
const MONTHS=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DEF_OUT=['Продукты','Транспорт','Жильё','Здоровье','Связь','Одежда','Развлечения','Другое'],DEF_IN=['Зарплата','Подработка','Подарки','Другое'];
let M={cur:'',cats:[],ops:[]};
try{const j=JSON.parse(localStorage.getItem(MK));if(j&&Array.isArray(j.ops)&&Array.isArray(j.cats))M=j}catch(e){}
if(!M.cats.length)M.cats=[...DEF_OUT.map((n,i)=>({id:'o'+i,name:n,type:'out'})),...DEF_IN.map((n,i)=>({id:'i'+i,name:n,type:'in'}))];
const sv=()=>{try{localStorage.setItem(MK,JSON.stringify(M));return true}catch(e){toast('Не удалось сохранить данные');return false}};
window.moneyGet=()=>M;
window.moneySet=m=>{if(m&&Array.isArray(m.ops)&&Array.isArray(m.cats)){M=m;sv()}};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const cat=id=>M.cats.find(c=>c.id===id);
const fm=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)+(M.cur?' '+M.cur:'');
const num=v=>parseFloat(String(v).replace(/\s/g,'').replace(',','.'));
const now=new Date();
let V={mode:'month',y:now.getFullYear(),m:now.getMonth()};

function range(){
  if(V.mode==='all')return ['0000-00-00','9999-99-99'];
  if(V.mode==='year')return [V.y+'-01-01',V.y+'-12-31'];
  const mm=pad(V.m+1);return [`${V.y}-${mm}-01`,`${V.y}-${mm}-31`];
}
function view(keep){
  const y=window.scrollY,[a,b]=range();
  const ops=M.ops.filter(o=>o.date>=a&&o.date<=b).sort((x,z)=>z.date.localeCompare(x.date)||(z.ts|0)-(x.ts|0));
  const sum=t=>ops.filter(o=>o.type===t).reduce((s,o)=>s+o.amount,0);
  const inc=sum('in'),exp=sum('out'),bal=inc-exp;
  const bycat=t=>{const m={};ops.filter(o=>o.type===t).forEach(o=>{m[o.cat]=(m[o.cat]||0)+o.amount});return Object.entries(m).sort((p,q)=>q[1]-p[1])};
  const bars=(t,tot)=>bycat(t).map(([id,v])=>{const c=cat(id),p=tot?Math.round(v/tot*100):0;return `<div class="tr"><span>${esc(c?c.name:'Без категории')}</span><span>${fm(v)} · ${p}%</span></div><div class="bar2" style="margin-top:0"><i style="width:${p}%;background:${t==='in'?GREEN:RED}"></i></div>`}).join('');
  const label=V.mode==='month'?MONTHS[V.m]+' '+V.y:V.mode==='year'?String(V.y):'За всё время';
  let days='',last='';
  const dayTot={};ops.forEach(o=>{dayTot[o.date]=(dayTot[o.date]||0)+(o.type==='in'?o.amount:-o.amount)});
  ops.forEach(o=>{
    if(o.date!==last){last=o.date;days+=`<div class="dh2"><span>${fdate(o.date)}</span><span>${dayTot[o.date]>=0?'+':'−'}${fm(Math.abs(dayTot[o.date]))}</span></div>`}
    const c=cat(o.cat);
    days+=`<div class="mrow" data-a="edit" data-id="${o.id}"><div><b>${esc(c?c.name:'Без категории')}</b>${o.note?`<div class="mute">${esc(o.note)}</div>`:''}</div><span class="${o.type==='in'?'inc':'exp'}">${o.type==='in'?'+':'−'}${fm(o.amount)}</span></div>`;
  });
  const b2=$('#moneybody');
  b2.innerHTML=`<div class="nav"><button class="ghost" data-a="cats">Категории</button><button class="ghost" data-a="cur">Валюта${M.cur?' ('+esc(M.cur)+')':''}</button></div>
  <div class="tabs" style="margin:6px 0 4px"><button data-mode="month" class="${V.mode==='month'?'on':''}">Месяц</button><button data-mode="year" class="${V.mode==='year'?'on':''}">Год</button><button data-mode="all" class="${V.mode==='all'?'on':''}">Всё время</button></div>
  <div class="pn">${V.mode==='all'?'<span></span>':'<button data-a="prev" aria-label="Назад">‹</button>'}<b>${label}</b>${V.mode==='all'?'<span></span>':'<button data-a="next" aria-label="Вперёд">›</button>'}</div>
  <div class="sumg"><div><span>Доходы</span><b class="inc">${fm(inc)}</b></div><div><span>Расходы</span><b class="exp">${fm(exp)}</b></div><div><span>Итог</span><b style="color:${bal>=0?GREEN:'var(--bad)'}">${bal<0?'−':''}${fm(Math.abs(bal))}</b></div></div>
  <div class="seg2" style="margin:0 0 6px"><button class="bi on" data-a="new" data-t="in">+ Доход</button><button class="bo on" data-a="new" data-t="out">+ Расход</button></div>
  ${exp?'<h2>Расходы по категориям</h2>'+bars('out',exp):''}${inc?'<h2>Доходы по категориям</h2>'+bars('in',inc):''}
  ${ops.length?'<h2>Операции</h2>'+days:'<p class="mute" style="margin-top:16px">За этот период операций нет.</p>'}`;
  window.scrollTo(0,keep?y:0);
}
window.moneyShow=()=>view();

function opSheet(o,t0){
  let type=o?o.type:t0;
  const opts=sel=>M.cats.filter(c=>c.type===type).map(c=>`<option value="${c.id}"${c.id===sel?' selected':''}>${esc(c.name)}</option>`).join('');
  openSheet(`<h2>${o?'Изменить операцию':'Новая операция'}</h2>
  <div class="seg2"><button class="bi" id="o_in" type="button">Доход</button><button class="bo" id="o_out" type="button">Расход</button></div>
  <label style="margin-top:12px">Сумма<input id="o_a" inputmode="decimal" placeholder="0" value="${o?o.amount:''}"></label>
  <label>Категория<select id="o_c"></select></label>
  <label>Дата<input type="date" id="o_d" value="${o?o.date:iso(new Date())}"></label>
  <label>Комментарий<input id="o_n" value="${esc(o?o.note||'':'')}" autocomplete="off"></label>
  <button class="primary" id="o_s">Сохранить</button>${o?'<button class="del" id="o_x" style="margin:10px 0;font-size:16px">Удалить операцию</button>':''}<button class="ghost" id="o_c2">Закрыть</button>`);
  const paint=()=>{
    $('#o_in').classList.toggle('on',type==='in');$('#o_out').classList.toggle('on',type==='out');
    const keep=o&&o.type===type?o.cat:'';$('#o_c').innerHTML=opts(keep)||'<option value="">Нет категорий</option>';
  };
  paint();
  $('#o_in').onclick=()=>{type='in';paint()};$('#o_out').onclick=()=>{type='out';paint()};
  $('#o_c2').onclick=closeSheet;
  $('#o_s').onclick=()=>{
    const amount=num($('#o_a').value),date=$('#o_d').value;
    if(!(amount>0)){toast('Введите сумму больше нуля');return}
    if(!date){toast('Укажите дату');return}
    const r={type,amount:Math.round(amount*100)/100,cat:$('#o_c').value,date,note:$('#o_n').value.trim()};
    if(o)Object.assign(o,r);else M.ops.push({id:uid(),ts:Date.now(),...r});
    sv();closeSheet();view(true);
  };
  if(o)$('#o_x').onclick=()=>{if(!confirm('Удалить эту операцию?'))return;M.ops=M.ops.filter(x=>x!==o);sv();closeSheet();view(true)};
}
function catSheet(){
  const list=t=>M.cats.filter(c=>c.type===t).map(c=>`<div class="tr"><span>${esc(c.name)}</span><span><button class="del" style="color:var(--acc);padding:0 10px 0 0" data-rn="${c.id}">Изменить</button><button class="del" style="padding:0" data-dl="${c.id}">Удалить</button></span></div>`).join('');
  openSheet(`<h2>Категории</h2><h2 style="font-size:15px;color:var(--mute)">Расходы</h2>${list('out')}<h2 style="font-size:15px;color:var(--mute)">Доходы</h2>${list('in')}
  <h2>Новая категория</h2><div class="seg2" style="margin-top:0"><button class="bi" id="k_in" type="button">Доход</button><button class="bo on" id="k_out" type="button">Расход</button></div>
  <input id="k_n" placeholder="Название" autocomplete="off" style="margin-top:10px"><button class="primary" id="k_a" style="margin-top:10px">Добавить</button><button class="ghost" id="k_x">Закрыть</button>`);
  let kt='out';
  window._sc=()=>view(true);
  const set=t=>{kt=t;$('#k_in').classList.toggle('on',t==='in');$('#k_out').classList.toggle('on',t==='out')};
  $('#k_in').onclick=()=>set('in');$('#k_out').onclick=()=>set('out');$('#k_x').onclick=closeSheet;
  $('#k_a').onclick=()=>{const n=$('#k_n').value.trim();if(!n){toast('Введите название');return}M.cats.push({id:uid(),name:n,type:kt});sv();catSheet()};
  $('#sheet').onclick=e=>{
    const r=e.target.closest('[data-rn]'),d=e.target.closest('[data-dl]');
    if(r){const c=cat(r.dataset.rn),n=prompt('Название категории',c.name);if(n&&n.trim()){c.name=n.trim();sv();catSheet()}}
    else if(d){const c=cat(d.dataset.dl),used=M.ops.filter(o=>o.cat===c.id).length;
      if(confirm(`Удалить категорию «${c.name}»?`+(used?` Операции (${used}) останутся без категории.`:''))){M.cats=M.cats.filter(x=>x!==c);sv();catSheet()}}
  };
}
function curSheet(){
  openSheet(`<h2>Валюта</h2><p class="mute">Обозначение, которое будет стоять после сумм, например ₸, ₽, $ или €. Можно оставить пустым.</p><label>Обозначение<input id="c_v" value="${esc(M.cur||'')}" maxlength="6" autocomplete="off"></label><button class="primary" id="c_s">Сохранить</button><button class="ghost" id="c_x">Закрыть</button>`);
  $('#c_x').onclick=closeSheet;$('#c_s').onclick=()=>{M.cur=$('#c_v').value.trim();sv();closeSheet();view(true)};
}

const body=$('#moneybody');
body.addEventListener('click',e=>{
  const md=e.target.closest('[data-mode]');
  if(md){V.mode=md.dataset.mode;view();return}
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a;
  if(a==='prev'||a==='next'){
    const d=a==='prev'?-1:1;
    if(V.mode==='year')V.y+=d;else{V.m+=d;if(V.m<0){V.m=11;V.y--}if(V.m>11){V.m=0;V.y++}}
    view();
  }
  else if(a==='new')opSheet(null,b.dataset.t);
  else if(a==='edit'){const o=M.ops.find(x=>x.id===b.dataset.id);if(o)opSheet(o)}
  else if(a==='cats')catSheet();
  else if(a==='cur')curSheet();
});
})();
