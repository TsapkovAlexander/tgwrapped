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
export async function shareAlbum(step,n=count(),prepare){
  const files=[];
  for(let i=1;i<=n;i++){step?.(i,n);files.push(new File([await slideBlob(i,prepare)],`wrapped_${i}.png`,{type:'image/png'}))}
  if(navigator.canShare?.({files})){await navigator.share({files,title:'Telegram Wrapped',text:`Наша переписка в цифрах — свой отчёт: ${SITE}`,url:SITE});return 'share'}
  for(const f of files)saveBlob(f,f.name);
  return 'save';
}

// Лист: все восемь карточек одной картинкой — целиком видно в чате, ничего не листать.
export async function shareSheet(step,n=count(),prepare){
  const k=sheetScale(n);
  const w=Math.round(W*k),h=Math.round(H*k),rows=Math.ceil(n/COLS);
  const c=document.createElement('canvas');c.width=w*COLS;c.height=h*rows;
  const ctx=c.getContext('2d');
  for(let i=1;i<=n;i++){step?.(i,n);const s=await slideCanvas(i,prepare);ctx.drawImage(s,(i-1)%COLS*w,Math.floor((i-1)/COLS)*h,w,h);s.width=s.height=0}
  const b=await toBlob(c);c.width=c.height=0;
  const f=new File([b],'wrapped.png',{type:'image/png'});
  if(navigator.canShare?.({files:[f]})){await navigator.share({files:[f],title:'Telegram Wrapped',text:`Наша переписка в цифрах — свой отчёт: ${SITE}`,url:SITE});return 'share'}
  saveBlob(b,'wrapped.png');return 'save';
}

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

// В ссылку кладём только то, что рисуют карточки: t.me/share/url отвечает 400
// на слишком длинный адрес, а половину слепка (помесячные ряды, разбивки по годам)
// карточки не открывают вовсе.
const KEEP=['names','total','days','active_days','first','last','per_user','words','vocab',
 'calls','resp_median','resp_p90','unanswered','pingpong','night','weekend','hours',
 'first_hour','last_hour','deep_night','wd','wd_top','kw','edited','voice','voice_secs',
 'quotes','replies','reactions_by','max_monologue','signature','top_words','domains',
 'emoji','reactions','stickers','starts','ends','double','answered','sessions','sess_median',
 'longest_session','streak','pauses','top_days','month_top','month_low','day_first','day_last',
 'first_msg','last_msg','long_msgs'];
const CUT={top_words:8,signature:6,domains:6,reactions:4,pauses:1,top_days:1};
export function slim(S){
  const out={};
  for(const k of KEEP){
    if(!(k in S))continue;
    let v=S[k];
    if(CUT[k]&&Array.isArray(v))v=v.slice(0,CUT[k]);
    else if(CUT[k]&&v&&typeof v==='object')v=Object.fromEntries(Object.entries(v).map(([kk,vv])=>[kk,Array.isArray(vv)?vv.slice(0,CUT[k]):vv]));
    out[k]=v;
  }
  if(out.emoji)out.emoji={A:(out.emoji.A||[]).slice(0,3),M:(out.emoji.M||[]).slice(0,3)};
  return out;
}

// t.me/share/url отвечает 400 на длинный запрос. Порог с запасом:
// длиннее — Telegram открывать не пробуем, ссылка и так лежит в буфере.
export const TG_LIMIT=3500;

export async function buildLink(S){
  const raw=new TextEncoder().encode(JSON.stringify(slim(S)));
  const packed='CompressionStream'in window?'z'+b64(await pipe(raw,new CompressionStream('gzip'))):'r'+b64(raw);
  return SITE+location.pathname+'#d='+packed;
}
export async function readLink(){
  const m=location.hash.match(/^#d=(.+)$/);if(!m)return null;
  try{
    const p=m[1],u=unb64(p.slice(1));
    const raw=p[0]==='z'?await pipe(u,new DecompressionStream('gzip')):u;
    const S=JSON.parse(new TextDecoder().decode(raw));
    return S&&S.names&&S.total?S:null;
  }catch{return null}
}
export const tgShareUrl=(url,text)=>`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
