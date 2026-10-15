import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import { database } from '../src/db.mjs';
import { createApp } from '../src/app.mjs';

async function setup(t){
  const db=await database(process.env.TEST_DATABASE_URL),instance=await createApp(db,{testing:true,imageDir:'/tmp/alltag-test-images'});
  await new Promise(r=>instance.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${instance.server.address().port}`;
  t.after(()=>instance.close());
  const call=async(token,route,method='GET',body)=>{
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,data:response.status===204?null:await response.json()};
  };
  const register=async(name)=>{const r=await call(null,'/auth/register','POST',{email:`${name}-${randomUUID()}@test.local`,password:'test-password-123',name});assert.equal(r.status,201);return r.data;};
  const a=await register('Wolfi'),b=await register('Partnerin'),c=await register('Fremde');
  const pair=async()=>{const invite=await call(a.token,'/partner/invite','POST');const joined=await call(b.token,'/partner/join','POST',{code:invite.data.code});assert.equal(joined.status,200);return invite.data.code;};
  const item=async(user,kind,visibility='shared',data={title:'Test'})=>{const id=randomUUID();const response=await call(user.token,`/items/${id}`,'PUT',{id,kind,visibility,data,expectedRev:0});assert.equal(response.status,200,JSON.stringify(response.data));return response.data;};
  return {db,instance,base,call,a,b,c,pair,item};
}
test('Konten, Partnerfreigaben und fremde Zugriffe werden serverseitig getrennt',async t=>{
  const {a,b,c,call,pair,item}=await setup(t);const code=await pair();
  const shared=await item(a,'shopping','shared',{title:'Milch',quantity:'1 Liter'});
  const personal=await item(a,'task','private',{title:'Geschenk besorgen'});
  const expense=await item(a,'expense','shared',{title:'Privater Einkauf',amount:42});
  let partner=(await call(b.token,'/snapshot')).data;assert.deepEqual(partner.items.map(i=>i.id),[shared.id]);
  assert.equal((await call(c.token,'/snapshot')).data.items.length,0);
  assert.equal((await call(c.token,`/items/${shared.id}?rev=1`,'DELETE')).status,404);
  assert.equal((await call(b.token,`/items/${personal.id}?rev=1`,'DELETE')).status,404);
  assert.equal((await call(c.token,'/partner/join','POST',{code})).status,400);
  await call(a.token,'/settings','PATCH',{shares:{expense:true}});
  partner=(await call(b.token,'/snapshot')).data;assert.ok(partner.items.some(i=>i.id===expense.id));
  assert.equal((await call(b.token,`/items/${expense.id}`,'PUT',{id:expense.id,kind:'expense',visibility:'shared',data:{title:'Manipuliert',amount:0},expectedRev:1})).status,404);
  await call(a.token,'/settings','PATCH',{shares:{shopping:false,expense:false}});
  partner=(await call(b.token,'/snapshot')).data;assert.equal(partner.items.length,0);
});
test('Gleichzeitige Bearbeitung liefert Konflikt statt stiller Datenüberschreibung',async t=>{
  const {a,b,call,pair,item}=await setup(t);await pair();const milk=await item(a,'shopping');
  const update=(token,title)=>call(token,`/items/${milk.id}`,'PUT',{id:milk.id,kind:'shopping',visibility:'shared',data:{title},expectedRev:1});
  const responses=await Promise.all([update(a.token,'Milch A'),update(b.token,'Milch B')]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  assert.equal((await call(a.token,`/items/${milk.id}?rev=1`,'DELETE')).status,409);
  const fresh=(await call(a.token,'/snapshot')).data.items[0];assert.equal(fresh.rev,2);
  assert.equal((await call(b.token,`/items/${milk.id}?rev=2`,'DELETE')).status,204);
  assert.equal((await update(a.token,'Wieder da')).status,409);
});
test('WebSocket liefert Änderungen und entfernt Daten nach Freigabeentzug',async t=>{
  const {a,b,base,call,pair,item}=await setup(t);await pair();
  const messages=[],waiters=[];const socket=new WebSocket(base.replace('http','ws')+'/live');
  t.after(()=>socket.terminate());
  socket.on('message',raw=>{const value=JSON.parse(raw.toString());messages.push(value);for(const resolve of waiters.splice(0))resolve();});
  const waitFor=async predicate=>{const until=Date.now()+3000;while(!messages.some(predicate)){if(Date.now()>until)throw new Error('WebSocket-Zustand nicht angekommen');await new Promise(r=>{const timeout=setTimeout(r,100);waiters.push(()=>{clearTimeout(timeout);r();});});}return messages.find(predicate);};
  await new Promise(r=>socket.on('open',r));socket.send(JSON.stringify({type:'auth',token:b.token}));
  await waitFor(m=>m.type==='snapshot');const milk=await item(a,'shopping','shared',{title:'Live-Milch'});
  await waitFor(m=>m.items.some(i=>i.id===milk.id));
  const privateItem=await item(a,'task','private',{title:'Geheim'});
  assert.ok(messages.every(m=>!m.items.some(i=>i.id===privateItem.id)));
  messages.length=0;await call(a.token,'/settings','PATCH',{shares:{shopping:false}});
  await waitFor(m=>m.type==='snapshot'&&!m.items.some(i=>i.id===milk.id));
  const closed=new Promise(r=>socket.on('close',r));await call(b.token,'/auth/logout','POST');await closed;
  assert.equal((await call(b.token,'/snapshot')).status,401);
});
test('Trennen beendet Partnerzugriff und jeder behält eigene Einträge',async t=>{
  const {a,b,call,pair,item}=await setup(t);await pair();const own=await item(a,'dinner','shared',{title:'Nudeln',date:'2026-10-20',portions:2});const other=await item(b,'shopping');
  await call(b.token,'/partner/leave','POST');
  assert.deepEqual((await call(a.token,'/snapshot')).data.items.map(i=>i.id),[own.id]);
  assert.deepEqual((await call(b.token,'/snapshot')).data.items.map(i=>i.id),[other.id]);
});
test('Validierung schützt Identitäten und persönliche Aufgaben',async t=>{
  const {a,b,call,pair}=await setup(t);await pair();const id=randomUUID();
  const result=await call(a.token,`/items/${id}`,'PUT',{id,kind:'task',visibility:'private',data:{title:'Privat',assignee:b.user.id},expectedRev:0});assert.equal(result.status,400);
  assert.equal((await call(a.token,`/items/${id}`,'PUT',{id,kind:'shopping',visibility:'shared',data:{title:''},expectedRev:0})).status,400);
  assert.equal((await call(a.token,'/images','POST',{title:'Lachs'})).status,503);
  assert.equal((await call(a.token,`/images/${randomUUID()}/status`)).status,404);
});
