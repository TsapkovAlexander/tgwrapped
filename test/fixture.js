// Синтетический экспорт Telegram Desktop: столько сообщений, сколько нужно тесту.
export const msg=(id,from,date,text,extra={})=>({id,type:'message',date,from,from_id:'user_'+from,text,...extra});

// n сообщений подряд от чередующихся отправителей, по одному в минуту от startISO
export function chat(n,users=['Лена','Дима'],startISO='2026-01-05T10:00:00',text='ок'){
  const t0=new Date(startISO).getTime(),out=[];
  for(let i=0;i<n;i++){
    const d=new Date(t0+i*60000);
    out.push(msg(i+1,users[i%users.length],iso(d),text));
  }
  return out;
}
export const iso=d=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
const p=n=>String(n).padStart(2,'0');
export const exp=messages=>({name:'Тест',type:'personal_chat',id:1,messages});
