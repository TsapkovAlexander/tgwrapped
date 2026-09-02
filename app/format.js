// Форматтеры чисел и времени. Один источник для карточек и текстового отчёта.
export const fm=n=>Math.round(n).toLocaleString('ru-RU');
export const hm=h=>String(Math.floor(h)).padStart(2,'0')+':'+String(Math.round(h%1*60)).padStart(2,'0');
export const pct=(a,b)=>Math.round(a/((a+b)||1)*100);
// Согласование числительных: plural(3,['день','дня','дней']) → 'дня'
export const plural=(n,f)=>{const a=Math.abs(Math.round(n))%100,b=a%10;return f[a>4&&a<21?2:b===1?0:b>1&&b<5?1:2]};
export const np=(n,f)=>fm(n)+' '+plural(n,f);
export const DAY=['день','дня','дней'],MSG=['сообщение','сообщения','сообщений'],
  CALL=['звонок','звонка','звонков'],WORD=['слово','слова','слов'],PAGE=['страница','страницы','страниц'],
  Q=['вопрос','вопроса','вопросов'],TALK=['разговор','разговора','разговоров'];
