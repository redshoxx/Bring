import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Ajv from 'ajv';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
test('Release-Metadaten passen zum offiziellen SideStore-Schema und zur APK',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'alltag-release-test-'));
  try{
    await mkdir(path.join(temp,'releases'));await mkdir(path.join(temp,'mobile/assets'),{recursive:true});
    const apk=Buffer.from('APK fixture; not an installable app');
    await writeFile(path.join(temp,'releases/Unser-Alltag.apk'),apk);
    await writeFile(path.join(temp,'releases/Unser-Alltag.ipa'),'IPA fixture; not an installable app');
    await writeFile(path.join(temp,'mobile/assets/icon.png'),'icon fixture');
    const build=spawnSync(process.execPath,[path.join(root,'scripts/release-metadata.mjs'),'example/unser-alltag','0.1.2'],{cwd:temp,env:{...process.env,GITHUB_REPOSITORY:'',APP_VERSION:''},encoding:'utf8'});
    assert.equal(build.status,0,build.stderr);
    const manifest=JSON.parse(await readFile(path.join(temp,'releases/update.json'),'utf8'));
    assert.equal(manifest.version,'0.1.2');
    assert.equal(manifest.android.sha256,createHash('sha256').update(apk).digest('hex'));
    assert.equal(manifest.android.url,'https://github.com/example/unser-alltag/releases/download/v0.1.2/Unser-Alltag.apk');
    const source=JSON.parse(await readFile(path.join(temp,'releases/sidestore.json'),'utf8'));
    const schema=JSON.parse(await readFile(path.join(root,'docs/sidestore.schema.json'),'utf8'));
    // The published SideStore schema contains annotations with legacy unknown formats.
    const ajv=new Ajv({strict:false,validateFormats:false});const validate=ajv.compile(schema);
    assert.ok(validate(source),JSON.stringify(validate.errors));
    assert.equal(source.apps[0].bundleIdentifier,'at.unseralltag.app');
    assert.equal(source.apps[0].versions[0].version,manifest.version);
    assert.equal(source.apps[0].versions[0].downloadURL,manifest.ios.url);
  }finally{await rm(temp,{recursive:true,force:true});}
});
