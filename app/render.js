// Слайды: 8 карточек-постеров 1080×1920. Стили — slide.css.
import {fm,hm,pct,np,plural,DAY,MSG,CALL,WORD,PAGE,Q,TALK} from './format.js';
const WD=['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];

const hd=(l,r)=>`<div class="hd"><span>${l}</span><span>${r}</span></div>`;
// __N__ подставляется в самом конце, когда число карточек уже известно
const ft=(p)=>`<div class="ft"><span>tgwrapped.ru</span><span>${p} / __N__</span></div>`;
const pair=(A,M,a,m)=>`<div class="who">
 <div class="r"><span class="dot a"></span><span>${A}</span><b>${fm(a)}</b></div>
 <div class="r"><span class="dot m"></span><span>${M}</span><b>${fm(m)}</b></div>
 <div class="split"><i class="ia" style="width:${a/((a+m)||1)*100}%"></i><i class="im" style="width:${m/((a+m)||1)*100}%"></i></div></div>`;
const row=(t,a,m)=>{const s=a+m||1;return `<div class="row"><span class="t">${t}</span><span class="bar"><i class="ia" style="width:${a/s*100}%"></i><i class="im" style="width:${m/s*100}%"></i></span><span class="v">${fm(a)} · ${fm(m)}</span></div>`};

export function buildSlides(S){
  const A=S.names.A,M=S.names.M,both=`${A} и ${M}`,years=`${S.first.slice(0,4)} — ${S.last.slice(0,4)}`;
  const sl=[];const q=t=>t.replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 1 — сколько всего
  sl.push(['cream',`${hd(both,years)}
  <div class="push"><div class="big xl">${fm(S.total)}</div>
  <div class="lead">${plural(S.total,MSG)} за ${np(S.days,DAY)}</div>
  <div class="sub">писали друг другу ${np(S.active_days,DAY)} из ${fm(S.days)}</div></div>
  <div style="margin-top:72px">${pair(A,M,S.per_user.A,S.per_user.M)}</div>
  ${S.calls.n?`<div class="note" style="margin-top:56px">Плюс ${np(S.calls.n,CALL)} на ${S.calls.hours.toLocaleString('ru-RU')} ч</div>`:''}
  ${ft(1)}`]);

  // 2 — с чего всё началось
  sl.push(['peach',`${hd('С чего всё началось',S.first_msg.date)}
  <div style="margin-top:auto"><div class="sect" style="margin-top:0">Первое сообщение</div>
  <div style="margin-top:20px;font-size:44px;line-height:1.3">«${q(S.first_msg.text)}»</div>
  <div class="sub" style="margin-top:16px">${S.first_msg.who==='A'?A:M}, ${S.first_msg.date}</div></div>
  <div style="margin-top:64px"><div class="sect" style="margin-top:0">И последнее, на сегодня</div>
  <div style="margin-top:20px;font-size:36px;line-height:1.3">«${q(S.last_msg.text)}»</div>
  <div class="sub" style="margin-top:12px">${S.last_msg.who==='A'?A:M}, ${S.last_msg.date}</div></div>
  <div class="note" style="margin-top:auto;margin-bottom:0">С тех пор — ${np(S.total,MSG)} и ${np(S.sessions,TALK)}</div>
  ${ft(2)}`]);

  // 3 — кто быстрее
  const fast=S.resp_median.A<=S.resp_median.M?A:M,slow=fast===A?M:A;
  const mn=Math.min(S.resp_median.A,S.resp_median.M),mx=Math.max(S.resp_median.A,S.resp_median.M);
  sl.push(['ink',`${hd('Кто отвечает быстрее',both)}
  <div class="push"><div class="big xl">${mn}<span class="unit">сек</span></div>
  <div class="lead">медианный ответ — ${fast}</div>
  <div class="sub">${slow} отвечает за ${mx} сек. ${mx<90?'Никто не ждёт.':mx<600?'Оба на связи.':'Кто-то читает и молчит.'}</div></div>
  <div style="margin-top:72px" class="who">
   <div class="r"><span class="dot a"></span><span>90 % ответов ${A} — быстрее</span><b>${Math.round(S.resp_p90.A/60)} мин</b></div>
   <div class="r"><span class="dot m"></span><span>90 % ответов ${M} — быстрее</span><b>${Math.round(S.resp_p90.M/60)} мин</b></div></div>
  <div class="note" style="margin-top:56px">Лучшая перестрелка — ${np(S.pingpong.n,MSG)} быстрее минуты подряд, ${S.pingpong.date}</div>
  ${ft(3)}`]);

  // 4 — когда пишете
  const night=pct(S.night.A+S.night.M,S.total-(S.night.A+S.night.M)),peak=S.hours.indexOf(Math.max(...S.hours)),top=Math.max(...S.hours);
  sl.push(['sky',`${hd('Когда вы пишете',both)}
  <div class="push"><div class="big xl">${night} %</div>
  <div class="lead">сообщений с 23:00 до 6 утра</div>
  <div class="sub">пик чата — ${peak}:00 · первое сообщение дня: ${A} в ${hm(S.first_hour.A)}, ${M} в ${hm(S.first_hour.M)}</div></div>
  <div class="hrs">${S.hours.map((v,i)=>`<i class="${i===peak?'hot':''}" style="height:${Math.max(10,v/top*520)}px"></i>`).join('')}</div>
  <div class="ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
  <div class="note" style="margin-top:48px">${pct(S.weekend.A+S.weekend.M,S.total)} % на выходных · ${np(S.deep_night,TALK)} заехали за три ночи · ${WD[S.wd_top]} — ваш день</div>
  ${ft(4)}`]);

  // 5 — кто вы в этом чате
  sl.push(['cream',`${hd('Кто вы в этом чате','5 / __N__')}
  <div class="h2" style="margin-top:40px">Кто чаще</div>
  <div style="margin-top:22px;display:flex;gap:40px;font-size:30px;color:var(--mute)">
   <span style="display:flex;align-items:center;gap:14px"><span class="dot a"></span>${A}</span>
   <span style="display:flex;align-items:center;gap:14px"><span class="dot m"></span>${M}</span></div>
  <div class="rows" style="margin-top:36px">
   ${row('Говорит «спасибо»',S.kw.thanks.A,S.kw.thanks.M)}${row('Извиняется',S.kw.sorry.A,S.kw.sorry.M)}
   ${row('Смеётся',S.kw.laugh.A,S.kw.laugh.M)}${row('Матерится',S.kw.swear.A,S.kw.swear.M)}
   ${row('Говорит «я»',S.kw.me.A,S.kw.me.M)}${row('Говорит «мы»',S.kw.we.A,S.kw.we.M)}
   ${row('Обещает',S.kw.promise.A,S.kw.promise.M)}${row('Отвечает «ок»',S.kw.ok.A,S.kw.ok.M)}
   ${row('Правит написанное',S.edited.A,S.edited.M)}${row('Голосовые',S.voice.A,S.voice.M)}</div>
  <div class="ft"><span>tgwrapped.ru</span><span>${both}</span></div>`]);

  // 6 — фирменные слова
  const sig=(u,n)=>{const w=S.signature[u];return w.length
    ? `<div class="tags">${w.slice(0,6).map(([word,rate])=>`<span class="tag">${word} <b style="font-weight:800">×${rate}</b></span>`).join('')}</div>`
    : `<div class="sub" style="margin-top:16px">говорит ровно то же, что и ${n}</div>`};
  sl.push(['cream',`${hd('Ваши слова',both)}
  <div class="h2" style="margin-top:auto">Так говорит<br>только ${A}</div>
  ${sig('A',M)}
  <div class="h2" style="margin-top:64px">А так — только ${M}</div>
  ${sig('M',A)}
  <div class="note push" style="margin-top:56px">Во сколько раз чаще, чем второй. Словарь: ${fm(S.vocab.A[0])} и ${np(S.vocab.M[0],WORD)}</div>
  ${ft(6)}`]);

  // 7 — кто начинает и заканчивает
  const starter=S.starts.A>=S.starts.M?A:M,ender=S.ends.A>=S.ends.M?A:M;
  sl.push(['peach',`${hd('Начало и конец',both)}
  <div class="push"><div class="big xl">${Math.max(pct(S.starts.A,S.starts.M),pct(S.starts.M,S.starts.A))} %</div>
  <div class="lead">разговоров начинает ${starter}</div>
  <div class="sub">последнее слово в ${Math.max(pct(S.ends.A,S.ends.M),pct(S.ends.M,S.ends.A))} % случаев за ${ender}</div></div>
  <div style="margin-top:72px" class="who">
   <div class="r"><span class="dot a"></span><span>${A} открывает день</span><b>${fm(S.day_first.A)}</b></div>
   <div class="r"><span class="dot m"></span><span>${M} открывает день</span><b>${fm(S.day_first.M)}</b></div>
   <div class="r"><span class="dot a"></span><span>${A} закрывает день</span><b>${fm(S.day_last.A)}</b></div>
   <div class="r"><span class="dot m"></span><span>${M} закрывает день</span><b>${fm(S.day_last.M)}</b></div></div>
  <div style="margin-top:56px" class="who">
   <div class="r"><span class="dot a"></span><span>${A} пишет вдогонку, не дождавшись</span><b>${fm(S.double.A)}</b></div>
   <div class="r"><span class="dot m"></span><span>${M} пишет вдогонку, не дождавшись</span><b>${fm(S.double.M)}</b></div></div>
  <div class="note" style="margin-top:44px">Доля отвеченных вопросов — ${A}: ${S.answered.A} %, ${M}: ${S.answered.M} %</div>
  ${ft(7)}`]);

  // 8 — рекорды
  const pause=S.pauses[0];
  sl.push(['ink',`${hd('Рекорды',both)}
  <div class="push"><div class="big xl">${fm(S.longest_session.n)}</div>
  <div class="lead">${plural(S.longest_session.n,MSG)} в одном разговоре</div>
  <div class="sub">${S.longest_session.from.slice(0,10)}, с ${S.longest_session.from.slice(11)} до ${S.longest_session.to.slice(11)}</div></div>
  <div style="margin-top:72px;display:flex;gap:72px">
   <div class="stat"><span class="n">${fm(S.streak.n)}</span><span class="sub">${plural(S.streak.n,DAY)} подряд без пропусков, до ${S.streak.end}</span></div>
   <div class="stat"><span class="n">${fm(pause?pause.days:0)}</span><span class="sub">${plural(pause?pause.days:0,DAY)} молчания${pause?`, прервал ${pause.broke==='A'?A:M}`:''}</span></div></div>
  <div class="note" style="margin-top:56px">Плотнее всего — ${S.top_days[0][0]}, ${np(S.top_days[0][1],MSG)} · громче всего ${S.month_top[0]}, тише всего ${S.month_low[0]}</div>
  ${ft(8)}`]);

  // 9 — о чём это всё
  const em=[...S.emoji.A.slice(0,3),...S.emoji.M.slice(0,3)];
  sl.push(['sky',`${hd('О чём это всё',both)}
  <div class="sect" style="margin-top:40px">Куда ведут ссылки</div>
  <div class="tags">${S.domains.slice(0,5).map(([d,n])=>`<span class="tag">${d} ${fm(n)}</span>`).join('')||'<span class="tag">ни одной ссылки</span>'}</div>
  <div class="sect">Любимые слова</div>
  <div style="margin-top:20px;display:flex;flex-direction:column;gap:26px;font-size:32px;line-height:1.35">
   <div><span class="name a"><span class="dot a"></span>${A}</span><div style="margin-top:8px">${S.top_words.A.slice(0,7).map(w=>w[0]).join(', ')}</div></div>
   <div><span class="name m"><span class="dot m"></span>${M}</span><div style="margin-top:8px">${S.top_words.M.slice(0,7).map(w=>w[0]).join(', ')}</div></div></div>
  ${em.length?`<div class="sect">Эмодзи и реакции</div><div class="tags">${em.map(([e,n])=>`<span class="tag">${e} ${fm(n)}</span>`).join('')}${S.reactions.slice(0,3).map(([e,n])=>`<span class="tag">${e} ${fm(n)}</span>`).join('')}</div>`:''}
  ${S.stickers.A+S.stickers.M>=10?`<div class="sect">Стикеры</div><div class="tags">${S.stickers.top.slice(0,5).map(([e,n])=>`<span class="tag">${e} ${fm(n)}</span>`).join('')}</div>`:''}
  <div class="note push" style="margin-top:48px">${np(S.words.A+S.words.M,WORD)} ≈ ${np((S.words.A+S.words.M)/250,PAGE)}${S.voice_secs.A+S.voice_secs.M?` · голосом наговорили ${Math.round((S.voice_secs.A+S.voice_secs.M)/60)} мин`:''}</div>
  ${ft(9)}`]);

  // 10 — вердикт
  const T=titles(S);
  // Ярлык бывает и в четыре слова («Оставляет последнее слово»), поэтому кегль плавающий
  const size=t=>t.length>18?'52px':t.length>13?'62px':'80px';
  sl.push(['peach',`${hd('Вердикт',both)}
  <div style="margin-top:44px;display:flex;gap:64px">
   <div class="stat"><span class="n">${fm(S.total)}</span><span class="sub">${plural(S.total,MSG)}</span></div>
   <div class="stat"><span class="n">${fm(S.days)}</span><span class="sub">${plural(S.days,DAY)}</span></div>
   <div class="stat"><span class="n">${fm(S.sessions)}</span><span class="sub">${plural(S.sessions,TALK)}</span></div>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:52px">
   <div><span class="name a"><span class="dot a"></span>${A}</span>
    <div class="h2" style="margin-top:10px;font-size:${size(T.A.title)}">${T.A.title}</div>
    <div class="sub" style="margin-top:14px">${T.A.text}</div></div>
   <div><span class="name m"><span class="dot m"></span>${M}</span>
    <div class="h2" style="margin-top:10px;font-size:${size(T.M.title)}">${T.M.title}</div>
    <div class="sub" style="margin-top:14px">${T.M.text}</div></div></div>
  <div class="note" style="margin-top:0">${T.chat}</div>
  ${ft(10)}`]);

  return sl.map(([c,h])=>[c,h.replace(/__N__/g,String(sl.length))]);
}

// Правила вердикта: у кого какая метрика перевешивает соперника.
// Ярлыки — глагольные: пол участника из экспорта неизвестен, а «Голосовой» про Анастасию
// и «Нежная» про Михаила одинаково стыдны. Глагол в третьем лице рода не имеет.
export function titles(S){
  const A=S.names.A,M=S.names.M;
  const r=(a,b)=>a/Math.max(b,5);
  const x=v=>String(v>=10?Math.round(v):+v.toFixed(1)).replace('.',',');   // 2,2 — не 2.2
  S.kw.love=S.kw.love||{A:0,M:0};
  function person(u,o){
    const cand=[];const push=(score,title,line)=>{if(score>0)cand.push({score,title,line})};
    push(r(S.edited[u],S.edited[o]),'Правит написанное',`переписывает отправленное в ${x(r(S.edited[u],S.edited[o]))} раза чаще`);
    push(r(S.kw.thanks[u],S.kw.thanks[o]),'Говорит спасибо',`благодарит в ${x(r(S.kw.thanks[u],S.kw.thanks[o]))} раза чаще`);
    push(r(S.kw.sorry[u],S.kw.sorry[o]),'Извиняется первым',`просит прощения в ${x(r(S.kw.sorry[u],S.kw.sorry[o]))} раза чаще`);
    push(r(S.kw.laugh[u],S.kw.laugh[o]),'Смеётся чаще',`смеётся в ${x(r(S.kw.laugh[u],S.kw.laugh[o]))} раза чаще`);
    push(r(S.kw.swear[u],S.kw.swear[o]),'Ругается крепче',`матерится в ${x(r(S.kw.swear[u],S.kw.swear[o]))} раза чаще`);
    push(r(S.voice[u],S.voice[o])*0.8,'Говорит голосом',`${fm(S.voice[u])} голосовых против ${fm(S.voice[o])}`);
    push(r(S.quotes[u],S.quotes[o]),'Отвечает цитатой',`цитирует сообщения в ${x(r(S.quotes[u],S.quotes[o]))} раза чаще`);
    push(r(S.starts[u],S.starts[o]),'Начинает разговор',`заводит ${pct(S.starts[u],S.starts[o])} % разговоров`);
    push(r(S.ends[u],S.ends[o]),'Оставляет последнее слово',`закрывает ${pct(S.ends[u],S.ends[o])} % разговоров`);
    push((S.night[u]/S.per_user[u])/((S.night[o]/S.per_user[o])||0.01),'Пишет по ночам',`${Math.round(S.night[u]/S.per_user[u]*100)} % сообщений после полуночи`);
    push(r(S.kw.me[u]/(S.kw.we[u]||1),S.kw.me[o]/(S.kw.we[o]||1)),'Говорит про себя',`«я» в ${x(S.kw.me[u]/(S.kw.we[u]||1))} раза чаще, чем «мы»`);
    push(r(S.double[u],S.double[o]),'Пишет вдогонку',`${fm(S.double[u])} раз написал снова, не дождавшись ответа`);
    push(r(S.long_msgs[u],S.long_msgs[o]),'Пишет простынями',`${fm(S.long_msgs[u])} сообщений длиннее трёх сотен знаков`);
    push(r(S.reactions_by[u],S.reactions_by[o]),'Ставит реакции',`${pct(S.reactions_by[u],S.reactions_by[o])} % всех реакций`);
    push(r(S.kw.promise[u],S.kw.promise[o]),'Обещает вернуться',`«сделаю, скину» — ${fm(S.kw.promise[u])} раз`);
    push(r(S.max_monologue[u],S.max_monologue[o]),'Говорит без остановки',`${fm(S.max_monologue[u])} сообщений подряд без ответа`);
    push(S.kw.love[u]/Math.max(S.kw.love[o],30),'Пишет тёплое',`${fm(S.kw.love[u])} нежных слов`);
    cand.sort((a,b)=>b.score-a.score);
    const top=cand.filter(c=>c.score>1.15).slice(0,3);
    return top.length
      ? {title:top[0].title,text:top.map(t=>t.line).join(', ')+'.'}
      : {title:'Зеркало',text:`отличий от ${S.names[o]} не нашлось: ни одна привычка не перевешивает.`};
  }
  const diff=Math.abs(S.per_user.A-S.per_user.M),tot=S.total;
  const sym=diff/tot<0.05?'симметричная до неприличия':diff/tot<0.2?'почти равная':`с перекосом: ${S.per_user.A>S.per_user.M?A:M} пишет на ${Math.round(Math.max(S.per_user.A,S.per_user.M)/Math.min(S.per_user.A,S.per_user.M)*100-100)} % больше`;
  const doms=S.domains.slice(0,3).map(d=>d[0]).join(', ');
  const work=/docs\.google|notion|figma|github|telemost|zoom|meet\.google|jira|trello/.test(doms);
  const night=Math.round((S.night.A+S.night.M)/tot*100);
  const chat=`Переписка ${sym}. ${S.resp_median.A<60&&S.resp_median.M<60?'Оба отвечают за минуту.':'Отвечают неторопливо.'} ${night>=25?`Каждое ${Math.round(100/night)}-е сообщение ночью.`:'Ночью тишина.'} ${doms?`Ссылки ведут в ${doms} — ${work?'это работа.':'это жизнь.'}`:''}`.trim();
  return {A:person('A','M'),M:person('M','A'),chat};
}
