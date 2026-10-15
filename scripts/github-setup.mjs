import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=process.argv[2],api=process.argv[3];
if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||''))throw new Error('Aufruf: node scripts/github-setup.mjs BENUTZER/REPO [https://deine-api-domain]');
function gh(args,input){const result=spawnSync('gh',args,{input,encoding:'utf8',stdio:['pipe','inherit','inherit']});if(result.error)throw new Error('GitHub CLI (gh) installieren und mit gh auth login anmelden.');if(result.status!==0)throw new Error('GitHub-Einrichtung fehlgeschlagen.');}
gh(['auth','status']);
const key=readFileSync(path.join(root,'.private/unser-alltag.keystore')).toString('base64');
const {password}=JSON.parse(readFileSync(path.join(root,'.private/signing.json'),'utf8'));
// Secret values go through stdin, never command-line arguments or logs.
gh(['secret','set','ANDROID_KEYSTORE_BASE64','--repo',repo],key);
gh(['secret','set','ANDROID_KEYSTORE_PASSWORD','--repo',repo],password);
if(api){if(new URL(api).protocol!=='https:')throw new Error('Die Serveradresse muss HTTPS verwenden.');gh(['variable','set','API_URL','--repo',repo,'--body',api]);}
console.log('GitHub-Build-Secrets eingerichtet. Den Release-Workflow jetzt im Repository starten.');
