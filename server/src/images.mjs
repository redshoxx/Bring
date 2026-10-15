import { writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export function startImageWorker(db, options) {
  let busy=false, stopped=false;
  async function work() {
    if(busy || stopped || !options.imageKey) return;
    busy=true;
    try {
      const image=(await db.query("SELECT * FROM images WHERE status='pending' ORDER BY created LIMIT 1"))[0];
      if(!image) return;
      await db.query("UPDATE images SET status='working' WHERE id=$1",[image.id]);
      try {
        const response=await fetch('https://api.openai.com/v1/images/generations',{
          method:'POST',headers:{Authorization:`Bearer ${options.imageKey}`,'Content-Type':'application/json'},
          body:JSON.stringify({model:options.imageModel||'gpt-image-1',prompt:`Photorealistic appetizing food photography of this dish: ${image.prompt}. A single plated serving, natural warm daylight, neutral warm ceramic tableware, close-up, no people, no text, no labels. Illustrative meal picture, not a nutrition claim.`,size:'1024x1024',quality:'low',n:1}),
          signal:AbortSignal.timeout(180000),
        });
        if(!response.ok) throw new Error(`Bilddienst HTTP ${response.status}`);
        const result=await response.json(), encoded=result.data?.[0]?.b64_json;
        if(!encoded) throw new Error('Bilddienst lieferte kein Bild.');
        const filename=`${image.id}.png`, temp=path.join(options.imageDir,filename+'.tmp');
        await writeFile(temp,Buffer.from(encoded,'base64'),{mode:0o600}); await rename(temp,path.join(options.imageDir,filename));
        await db.query("UPDATE images SET status='ready',filename=$1 WHERE id=$2",[filename,image.id]);
      } catch(e) { console.error('Bildgenerierung:',e.message); await db.query("UPDATE images SET status='failed' WHERE id=$1",[image.id]); }
      const owner=(await db.query('SELECT household FROM users WHERE id=$1',[image.owner]))[0];
      if(owner) await options.broadcast(owner.household);
    } finally { busy=false; }
  }
  // Resume jobs interrupted by a process restart (one worker process per deployment).
  db.query("UPDATE images SET status='pending' WHERE status='working'").catch(()=>{});
  const timer=setInterval(()=>void work().catch(e=>console.error(e.message)),2000);timer.unref();
  return {wake:()=>void work().catch(e=>console.error(e.message)),stop:()=>{stopped=true;clearInterval(timer);}};
}
