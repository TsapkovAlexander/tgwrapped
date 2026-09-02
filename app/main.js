// Два состояния: лендинг до загрузки, экран результата после. Плюс шит отправки.
import {analyze} from './stats.js';
import {np,DAY,MSG} from './format.js';
import {buildSlides} from './render.js';
import {slideBlob,saveBlob,prepareAlbum,prepareSheet,sendFiles,willShare,reportText,copyText,buildLink,readLink,tgShareUrl,TG_LIMIT,SITE} from './share.js';

const $=s=>document.querySelector(s);
let DATA=null,S=null,SLIDES=[],i=0;

const say=(t,err)=>{const el=$('#result').hidden?$('#status'):$('#rstatus');el.className='status'+(err?' err':'');el.textContent=t};
const step=(n,of)=>say(`Готовлю карточку ${n} из ${of}…`);
const fit=()=>document.querySelectorAll('.frame,.card').forEach(f=>{const s=f.querySelector('.slide');if(s)s.style.transform=`scale(${f.clientWidth/1080})`});
window.addEventListener('resize',fit);

// витрина на лендинге — из готового слепка, анализатор ей не нужен
fetch('demo.json').then(r=>r.json()).then(D=>{
  const sl=buildSlides(D),box=$('#showcase');
  [0,1,9].forEach(n=>{const c=document.createElement('div');c.className='card';
    c.innerHTML=`<div class="slide ${sl[n][0]}">${sl[n][1]}</div>`;box.appendChild(c)});
  fit();
}).catch(()=>$('#showcase').closest('.wrap').hidden=true);

// загрузка файла
const drop=$('#drop');
['dragenter','dragover'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add('over')}));
['dragleave','drop'].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove('over')}));
drop.addEventListener('drop',ev=>{const f=ev.dataTransfer.files[0];if(f)load(f)});
$('#file').addEventListener('change',ev=>{if(ev.target.files[0])load(ev.target.files[0])});

function load(f){
  say(`Читаю ${f.name} (${(f.size/1048576).toFixed(1)} МБ)…`);
  const r=new FileReader();
  r.onload=()=>{try{
    DATA=JSON.parse(r.result);
    if(!DATA.messages)throw new Error('Это не экспорт Telegram: в файле нет поля messages');
    say('Считаю…');setTimeout(build,30);
  }catch(e){say(e.message,true)}};
  r.onerror=()=>say('Не удалось прочитать файл',true);
  r.readAsText(f);
}
function build(names){
  try{S=analyze(DATA,{names})}catch(e){return say(e.message,true)}
  show();
}
function show(){
  SLIDES=buildSlides(S);i=0;
  $('#landing').hidden=true;$('#result').hidden=false;
  $('#pair').textContent=`${S.names.A} и ${S.names.M}`;
  $('#summary').textContent=`${np(S.total,MSG)} за ${np(S.days,DAY)}`;
  $('#nA').value=S.names.A;$('#nM').value=S.names.M;
  $('#albumN').textContent=SLIDES.length;
  $('#bars').innerHTML=SLIDES.map(()=>'<i></i>').join('');
  $('#dots').innerHTML=SLIDES.map(()=>'<i></i>').join('');
  [...$('#bars').children].forEach((b,n)=>b.onclick=()=>go(n));
  [...$('#dots').children].forEach((b,n)=>b.onclick=()=>go(n));
  paint();say('');
  $('#oneName').textContent=SLIDES[0][2];
  window.scrollTo({top:0,behavior:'instant'});
}
function paint(){
  const [cls,html]=SLIDES[i];
  $('#frame').innerHTML=`<div class="slide ${cls}">${html}</div>`;
  [...$('#bars').children].forEach((b,n)=>b.className=n<=i?'on':'');
  [...$('#dots').children].forEach((b,n)=>b.className=n===i?'on':'');
  $('#prev').disabled=i===0;$('#next').disabled=i===SLIDES.length-1;
  fit();
}
const go=n=>{i=Math.max(0,Math.min(SLIDES.length-1,n));paint();
  const one=$('#oneName');if(one&&SLIDES[i])one.textContent=SLIDES[i][2]};
$('#prev').onclick=()=>go(i-1);
$('#next').onclick=()=>go(i+1);
document.addEventListener('keydown',e=>{if($('#result').hidden)return;
  if(e.key==='ArrowLeft')go(i-1);if(e.key==='ArrowRight')go(i+1);if(e.key==='Escape')sheet(false)});
// свайп по карточке
let x0=null;
$('#frame').addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});
$('#frame').addEventListener('touchend',e=>{if(x0===null)return;
  const dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)go(i+(dx<0?1:-1));x0=null},{passive:true});

// имена
$('#editNames').onclick=()=>{const box=$('#nameEdit');box.hidden=!box.hidden;if(!box.hidden)$('#nA').focus()};
$('#applyNames').onclick=()=>{
  const names={A:$('#nA').value.trim()||'A',M:$('#nM').value.trim()||'B'};
  if(DATA)build(names);else{S.names=names;show()}
  $('#nameEdit').hidden=true;
};

// шит
const sheet=on=>{$('#sheet').classList.toggle('on',on);$('#scrim').classList.toggle('on',on)};
$('#send').onclick=()=>sheet(true);
$('#sheetClose').onclick=()=>sheet(false);
$('#scrim').onclick=()=>sheet(false);

// В карусели живёт одна карточка, а экспорт снимает все. Держать их в DOM пачкой нельзя:
// html2canvas клонирует документ на каждый снимок, и десять карточек 1080×1920 замедляют
// его всемеро. Поэтому карточки подставляются по одной, прямо перед снимком.
async function withExportScope(fn){
  const box=document.createElement('div');
  box.id='exportScope';
  box.style.cssText='position:fixed;left:-20000px;top:0;width:1080px';
  document.body.appendChild(box);
  const mount=async n=>{const [cls,html]=SLIDES[n-1];
    box.innerHTML=`<div class="slide ${cls}" id="s${n}">${html}</div>`};
  try{await document.fonts.ready;return await fn(mount)}finally{box.remove()}
}

const busy=async fn=>{
  const all=[...document.querySelectorAll('.opt, .actions .btn')];
  all.forEach(b=>b.disabled=true);
  try{await fn()}catch(e){if(e.name!=='AbortError')say(e.message,true)}
  finally{all.forEach(b=>b.disabled=false)}
};
$('#png').onclick=()=>busy(()=>withExportScope(async mount=>{
  saveBlob(await slideBlob(i+1,mount),`wrapped_${i+1}.png`);say('Карточка в загрузках')}));
// Картинки рисуются секундами, а navigator.share требует свежего клика.
// Поэтому окно отправки не закрывается: в нём идёт прогресс, и оттуда же
// вторым нажатием уходят готовые файлы.
let READY=null;
const opts=()=>[...document.querySelectorAll('.opt'), $('#sheetClose')];
// В окне три экрана: список способов, выбор карточек и прогресс.
function screen(name){
  const menu=name==='menu';
  opts().forEach(b=>b.hidden=!menu);
  $('#sheetTitle').hidden=!menu;
  $('#sheet').querySelector('.hint').hidden=!menu;
  $('#sheetPick').hidden=name!=='pick';
  $('#sheetWork').hidden=name!=='work';
}
function workMode(on,title){
  screen(on?'work':'menu');
  if(on){
    $('#workTitle').textContent=title;
    $('#prog').innerHTML='';
    $('#workSend').disabled=true;$('#workSend').textContent='Подождите…';
    $('#workHint').textContent='Это занимает около двадцати секунд';
  }
}
const tick=(n,of)=>{
  if($('#prog').children.length!==of)$('#prog').innerHTML=Array.from({length:of},()=>'<i></i>').join('');
  [...$('#prog').children].forEach((b,k)=>b.className=k<n-1?'on':k===n-1?'now':'');
  $('#workHint').textContent=`Карточка ${n} из ${of}`;
};
function ready(files){
  READY=files;
  [...$('#prog').children].forEach(b=>b.className='on');
  $('#workTitle').textContent='Готово';
  $('#workHint').textContent=files.length>1?`${files.length} карточек готовы`:'Карточка готова';
  const send=$('#workSend');
  send.disabled=false;
  send.textContent=willShare(files)
    ? (files.length>1?`Отправить ${files.length} карточек`:'Отправить картинку')
    : (files.length>1?`Скачать ${files.length} карточек`:'Скачать картинку');
  $('#workNote').hidden=!willShare(files);
}
$('#workCancel').onclick=()=>{READY=null;sheet(false);workMode(false)};

// Выбор карточек: по умолчанию отмечены все, снять можно любые.
let PICK=null;
function renderPicks(){
  $('#picks').innerHTML=SLIDES.map(([,,name],i)=>
    `<button class="pick${PICK.has(i+1)?' on':''}" data-n="${i+1}"><span class="box">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FBFAF7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
     </span><span class="n">${i+1}</span><span class="t">${name}</span></button>`).join('');
  const n=PICK.size;
  $('#pickHint').textContent=n?`Выбрано ${n} из ${SLIDES.length}`:'Ничего не выбрано';
  $('#pickGo').disabled=!n;
  $('#pickGo').textContent=n===1?'Готовить карточку':`Готовить ${n} карточек`;
}
$('#picks').onclick=ev=>{const b=ev.target.closest('.pick');if(!b)return;
  const n=+b.dataset.n;PICK.has(n)?PICK.delete(n):PICK.add(n);renderPicks()};
$('#optPick').onclick=()=>{PICK=new Set(SLIDES.map((_,i)=>i+1));renderPicks();screen('pick')};
$('#pickCancel').onclick=()=>screen('menu');
$('#pickGo').onclick=()=>busy(async()=>{
  const nums=[...PICK].sort((a,b)=>a-b);
  workMode(true,nums.length===1?'Рисую карточку':'Рисую карточки');
  ready(await withExportScope(mount=>prepareAlbum(tick,nums,mount)))});
$('#optOne').onclick=()=>busy(async()=>{workMode(true,'Рисую карточку');
  ready(await withExportScope(mount=>prepareAlbum(tick,[i+1],mount)))});
$('#workSend').onclick=()=>{
  if(!READY)return;
  const files=READY;READY=null;
  // всё внутри обработчика клика: и буфер, и отправка требуют живого жеста
  copyText(SITE).then(ok=>{
    sendFiles(files).then(how=>{
      sheet(false);workMode(false);
      say(how==='share'
        ? (ok?'Отправлено. Ссылка на сайт скопирована — если её не видно в чате, вставьте вручную':'Отправлено')
        : `${files.length>1?files.length+' файлов':'Картинка'} в загрузках — прикрепите ${files.length>1?'их':'её'} в чат`);
    }).catch(e=>{sheet(false);workMode(false);if(e.name!=='AbortError')say(e.message,true)});
  });
};
$('#optAlbum').onclick=()=>busy(async()=>{workMode(true,'Рисую карточки');
  ready(await withExportScope(mount=>prepareAlbum(tick,SLIDES.map((_,k)=>k+1),mount)))});
$('#optSheet').onclick=()=>busy(async()=>{workMode(true,'Собираю картинку');
  ready(await withExportScope(mount=>prepareSheet(tick,SLIDES.map((_,k)=>k+1),mount)))});
$('#optText').onclick=()=>busy(async()=>{sheet(false);
  say(await copyText(reportText(S))?'Текст в буфере — вставьте в чат':'Буфер недоступен, выделите текст вручную')});
$('#optLink').onclick=()=>busy(async()=>{sheet(false);
  const url=await buildLink(S);
  const ok=await copyText(url);
  const share=tgShareUrl(url,`${S.names.A} и ${S.names.M}: ${np(S.total,MSG)} за ${np(S.days,DAY)}`);
  // На длинный адрес окно Telegram отвечает ошибкой, поэтому его просто не открываем:
  // ссылка уже в буфере, её достаточно вставить в чат руками.
  if(share.length<=TG_LIMIT){
    window.open(share,'_blank','noopener');
    say(ok?'Ссылка скопирована, Telegram открыт в новой вкладке':'Telegram открыт в новой вкладке');
  }else{
    say(ok?'Ссылка скопирована — вставьте её в чат'
          :'Ссылка слишком длинная для окна Telegram, а буфер недоступен: сохраните карточки картинкой');
  }});

$('#restart').onclick=()=>{location.hash='';location.reload()};

// результат, пришедший ссылкой
readLink().then(got=>{if(!got)return;S=got;DATA=null;show();say(`Вам прислали результат: ${S.names.A} и ${S.names.M}`)});
