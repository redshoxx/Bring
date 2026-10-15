import http from 'node:http';
import express from 'express';
import path from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {database} from '../server/src/db.mjs';
import {createApp} from '../server/src/app.mjs';
const db=await database(undefined,'./server/data/preview.sqlite');
const api=await createApp(db,{testing:true,imageDir:'./server/data/images'});
api.server.listen(8080,'127.0.0.1');
const app=express();
app.get('/qa-mobile',(req,res)=>res.type('html').send('<!doctype html><html><head><title>Unser Alltag · mobile Prüfung</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:24px;background:#eee8e3"><iframe title="Unser Alltag" src="/" style="display:block;width:393px;height:852px;border:0;background:#F9F6F2"></iframe></body></html>'));
// Disposable first-party QA fixture, available only in this local preview server.
// This endpoint is never included in the production server image or mobile build.
let tester=(await db.query("SELECT * FROM users WHERE email='preview@example.test'"))[0];
if(!tester){
  const id=randomUUID(),household=randomUUID();await db.query('INSERT INTO households(id) VALUES($1)',[household]);
  await db.query('INSERT INTO users(id,email,name,password,household) VALUES($1,$2,$3,$4,$5)',[id,'preview@example.test','Wolfi',`${randomBytes(16).toString('hex')}:${randomBytes(64).toString('hex')}`,household]);
  tester=(await db.query('SELECT * FROM users WHERE id=$1',[id]))[0];
  const today=new Date(),tomorrow=new Date(Date.now()+86400000);const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fixtures=[...['Milch','Paprika','Brot','Joghurt','Reis'].map((title,i)=>({kind:'shopping',data:{title,quantity:['1 Liter','3 Stück','1 Stück','2 Becher','1 Packung'][i],done:false}})),{kind:'dinner',data:{title:'Hähnchen mit Reis',date:key(today),portions:2,ingredients:[{title:'Hähnchen',quantity:'400 g'},{title:'Reis',quantity:'200 g'}]}},{kind:'takeaway',visibility:'private',data:{title:'Couscous-Salat',date:key(tomorrow),portions:1,preparation:'cook'}},{kind:'task',data:{title:'Paket abholen',due:tomorrow.toISOString(),reminder:true,assignee:id}},{kind:'task',data:{title:'Küche aufräumen',done:false}}];
  for(const fixture of fixtures)await db.query('INSERT INTO items(id,owner,household,kind,visibility,data,updated) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,household,fixture.kind,fixture.visibility||'shared',JSON.stringify(fixture.data),Date.now()]);
}
app.post('/preview/session',async(req,res)=>{const token=randomBytes(32).toString('hex');await db.query('INSERT INTO sessions(hash,user_id,expires) VALUES($1,$2,$3)',[createHash('sha256').update(token).digest('hex'),tester.id,Date.now()+3600000]);res.setHeader('Cache-Control','no-store');res.json({token});});
app.use('/api',(req,res)=>{const proxy=http.request({host:'127.0.0.1',port:8080,path:req.url,method:req.method,headers:req.headers},upstream=>{res.writeHead(upstream.statusCode,upstream.headers);upstream.pipe(res);});proxy.on('error',()=>res.sendStatus(502));req.pipe(proxy);});
app.use(express.static(path.resolve('mobile/dist')));
app.get('/{*path}',(req,res)=>res.sendFile(path.resolve('mobile/dist/index.html')));
const server=http.createServer(app);server.on('upgrade',(req,socket,head)=>{const proxy=http.request({host:'127.0.0.1',port:8080,path:req.url,headers:req.headers});proxy.on('upgrade',(response,upstream,upstreamHead)=>{socket.write('HTTP/1.1 101 Switching Protocols\r\n'+Object.entries(response.headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')+'\r\n');if(head.length)upstream.write(head);if(upstreamHead.length)socket.write(upstreamHead);upstream.pipe(socket);socket.pipe(upstream);});proxy.on('error',()=>socket.destroy());proxy.end();});
server.listen(4173,'0.0.0.0',()=>console.log('Webprüfung: Port 4173'));
