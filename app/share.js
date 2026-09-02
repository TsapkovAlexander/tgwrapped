// Вывод результата наружу: PNG, альбом, полотно, текст, ссылка.
// Всё делается в браузере. Единственное, что уходит вовне, — то, что пользователь отправил сам.
import {fm,pct,np,plural,DAY,MSG,CALL,TALK} from './format.js';
import {titles} from './render.js';

const W=1080,H=1920;
// Куда идти тому, кому прислали карточки. Обычно — туда, где открыт сайт,
// но с localhost такая ссылка бесполезна: у получателя она никуда не ведёт.
// Поэтому для локальной версии берём канонический адрес из разметки.
export function siteFrom(origin,hostname,canonical){
  const local=/^(localhost|127\.|0\.0\.0\.0|\[?::1)/.test(hostname||'')||!/^https?:/.test(origin||'');
  const c=(canonical||'').replace(/\/+$/,'');
  return local&&/^https?:\/\//.test(c) ? c : origin;
}
const canonical=()=>typeof document==='undefined' ? '' :
  (document.querySelector('link[rel=canonical]')?.href
   ||document.querySelector('meta[property="og:url"]')?.content||'');
export const SITE=typeof location==='undefined' ? 'https://tgwrapped.ru'
  : siteFrom(location.origin,location.hostname,canonical());
const count=()=>document.querySelectorAll('#exportScope .slide').length||8;
// Лист собирается сеткой, а не полосой: Telegram отправляет картинку фотографией,
// только если сумма сторон не больше 10 000 px — полоса ушла бы документом, без превью.
// Масштаб не фиксирован: он подбирается под число карточек, чтобы уложиться и в это,
// и в предел площади canvas у Safari (отказывает примерно на 16,7 Мп).
const COLS=2, MAX_SIDES=9800, MAX_AREA=13e6;
function sheetScale(n){
  const rows=Math.ceil(n/COLS);
  const bySides=MAX_SIDES/(W*COLS+H*rows);
  const byArea=Math.sqrt(MAX_AREA/(W*COLS*H*rows));
  return Math.min(.9,bySides,byArea);
}

const h2c=()=>{if(!window.html2canvas)throw new Error('Библиотека экспорта не загрузилась — обновите страницу');return window.html2canvas};
const toBlob=c=>new Promise(r=>c.toBlob(r,'image/png'));

// prepare(i) должен поставить в DOM карточку с id s<i> и убрать предыдущую:
// html2canvas клонирует весь документ на каждый снимок, поэтому держать в нём
// сразу все карточки 1080×1920 — это семикратное замедление.
export async function slideCanvas(i,prepare){
  if(prepare)await prepare(i);
  const el=document.getElementById('s'+i);
  if(!el)throw new Error('Карточка '+i+' ещё не построена');
  const t=el.style.transform;el.style.transform='none';
  try{return await h2c()(el,{width:W,height:H,scale:1,backgroundColor:null,useCORS:true})}
  finally{el.style.transform=t}
}
export async function slideBlob(i,prepare){const c=await slideCanvas(i,prepare);const b=await toBlob(c);c.width=c.height=0;return b}
export function saveBlob(b,name){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}

// Альбом: восемь файлов одним шерингом. Telegram принимает их альбомом.
export async function prepareAlbum(step,n=count(),prepare){
  const files=[];
  for(let i=1;i<=n;i++){step?.(i,n);files.push(new File([await slideBlob(i,prepare)],`wrapped_${i}.png`,{type:'image/png'}))}
  return files;
}
export async function prepareSheet(step,n=count(),prepare){
  const k=sheetScale(n);
  const w=Math.round(W*k),h=Math.round(H*k),rows=Math.ceil(n/COLS);
  const c=document.createElement('canvas');c.width=w*COLS;c.height=h*rows;
  const ctx=c.getContext('2d');
  for(let i=1;i<=n;i++){step?.(i,n);const s=await slideCanvas(i,prepare);ctx.drawImage(s,(i-1)%COLS*w,Math.floor((i-1)/COLS)*h,w,h);s.width=s.height=0}
  const b=await toBlob(c);c.width=c.height=0;
  return [new File([b],'wrapped.png',{type:'image/png'})];
}

// Вызывать строго из обработчика клика: иначе браузер откажет —
// «Must be handling a user gesture to perform a share request».
export async function sendFiles(files){
  if(canShareFiles(typeof navigator!=='undefined'?navigator:null,files)){
    await navigator.share({files,title:'Telegram Wrapped'});
    return 'share';
  }
  for(const f of files)saveBlob(f,f.name);
  return 'save';
}
// Чем закончится нажатие — от этого зависит, как назвать кнопку.
export const willShare=files=>canShareFiles(typeof navigator!=='undefined'?navigator:null,files);


// Текстовый отчёт: читается без картинок, цитируется в чате.
export function reportText(S){
  const A=S.names.A,M=S.names.M,T=titles(S);
  const fast=S.resp_median.A<=S.resp_median.M?A:M,mn=Math.min(S.resp_median.A,S.resp_median.M),mx=Math.max(S.resp_median.A,S.resp_median.M);
  const starter=S.starts.A>=S.starts.M?A:M,ender=S.ends.A>=S.ends.M?A:M;
  const night=Math.round((S.night.A+S.night.M)/S.total*100),peak=S.hours.indexOf(Math.max(...S.hours));
  const L=[
    `Telegram Wrapped — ${A} и ${M}`,
    ``,
    `${np(S.total,MSG)} за ${np(S.days,DAY)}, писали ${np(S.active_days,DAY)} из ${fm(S.days)}.`,
    `${A} — ${fm(S.per_user.A)}, ${M} — ${fm(S.per_user.M)}.`,
    `Быстрее отвечает ${fast}: медиана ${mn} сек против ${mx}.`,
    `${night}% сообщений с 23:00 до 6 утра, пик чата — ${peak}:00.`,
    `Разговоры начинает ${starter} (${Math.max(pct(S.starts.A,S.starts.M),pct(S.starts.M,S.starts.A))}%), последнее слово — ${ender} (${Math.max(pct(S.ends.A,S.ends.M),pct(S.ends.M,S.ends.A))}%).`,
    `Рекорд: ${np(S.longest_session.n,MSG)} в одном разговоре, ${np(S.streak.n,DAY)} подряд без пропусков.`,
    ``,
    `${A} — ${T.A.title}: ${T.A.text}`,
    `${M} — ${T.M.title}: ${T.M.text}`,
    ``,
    `Свой отчёт за пару секунд: ${SITE} — файл не покидает телефон`,
  ];
  if(S.calls.n)L.splice(4,0,`Плюс ${np(S.calls.n,CALL)} на ${S.calls.hours.toLocaleString('ru-RU')} ч.`);
  return L.join('\n');
}
export async function copyText(t){
  try{await navigator.clipboard.writeText(t);return true}
  catch{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}
}

// Ссылка на результат: статистика лежит в самом адресе, сервера нет.
// Отправляя такую ссылку, пользователь передаёт цифры в переписку — об этом сказано рядом с кнопкой.
const b64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const unb64=s=>{const t=atob(s.replace(/-/g,'+').replace(/_/g,'/'));const u=new Uint8Array(t.length);for(let i=0;i<t.length;i++)u[i]=t.charCodeAt(i);return u};
const pipe=async(u8,s)=>new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(s)).arrayBuffer());

// В ссылку кладём только то, что рисуют карточки, и в самом плотном виде:
// адрес со статистикой внутри читают люди в чате, а простыня на две тысячи знаков
// выглядит как мусор. Ключи объектов выкидываем (порядок полей задан схемой),
// пары «А и М» пишем двухэлементным массивом, списки режем до показываемого.
const KEEP=['names','total','days','active_days','first','last','per_user','words','vocab',
 'calls','resp_median','resp_p90','unanswered','pingpong','night','weekend','hours',
 'first_hour','last_hour','deep_night','wd','wd_top','kw','edited','voice','voice_secs',
 'quotes','replies','reactions_by','max_monologue','signature','top_words','domains',
 'emoji','reactions','stickers','starts','ends','double','answered','sessions','sess_median',
 'longest_session','streak','pauses','top_days','month_top','month_low','day_first','day_last',
 'first_msg','last_msg','long_msgs'];
// поля вида {A,M} — их пишем как [A,M]
const PAIRS=new Set(['per_user','words','vocab','resp_median','resp_p90','unanswered','night',
 'weekend','first_hour','last_hour','edited','voice','voice_secs','quotes','replies','reactions_by',
 'max_monologue','starts','ends','double','answered','day_first','day_last','long_msgs',
 'signature','top_words','emoji','names']);
const KW_KEYS=['sorry','thanks','laugh','swear','money','deadline','bug','ai','call','promise','tired','me','we','ok','love'];

export function slim(S){
  const cut=(a,n)=>Array.isArray(a)?a.slice(0,n):a;
  const o={};
  for(const k of KEEP)if(k in S)o[k]=S[k];
  o.signature={A:cut(S.signature?.A,4),M:cut(S.signature?.M,4)};
  o.top_words={A:cut(S.top_words?.A,5).map(w=>w[0]),M:cut(S.top_words?.M,5).map(w=>w[0])};
  o.domains=cut(S.domains,4);
  o.emoji={A:cut(S.emoji?.A,2),M:cut(S.emoji?.M,2)};
  o.reactions=cut(S.reactions,3);
  o.stickers={...S.stickers,top:cut(S.stickers?.top,3)};
  o.pauses=cut(S.pauses,1);o.top_days=cut(S.top_days,1);
  const mx=Math.max(...(S.hours||[1]),1);
  o.hours=(S.hours||[]).map(v=>Math.round(v/mx*99));      // гистограмме нужна форма, не абсолютные числа
  o.first_msg={...S.first_msg,text:(S.first_msg?.text||'').slice(0,90)};
  o.last_msg={...S.last_msg,text:(S.last_msg?.text||'').slice(0,90)};
  return o;
}
const pack=S=>{const s=slim(S);
  return KEEP.map(k=>{const v=s[k];
    if(k==='kw')return KW_KEYS.map(n=>[v?.[n]?.A??0,v?.[n]?.M??0]);
    if(PAIRS.has(k))return [v?.A,v?.M];
    return v??null})};
const unpack=arr=>{const o={};
  KEEP.forEach((k,i)=>{const v=arr[i];
    if(k==='kw'){o.kw={};KW_KEYS.forEach((n,j)=>o.kw[n]={A:v?.[j]?.[0]??0,M:v?.[j]?.[1]??0})}
    else if(PAIRS.has(k))o[k]={A:v?.[0],M:v?.[1]};
    else o[k]=v});
  o.top_words={A:(o.top_words.A||[]).map(w=>[w,0]),M:(o.top_words.M||[]).map(w=>[w,0])};
  return o};

// t.me/share/url отвечает 400 на длинный запрос. Порог с запасом:
// длиннее — Telegram открывать не пробуем, ссылка и так лежит в буфере.
export const TG_LIMIT=3500;

// Файлы отдаём БЕЗ text и url. С ними браузер не может передать приложению
// картинки и деградирует до текстового сообщения: в чат приезжает
// «/Users/…/wrapped_1.png» списком вместо альбома.
export function canShareFiles(nav,files){
  return !!(nav&&typeof nav.share==='function'&&nav.canShare&&nav.canShare({files}));
}

export async function buildLink(S){
  const raw=new TextEncoder().encode(JSON.stringify(pack(S)));
  const packed='CompressionStream'in window
    ? '1'+b64(await pipe(raw,new CompressionStream('deflate-raw')))
    : 'r'+b64(raw);
  return SITE+location.pathname+'#d='+packed;
}
export async function readLink(){
  const m=location.hash.match(/^#d=(.+)$/);if(!m)return null;
  try{
    const p=m[1],u=unb64(p.slice(1));
    const kind=p[0];
    const raw=kind==='1'?await pipe(u,new DecompressionStream('deflate-raw'))
            : kind==='z'?await pipe(u,new DecompressionStream('gzip'))    // ссылки, разосланные раньше
            : u;
    const data=JSON.parse(new TextDecoder().decode(raw));
    const S=Array.isArray(data)?unpack(data):data;
    return S&&S.names&&S.total?S:null;
  }catch{return null}
}
export const tgShareUrl=(url,text)=>`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
