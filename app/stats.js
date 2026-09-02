// Client-side analyzer for Telegram Desktop JSON export. Nothing leaves the browser.
function textOf(m){const t=m.text;if(Array.isArray(t))return t.map(x=>typeof x==='string'?x:(x.text||'')).join('');return t||''}
const norm=s=>s.toLowerCase().replace(/ё/g,'е');
// Куски кода и логов — не лексика человека: они летят в чат целыми блоками
// и иначе забивают собой и топ-слова, и фирменные выражения.
const CODEY=new Set(['code','pre']);
const URLS=/https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+\.(?:ru|com|org|net|io|me|dev|app)\/\S*/gi;
function proseOf(m){
  if('forwarded_from'in m)return '';            // чужой текст: пересланный пост — не речь человека
  const t=m.text;
  const raw=Array.isArray(t)?t.map(x=>typeof x==='string'?x:(CODEY.has(x.type)?'':(x.text||''))).join(''):(t||'');
  return raw.replace(URLS,' ');                 // ссылка целиком, иначе «https» и домен идут в слова
}
const WORD_RE=/[а-яa-z]{4,20}/g;
// Логи и код часто прилетают простым текстом, без code-сущности. Отличаем их по составу:
// синтаксический мусор рядом с длинной латиницей — это не речь, а вставка из терминала.
const CODE_SIGNS=/[{};=<>|]|=>|\b(function|const|return|null|error|undefined|import|export)\b/i;
function looksLikeCode(t){
  const letters=(t.match(/[а-яa-z]/gi)||[]).length;
  if(letters<12)return false;
  const cyr=(t.match(/[а-я]/gi)||[]).length;
  if(cyr/letters<.3)return true;                 // почти нет кириллицы — техническая вставка
  return CODE_SIGNS.test(t)&&letters>40;         // длинный кусок с синтаксисом
}
// \b в JS считает границей только ASCII, поэтому /\bя\b/ в кириллице не срабатывает никогда.
// Границу слова задаём явно: слева — начало строки или не-буква, справа — не-буква или конец.
const L='[^а-яa-z0-9]';                       // не буква и не цифра
const w=(...alts)=>new RegExp(`(^|${L})(${alts.join('|')})(${L}|$)`,'i');   // слово целиком
const pre=(...alts)=>new RegExp(`(^|${L})(${alts.join('|')})`,'i');         // начало слова
const any=(...alts)=>new RegExp(alts.join('|'),'i');                        // где угодно внутри
const KW={
 sorry:any('извин','прости','сорри','виноват','мой косяк','sorry'),
 thanks:any('спасиб','благодар','пасиб','мерси','thanks','thx'),
 laugh:any('а?ха+х','хе+х','\\){2,}','😂','🤣','😅','🙈','лол','ржу','угар'),
 swear:pre('бля','блин','блять','хуй','пизд','нахуй','ебан','еб[ауео]','сук[аи]','говн','жоп','хрен','фиг'),
 money:pre('рубл','деньг','оплат','счет','бюджет','тыс','млн','косар','зарплат','перевед','предоплат'),
 deadline:pre('срок','дедлайн','успе','горит','асап','asap'),
 bug:any('баг','ошибк','не работает','сломал','упал','error','падает','краш','отвалил'),
 ai:any('gpt','claude','нейрон','llm','промпт','нейросет','\\\\bai\\\\b').source?
    new RegExp(`gpt|claude|нейрон|llm|промпт|нейросет|(^|${L})(ии|ai)(${L}|$)`,'i'):null,
 call:pre('созвон','набер','звон','зум','zoom','телемост','встрет','митап'),
 promise:w('сделаю','скину','отправлю','напишу','посмотрю','проверю','займусь','доделаю','гляну'),
 tired:pre('устал','спать','сплю','вымота','выгор','задолбал'),
 me:w('я'),
 we:w('мы'),
 ok:/^(ок|окей|ok|хорошо|понял|поняла|принял|принято|да|ага|угу|\+|ясно)\W*$/i,
 love:any('люблю','скучаю','обнима','целую','солнышк','родн','❤','😘','🥰','💕'),
};

const CORE=new Set(('и в не на что я с а это как но у по так то же за ты бы из вот от все для его о он мы там уже если или к да нет ну до есть только еще ещё было будет был меня тебе мне тоже него когда чтобы этот эта эти того том тут они она оно вас нас них ним ней ему ей мой моя твой твоя себя быть даже над под при без чем чём кто где куда который которая').split(' '));
const STOP=new Set(('и в не на что я с а это как но у по так то же за ты бы из вот от все для его о он мы там уже если или к да нет ну до есть только еще ещё было будет был меня тебе мне тоже него когда просто пока надо можно сейчас чтобы через сегодня завтра еще этот эта эти того том тут они она оно вас нас них ним ней ему ей мой моя твой твоя себя быть даже раз очень над под при без чем чём кто где куда потом опять типа вроде тогда значит короче ладно кстати вообще может можешь могу хочу хочешь буду будешь давай смотри слушай ага угу окей ок хорошо спасибо привет пока конечно точно именно почему зачем сколько который которая').split(' '));

const median=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);const h=Math.floor(s.length/2);return s.length%2?s[h]:(s[h-1]+s[h])/2};
export function analyze(d,opts={}){
  const raw=d.messages||[];
  const ms=raw.filter(m=>m.type==='message'&&m.from).map(m=>({...m,_t:new Date(m.date),_s:textOf(m)})).sort((a,b)=>a._t-b._t);
  if(ms.length<50)throw new Error('В экспорте меньше 50 сообщений');
  const cnt={};ms.forEach(m=>cnt[m.from]=(cnt[m.from]||0)+1);
  const users=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  if(users.length<2)throw new Error('В чате один участник');
  const id={[users[0]]:'A',[users[1]]:'M'};
  const S={names:{A:opts.names?.A||users[0].split(' ')[0],M:opts.names?.M||users[1].split(' ')[0]}};
  // Обращение по имени — не лексика: иначе «саша» станет фирменным словом собеседницы.
  const OWN=new Set(users.concat(Object.values(S.names))
    .flatMap(n=>norm(String(n)).split(/[^а-яa-z]+/)).filter(x=>x.length>2));
  const mm=ms.filter(m=>id[m.from]);
  const byu=p=>({A:mm.filter(m=>id[m.from]==='A'&&p(m)).length,M:mm.filter(m=>id[m.from]==='M'&&p(m)).length});
  S.total=mm.length;S.first=mm[0].date.slice(0,10);S.last=mm[mm.length-1].date.slice(0,10);
  S.days=Math.round((mm[mm.length-1]._t-mm[0]._t)/864e5);
  const lday=t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  S.active_days=new Set(mm.map(m=>lday(m._t))).size;
  S.per_user={A:0,M:0};S.words={A:0,M:0};S.chars={A:0,M:0};
  mm.forEach(m=>{const u=id[m.from];S.per_user[u]++;S.words[u]+=m._s.split(/\s+/).filter(Boolean).length;S.chars[u]+=m._s.length});
  S.edited=byu(m=>'edited'in m);S.forwarded=byu(m=>'forwarded_from'in m);S.replies=byu(m=>'reply_to_message_id'in m);
  S.voice=byu(m=>m.media_type==='voice_message');S.video=byu(m=>m.media_type==='video_file'||m.media_type==='video_message');S.gif=byu(m=>m.media_type==='animation');
  S.one_word=byu(m=>m._s.trim().split(/\s+/).length===1&&m._s.trim());S.caps=byu(m=>/\b[А-ЯЁA-Z]{4,}\b/.test(m._s));S.excl=byu(m=>m._s.includes('!'));S.q=byu(m=>m._s.includes('?'));
  S.kw={};for(const k in KW)S.kw[k]=byu(m=>KW[k].test(norm(m._s)));
  // response times
  const resp={A:[],M:[]},ry={};let prev=null;
  mm.forEach(m=>{if(prev&&prev.from!==m.from){const dt=(m._t-prev._t)/1000;if(dt<4*3600){resp[id[m.from]].push(dt);const k=m._t.getFullYear()+'-'+id[m.from];(ry[k]=ry[k]||[]).push(dt)}}prev=m});
  S.resp_median={A:Math.round(median(resp.A)),M:Math.round(median(resp.M))};
  const p90=a=>{const s=[...a].sort((x,y)=>x-y);return Math.round(s[Math.floor(s.length*.9)]||0)};
  S.resp_p90={A:p90(resp.A),M:p90(resp.M)};
  S.resp_by_year={};for(const k in ry)S.resp_by_year[k]=Math.round(median(ry[k]));
  // sessions
  const sess=[];let cur=[mm[0]];
  for(let i=1;i<mm.length;i++){const m=mm[i];if((m._t-cur[cur.length-1]._t)/1000>4*3600){sess.push(cur);cur=[m]}else cur.push(m)}
  sess.push(cur);
  S.sessions=sess.length;S.sess_median=median(sess.map(s=>s.length));
  S.starts={A:0,M:0};S.ends={A:0,M:0};sess.forEach(s=>{S.starts[id[s[0].from]]++;S.ends[id[s[s.length-1].from]]++});
  const L=sess.reduce((a,b)=>b.length>a.length?b:a);S.longest_session={n:L.length,from:L[0].date.slice(0,16),to:L[L.length-1].date.slice(0,16)};
  S.unanswered={A:0,M:0};
  mm.forEach((m,i)=>{if(m._s.trim().endsWith('?')){const nx=mm[i+1];if(!nx||nx.from===m.from||(nx._t-m._t)/1000>4*3600)S.unanswered[id[m.from]]++}});
  const run={A:[],M:[]};prev=null;let n=0;
  mm.forEach(m=>{if(prev&&prev.from===m.from&&(m._t-prev._t)/1000<3600)n++;else{if(prev)run[id[prev.from]].push(n);n=1}prev=m});
  S.max_monologue={A:Math.max(0,...run.A),M:Math.max(0,...run.M)};
  // time
  S.hours=Array(24).fill(0);S.hours_u={A:Array(24).fill(0),M:Array(24).fill(0)};S.wd=Array(7).fill(0);
  mm.forEach(m=>{const h=m._t.getHours();S.hours[h]++;S.hours_u[id[m.from]][h]++;S.wd[(m._t.getDay()+6)%7]++});
  S.night=byu(m=>m._t.getHours()<6||m._t.getHours()>=23);S.weekend=byu(m=>m._t.getDay()===0||m._t.getDay()===6);
  const mkey=t=>`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}`;
  const months=[...new Set(mm.map(m=>mkey(m._t)))].sort();S.months=months;
  S.per_month={A:months.map(()=>0),M:months.map(()=>0)};const mi=Object.fromEntries(months.map((k,i)=>[k,i]));
  mm.forEach(m=>S.per_month[id[m.from]][mi[mkey(m._t)]]++);
  S.first_hour={};S.last_hour={};
  for(const u of ['A','M']){const f={},l={};mm.filter(m=>id[m.from]===u).forEach(m=>{const k=lday(m._t);if(!f[k]||m._t<f[k])f[k]=m._t;if(!l[k]||m._t>l[k])l[k]=m._t});
    S.first_hour[u]=+median(Object.values(f).map(t=>t.getHours()+t.getMinutes()/60)).toFixed(1);S.last_hour[u]=+median(Object.values(l).map(t=>t.getHours()+t.getMinutes()/60)).toFixed(1)}
  const days=[...new Set(mm.map(m=>lday(m._t)))].sort();let best=1,c=1,be=days[0];
  for(let i=1;i<days.length;i++){c=(new Date(days[i])-new Date(days[i-1]))/864e5===1?c+1:1;if(c>best){best=c;be=days[i]}}
  S.streak={n:best,end:be};
  const dc={};mm.forEach(m=>{const k=lday(m._t);dc[k]=(dc[k]||0)+1});S.top_days=Object.entries(dc).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const gaps=[];prev=null;mm.forEach(m=>{if(prev){const dd=Math.floor((m._t-prev._t)/864e5);if(dd>=3)gaps.push({days:dd,from:prev.date.slice(0,10),broke:id[m.from]})}prev=m});
  S.pauses=gaps.sort((a,b)=>b.days-a.days).slice(0,6);
  const calls=raw.filter(m=>m.action==='phone_call');
  const callBy={A:0,M:0};calls.forEach(m=>{const u=id[m.actor];if(u)callBy[u]++});
  S.calls={n:calls.length,hours:+(calls.reduce((a,m)=>a+(m.duration_seconds||0),0)/3600).toFixed(1),by:callBy,missed:calls.filter(m=>m.discard_reason==='missed').length,longest_min:Math.round(Math.max(0,...calls.map(m=>m.duration_seconds||0))/60)};
  S.calls_month=months.map(()=>0);calls.forEach(m=>{const i=mi[m.date.slice(0,7)];if(i!==undefined)S.calls_month[i]++});
  const rx={},rxu={A:0,M:0};
  mm.forEach(m=>(m.reactions||[]).forEach(r=>{rx[r.emoji]=(rx[r.emoji]||0)+(r.count||1);(r.recent||[]).forEach(rc=>{const u=id[rc.from];if(u)rxu[u]++})}));
  S.reactions=Object.entries(rx).sort((a,b)=>b[1]-a[1]).slice(0,8);S.reactions_by=rxu;
  const emo={A:{},M:{}};const ER=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
  mm.forEach(m=>{for(const e of m._s.match(ER)||[])emo[id[m.from]][e]=(emo[id[m.from]][e]||0)+1});
  S.emoji={A:Object.entries(emo.A).sort((a,b)=>b[1]-a[1]).slice(0,5),M:Object.entries(emo.M).sort((a,b)=>b[1]-a[1]).slice(0,5)};
  const dom={};mm.forEach(m=>{for(const l of m._s.matchAll(/https?:\/\/([^/\s]+)/g))dom[l[1].replace('www.','')]=(dom[l[1].replace('www.','')]||0)+1});
  S.domains=Object.entries(dom).sort((a,b)=>b[1]-a[1]).slice(0,10);
  S.top_words={};S.vocab={};S.len_median={};
  for(const u of ['A','M']){const wc=Object.create(null);let tot=0;const uniq=new Set();const lens=[];
    mm.filter(m=>id[m.from]===u).forEach(m=>{if(m._s)lens.push(m._s.length);
      const prose=proseOf(m);if(looksLikeCode(prose))return;
      for(const w of norm(prose).match(/[а-яa-z]{3,20}/g)||[]){tot++;uniq.add(w);if(w.length>=4&&!STOP.has(w)&&!OWN.has(w))wc[w]=(wc[w]||0)+1}});
    S.top_words[u]=Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,12);S.vocab[u]=[uniq.size,tot];S.len_median[u]=median(lens)}
  const lm=mm.reduce((a,b)=>b._s.length>a._s.length?b:a);S.longest_msg={who:id[lm.from],len:lm._s.length,date:lm.date.slice(0,10)};
  S.greets={A:0,M:0};const seen=new Set();
  mm.forEach(m=>{const k=lday(m._t);if(!seen.has(k)&&/^(привет|здравств|доброе|добрый|хай|йо)/.test(m._s.toLowerCase())){S.greets[id[m.from]]++;seen.add(k)}});
  // Кто открывает и кто закрывает день. В отличие от приветствий словом
  // (их в живом чате бывает пара десятков на тысячу дней) это есть в каждом дне.
  S.day_first={A:0,M:0};S.day_last={A:0,M:0};
  {const fst={},lst={};
   mm.forEach(m=>{const k=lday(m._t);if(!fst[k])fst[k]=m;lst[k]=m});
   for(const k in fst)S.day_first[id[fst[k].from]]++;
   for(const k in lst)S.day_last[id[lst[k].from]]++;}

  S.per_year={};mm.forEach(m=>{const y=m._t.getFullYear();S.per_year[y]=S.per_year[y]||{A:0,M:0};S.per_year[y][id[m.from]]++});

  // --- то, что делает чат узнаваемым ---

  // первое сообщение: с чего всё началось
  const f0=mm.find(m=>m._s.trim())||mm[0];
  S.first_msg={who:id[f0.from],text:f0._s.slice(0,180),date:f0.date.slice(0,10)};
  const l0=[...mm].reverse().find(m=>m._s.trim())||mm[mm.length-1];
  S.last_msg={who:id[l0.from],text:l0._s.slice(0,180),date:l0.date.slice(0,10)};

  // медиа и стикеры
  const zero=()=>({photo:0,video:0,gif:0,sticker:0,voice:0});
  S.media={A:zero(),M:zero()};S.voice_secs={A:0,M:0};const stick={};
  mm.forEach(m=>{const u=id[m.from],x=S.media[u];
    if(m.media_type==='sticker'){x.sticker++;if(m.sticker_emoji)stick[m.sticker_emoji]=(stick[m.sticker_emoji]||0)+1}
    else if(m.media_type==='animation')x.gif++;
    else if(m.media_type==='video_file'||m.media_type==='video_message')x.video++;
    else if(m.media_type==='voice_message'){x.voice++;S.voice_secs[u]+=m.duration_seconds||0}
    else if(m.photo)x.photo++});
  S.stickers={A:S.media.A.sticker,M:S.media.M.sticker,top:Object.entries(stick).sort((a,b)=>b[1]-a[1]).slice(0,5)};

  // простыни
  S.long_msgs=byu(m=>m._s.length>300);

  // фирменные слова: часто у одного и почти никогда у другого
  const bare=()=>Object.create(null);
  const cnt2={A:bare(),M:bare()},tot2={A:0,M:0},days2={A:bare(),M:bare()};
  mm.forEach(m=>{const u=id[m.from],day=lday(m._t);
    const prose=proseOf(m);if(looksLikeCode(prose))return;
    for(const w of norm(prose).match(WORD_RE)||[]){
      if(CORE.has(w)||OWN.has(w))continue;
      cnt2[u][w]=(cnt2[u][w]||0)+1;tot2[u]++;
      (days2[u][w]=days2[u][w]||new Set()).add(day)}});
  const sign=(u,o)=>{const out=[];
    for(const w in cnt2[u]){const a=cnt2[u][w];if(a<4)continue;
      if(days2[u][w].size<3)continue;   // разовый всплеск — не привычка
      // +1 в знаменателе: без него слово, которого у второго нет совсем,
      // даёт кратность в сотни — число красивое, но бессмысленное
      const b=cnt2[o][w]||0;
      const rate=Math.min(50,(a/(tot2[u]||1))/((b+1)/(tot2[o]||1)));
      if(rate>2.5)out.push([w,rate>=10?Math.round(rate):+rate.toFixed(1),a])}
    return out.sort((x,y)=>y[2]-x[2]).slice(0,8)};
  S.signature={A:sign('A','M'),M:sign('M','A')};

  // самая быстрая перестрелка: подряд идущие ответы быстрее минуты
  let volley=1,best2=1,bestAt=mm[0];
  for(let k=1;k<mm.length;k++){const a=mm[k-1],b=mm[k];
    if(b.from!==a.from&&(b._t-a._t)/1000<60){volley++;if(volley>best2){best2=volley;bestAt=b}}else volley=1}
  S.pingpong={n:best2,date:bestAt.date.slice(0,10),time:bestAt.date.slice(11,16)};

  // дожимание: пишет снова, хотя ответа не было дольше десяти минут
  S.double={A:0,M:0};
  for(let k=1;k<mm.length;k++){const a=mm[k-1],b=mm[k];
    if(b.from===a.from&&(b._t-a._t)/1000>600&&(b._t-a._t)/1000<4*3600)S.double[id[b.from]]++}

  // доля вопросов, на которые вообще ответили
  const asked={A:0,M:0},got={A:0,M:0};
  mm.forEach((m,k)=>{if(!m._s.trim().endsWith('?'))return;const u=id[m.from];asked[u]++;
    const nx=mm[k+1];if(nx&&nx.from!==m.from&&(nx._t-m._t)/1000<=4*3600)got[u]++});
  S.answered={A:asked.A?Math.round(got.A/asked.A*100):0,M:asked.M?Math.round(got.M/asked.M*100):0};
  S.asked=asked;

  // разговоры, заехавшие за три ночи
  S.deep_night=sess.filter(x=>x.some(m=>{const h=m._t.getHours();return h>=3&&h<6})).length;

  // месяцы: самый громкий и самый тихий
  const mc={};months.forEach(k=>mc[k]=0);mm.forEach(m=>mc[mkey(m._t)]++);
  const me=Object.entries(mc).sort((a,b)=>b[1]-a[1]);
  S.month_top=me[0];
  // «Тише всего» имеет смысл только там, где переписка уже шла: крайние месяцы
  // обрезаны календарём, а первые бывают раскачкой в одно-два сообщения.
  const live=median(months.map(k=>mc[k]))*0.2;
  let from=months.findIndex(k=>mc[k]>=live); if(from<0)from=0;
  const pool=months.slice(from,Math.max(from+1,months.length-1)).filter(k=>k!==months[0]);
  const low=(pool.length?pool:months).map(k=>[k,mc[k]]).sort((a,b)=>a[1]-b[1])[0];
  S.month_low=low;
  S.wd_top=S.wd.indexOf(Math.max(...S.wd));

  // ритуалы дня
  S.rituals={morning:byu(m=>/^(доброе утро|с добрым утром|доброго утра|утречко|утро доброе)/.test(norm(m._s).trim())),
             night:byu(m=>/(спокойной ночи|сладких снов|споки|доброй ночи)/.test(norm(m._s)))};

  // кто чаще отвечает цитатой
  S.quotes=byu(m=>'reply_to_message_id'in m);

  S.type=d.type;S.chat_name=d.name;
  return S;
}
