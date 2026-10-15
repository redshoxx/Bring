import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createServer } from 'node:http';
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { canRead, canWrite, publicUser } from './policy.mjs';
import { credentials, itemInput, settingsInput } from './validation.mjs';
import { startImageWorker } from './images.mjs';
const scrypt = promisify(scryptCb);
export const hash = token => createHash('sha256').update(token).digest('hex');
export const fail = (status, message) => Object.assign(new Error(message), { status });
const deserialize = item => ({ ...item, data: JSON.parse(item.data), updated: Number(item.updated) });

export async function createApp(db, options = {}) {
  const app = express(), server = createServer(app);
  app.set('trust proxy', options.trustProxy ?? false);
  app.use(helmet());
  const origins = (options.origins || '').split(',').filter(Boolean);
  app.use((req,res,next) => {
    if (origins.includes(req.headers.origin)) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary','Origin'); }
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    res.setHeader('Cache-Control','no-store'); next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.use(rateLimit({ windowMs: 60000, limit: options.testing ? 10000 : 240, standardHeaders: 'draft-8', legacyHeaders: false }));
  const authLimit = rateLimit({ windowMs: 15*60000, limit: options.testing ? 10000 : 30, standardHeaders: 'draft-8', legacyHeaders: false });
  async function userForToken(token) {
    if (!token || typeof token !== 'string' || token.length > 200) return null;
    return (await db.query('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.hash=$1 AND s.expires>$2', [hash(token), Date.now()]))[0] || null;
  }
  const auth = async (req, res, next) => {
    try { req.user = await userForToken(req.headers.authorization?.replace(/^Bearer /,'')); if (!req.user) throw fail(401,'Bitte erneut anmelden.'); next(); } catch(e) { next(e); }
  };
  const session = async user => {
    const token = randomBytes(32).toString('hex');
    await db.query('INSERT INTO sessions(hash,user_id,expires) VALUES($1,$2,$3)', [hash(token), user.id, Date.now()+30*86400000]);
    return { token, user: publicUser(user) };
  };
  async function snapshot(user) {
    const people = await db.query('SELECT * FROM users WHERE household=$1', [user.household]);
    const byId = Object.fromEntries(people.map(p=>[p.id,p]));
    const items = await db.query('SELECT * FROM items WHERE household=$1 ORDER BY updated DESC', [user.household]);
    return { user: publicUser(user), partner: people.filter(p=>p.id !== user.id).map(p=>({ id:p.id, name:p.name })), items:items.filter(i=>canRead(user,i,byId[i.owner])).map(deserialize), serverTime:Date.now(), imageGeneration:!!options.imageKey };
  }
  const wss = new WebSocketServer({ server, path:'/live', maxPayload:4096 });
  async function broadcast(household) {
    await Promise.all([...wss.clients].map(async socket => {
      try {
        if (!socket.token || socket.readyState !== 1) return;
        const user = await userForToken(socket.token);
        if (!user) return socket.close(4001,'Session abgelaufen');
        if (user.household === household || socket.household === household) {
          socket.household = user.household;
          socket.send(JSON.stringify({ type:'snapshot', ...(await snapshot(user)) }));
        }
      } catch { socket.close(1011,'Synchronisierung fehlgeschlagen'); }
    }));
  }
  wss.on('connection', socket => {
    const timeout = setTimeout(()=>socket.close(4001,'Anmeldung erforderlich'),5000);
    socket.on('message', async message => {
      try {
        const event = JSON.parse(message.toString());
        if (event.type !== 'auth' || socket.token) return;
        const user = await userForToken(event.token);
        if (!user) return socket.close(4001,'Anmeldung fehlgeschlagen');
        clearTimeout(timeout); socket.token = event.token; socket.household = user.household; socket.alive = true;
        socket.send(JSON.stringify({type:'snapshot', ...(await snapshot(user))}));
      } catch { socket.close(4000,'Ungültige Nachricht'); }
    });
    socket.on('pong',()=>{ socket.alive=true; });
    socket.on('close',()=>clearTimeout(timeout));
  });
  const heartbeat = setInterval(async ()=>{
    for (const socket of wss.clients) {
      if (!socket.alive || !(await userForToken(socket.token))) { socket.terminate(); continue; }
      socket.alive=false; socket.ping();
    }
  },30000); heartbeat.unref();
  app.get('/health',async (req,res)=>{ await db.query('SELECT 1 AS ok'); res.json({ok:true, version:'0.1.0'}); });
  app.post('/auth/register',authLimit,async (req,res)=>{
    const input = credentials.parse(req.body);
    if (!input.name) throw fail(400,'Bitte deinen Namen eingeben.');
    const id = randomUUID(), household = randomUUID(), salt=randomBytes(16).toString('hex');
    const password = `${salt}:${(await scrypt(input.password,salt,64)).toString('hex')}`;
    try {
      await db.transaction(async q=>{
        await q('INSERT INTO households(id) VALUES($1)',[household]);
        await q('INSERT INTO users(id,email,name,password,household) VALUES($1,$2,$3,$4,$5)',[id,input.email,input.name,password,household]);
      });
    } catch(e) { if(e.code==='23505' || e.code?.startsWith('ERR_SQLITE')) throw fail(409,'Dieses Konto kann nicht angelegt werden.'); throw e; }
    res.status(201).json(await session((await db.query('SELECT * FROM users WHERE id=$1',[id]))[0]));
  });
  app.post('/auth/login',authLimit,async (req,res)=>{
    const input=credentials.parse(req.body), user=(await db.query('SELECT * FROM users WHERE email=$1',[input.email]))[0];
    const [salt,stored]=(user?.password || 'none:'+ '00'.repeat(64)).split(':');
    const derived=await scrypt(input.password,salt,64);
    if (!user || !timingSafeEqual(derived,Buffer.from(stored,'hex'))) throw fail(401,'E-Mail oder Passwort stimmt nicht.');
    res.json(await session(user));
  });
  app.post('/auth/logout',auth,async (req,res)=>{
    const token=req.headers.authorization.slice(7);
    await db.query('DELETE FROM sessions WHERE hash=$1',[hash(token)]);
    for(const socket of wss.clients) if(socket.token===token) socket.close(4001,'Abgemeldet');
    res.sendStatus(204);
  });
  app.get('/snapshot',auth,async(req,res)=>res.json(await snapshot(req.user)));
  app.patch('/settings',auth,async(req,res)=>{
    const input=settingsInput.parse(req.body);
    const user=await db.transaction(async q=>{
      // Lock the household to serialize settings writes on PostgreSQL.
      await q('UPDATE households SET id=id WHERE id=$1',[req.user.household]);
      const current=(await q('SELECT * FROM users WHERE id=$1',[req.user.id]))[0];
      const prior=JSON.parse(current.settings), settings={...prior,...input,shares:{...prior.shares,...input.shares},enabled:{...prior.enabled,...input.enabled}};
      return (await q('UPDATE users SET settings=$1 WHERE id=$2 RETURNING *',[JSON.stringify(settings),current.id]))[0];
    });
    await broadcast(user.household); res.json(await snapshot(user));
  });
  app.post('/partner/invite',auth,async(req,res)=>{
    const code=randomBytes(16).toString('hex');
    await db.transaction(async q=>{
      await q('UPDATE households SET id=id WHERE id=$1',[req.user.household]);
      const users=await q('SELECT id FROM users WHERE household=$1',[req.user.household]);
      if(users.length!==1) throw fail(409,'Ihr seid bereits verbunden.');
      await q('DELETE FROM invites WHERE household=$1',[req.user.household]);
      await q('INSERT INTO invites(hash,household,expires) VALUES($1,$2,$3)',[hash(code),req.user.household,Date.now()+86400000]);
    });
    res.json({ code, expiresInHours:24 });
  });
  app.post('/partner/join',auth,async(req,res)=>{
    const code=String(req.body.code||'').trim(); if(!/^[a-f0-9]{32}$/.test(code)) throw fail(400,'Einladungscode ist ungültig.');
    const oldHousehold=req.user.household;
    const newHousehold=await db.transaction(async q=>{
      const invitation=(await q('SELECT * FROM invites WHERE hash=$1',[hash(code)]))[0];
      if(!invitation || Number(invitation.expires)<Date.now() || invitation.used) throw fail(400,'Einladung ist abgelaufen oder wurde schon verwendet.');
      if(invitation.household===oldHousehold) throw fail(400,'Das ist deine eigene Einladung.');
      // Consistent lock order prevents deadlocks for simultaneous cross-invitations.
      for(const hid of [oldHousehold,invitation.household].sort()) await q('UPDATE households SET id=id WHERE id=$1',[hid]);
      const fresh=(await q('SELECT * FROM users WHERE id=$1',[req.user.id]))[0];
      if(fresh.household!==oldHousehold) throw fail(409,'Verbindung hat sich geändert. Bitte erneut versuchen.');
      const members=await q('SELECT id FROM users WHERE household=$1',[invitation.household]);
      const own=await q('SELECT id FROM users WHERE household=$1',[oldHousehold]);
      if(members.length!==1 || own.length!==1) throw fail(409,'Eines der Konten ist bereits verbunden.');
      const used=await q('UPDATE invites SET used=1 WHERE hash=$1 AND used=0 RETURNING hash',[hash(code)]);
      if(!used.length) throw fail(409,'Einladung wurde bereits verwendet.');
      await q('UPDATE users SET household=$1 WHERE id=$2',[invitation.household,req.user.id]);
      await q('UPDATE items SET household=$1 WHERE owner=$2',[invitation.household,req.user.id]);
      await q('DELETE FROM invites WHERE household=$1',[oldHousehold]);
      return invitation.household;
    });
    await broadcast(oldHousehold); await broadcast(newHousehold);
    const current=(await db.query('SELECT * FROM users WHERE id=$1',[req.user.id]))[0];
    res.json(await snapshot(current));
  });
  app.post('/partner/leave',auth,async(req,res)=>{
    const next=randomUUID();
    await db.transaction(async q=>{
      await q('UPDATE households SET id=id WHERE id=$1',[req.user.household]);
      await q('INSERT INTO households(id) VALUES($1)',[next]);
      await q('UPDATE users SET household=$1 WHERE id=$2',[next,req.user.id]);
      await q('UPDATE items SET household=$1 WHERE owner=$2',[next,req.user.id]);
      await q('DELETE FROM invites WHERE household=$1',[req.user.household]);
    });
    await broadcast(req.user.household); await broadcast(next);
    res.json(await snapshot((await db.query('SELECT * FROM users WHERE id=$1',[req.user.id]))[0]));
  });
  app.put('/items/:id',auth,async(req,res)=>{
    const input=itemInput.parse(req.body); if(input.id!==req.params.id) throw fail(400,'ID stimmt nicht überein.');
    const result=await db.transaction(async q=>{
      await q('UPDATE households SET id=id WHERE id=$1',[req.user.household]);
      const user=(await q('SELECT * FROM users WHERE id=$1',[req.user.id]))[0];
      const existing=(await q('SELECT * FROM items WHERE id=$1',[input.id]))[0];
      if(existing) {
        const owner=(await q('SELECT * FROM users WHERE id=$1',[existing.owner]))[0];
        if(!canWrite(user,existing,owner)) throw fail(404,'Eintrag nicht verfügbar.');
        if(existing.kind!==input.kind || (existing.owner!==user.id && existing.visibility!==input.visibility)) throw fail(403,'Nur der Eigentümer darf die Freigabe ändern.');
        if(existing.rev!==input.expectedRev) throw fail(409,'Der Eintrag wurde inzwischen geändert. Bitte neu öffnen.');
      } else if(input.expectedRev!==0) throw fail(409,'Der Eintrag wurde inzwischen gelöscht.');
      if(input.data.assignee) {
        const person=(await q('SELECT id FROM users WHERE id=$1 AND household=$2',[input.data.assignee,user.household]))[0];
        if(!person) throw fail(400,'Diese Person gehört nicht zu eurem Haushalt.');
        if(input.visibility==='private' && input.data.assignee!==user.id) throw fail(400,'Private Aufgaben können nur dir zugeteilt werden.');
      }
      if(input.data.imageId) {
        const img=(await q('SELECT * FROM images WHERE id=$1',[input.data.imageId]))[0];
        if(!img || (img.owner!==user.id && input.data.imageId!==JSON.parse(existing?.data||'{}').imageId)) throw fail(403,'Dieses Bild gehört nicht zu deinem Gericht.');
      }
      const values=[JSON.stringify(input.data), input.visibility, Date.now(), input.id];
      if(existing) return (await q('UPDATE items SET data=$1,visibility=$2,updated=$3,rev=rev+1 WHERE id=$4 RETURNING *',values))[0];
      return (await q('INSERT INTO items(id,owner,household,kind,visibility,data,updated) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[input.id,user.id,user.household,input.kind,input.visibility,JSON.stringify(input.data),Date.now()]))[0];
    });
    await broadcast(result.household); res.json(deserialize(result));
  });
  app.delete('/items/:id',auth,async(req,res)=>{
    await db.transaction(async q=>{
      await q('UPDATE households SET id=id WHERE id=$1',[req.user.household]);
      const item=(await q('SELECT * FROM items WHERE id=$1',[req.params.id]))[0];
      if(!item) throw fail(404,'Eintrag nicht verfügbar.');
      const owner=(await q('SELECT * FROM users WHERE id=$1',[item.owner]))[0];
      if(!canWrite(req.user,item,owner)) throw fail(404,'Eintrag nicht verfügbar.');
      if(item.rev!==Number(req.query.rev)) throw fail(409,'Eintrag wurde inzwischen geändert. Bitte neu öffnen.');
      await q('DELETE FROM items WHERE id=$1',[item.id]);
    });
    await broadcast(req.user.household); res.sendStatus(204);
  });
  const imageDir=path.resolve(options.imageDir || './data/images'); await mkdir(imageDir,{recursive:true});
  const images=startImageWorker(db,{...options,imageDir,broadcast});
  app.post('/images',auth,rateLimit({windowMs:86400000,limit:options.testing?10000:20}),async(req,res)=>{
    if(!options.imageKey) throw fail(503,'Automatische Bilder sind am Server noch nicht eingerichtet.');
    const title=String(req.body.title||'').trim(); if(!title || title.length>180) throw fail(400,'Bitte ein Gericht eingeben.');
    const fingerprint=hash(title.toLocaleLowerCase('de-AT'));
    const image=await db.transaction(async q=>{
      const cached=(await q('SELECT * FROM images WHERE owner=$1 AND fingerprint=$2',[req.user.id,fingerprint]))[0];
      if(cached) { if(cached.status==='failed') await q("UPDATE images SET status='pending' WHERE id=$1",[cached.id]); return {...cached,status:cached.status==='failed'?'pending':cached.status}; }
      return (await q('INSERT INTO images(id,owner,fingerprint,prompt,status,created) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),req.user.id,fingerprint,title,'pending',Date.now()]))[0];
    });
    res.status(202).json({id:image.id,status:image.status}); images.wake();
  });
  async function permittedImage(user,id) {
    const image=(await db.query('SELECT * FROM images WHERE id=$1',[id]))[0];
    if(!image) return null; if(image.owner===user.id) return image;
    const people=await db.query('SELECT * FROM users WHERE household=$1',[user.household]);
    const owner=people.find(p=>p.id===image.owner);
    if(!owner) return null;
    const items=await db.query('SELECT * FROM items WHERE household=$1 AND owner=$2',[user.household,owner.id]);
    return items.some(i=>JSON.parse(i.data).imageId===id && canRead(user,i,owner))?image:null;
  }
  app.get('/images/:id/status',auth,async(req,res)=>{
    const image=await permittedImage(req.user,req.params.id); if(!image) throw fail(404,'Bild nicht verfügbar.');
    res.json({id:image.id,status:image.status});
  });
  app.get('/images/:id/file',auth,async(req,res)=>{
    const image=await permittedImage(req.user,req.params.id); if(!image || image.status!=='ready') throw fail(404,'Bild nicht verfügbar.');
    const bytes=await readFile(path.join(imageDir,image.filename)); res.type('png').send(bytes);
  });
  app.use((error,req,res,next)=>{
    if(error.name==='ZodError') return res.status(400).json({error:'Bitte die Eingaben prüfen.',details:error.issues.map(i=>({path:i.path,message:i.message}))});
    if(error.type==='entity.parse.failed') return res.status(400).json({error:'Ungültige Anfrage.'});
    if(!error.status) console.error('Server error:',error.message);
    res.status(error.status||500).json({error:error.status?error.message:'Ein Serverfehler ist aufgetreten.'});
  });
  return {app,server,wss,broadcast,snapshot,close:async()=>{clearInterval(heartbeat);images.stop();for(const s of wss.clients)s.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));await db.close();}};
}
