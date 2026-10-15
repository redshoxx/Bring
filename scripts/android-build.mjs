import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const privateDir=path.join(root,'.private');mkdirSync(privateDir,{recursive:true,mode:0o700});
const keyFile=path.join(privateDir,'unser-alltag.keystore'),configFile=path.join(privateDir,'signing.json');
let password=process.env.ANDROID_KEYSTORE_PASSWORD,alias='alltag';
if(process.env.CI){
  if(!process.env.ANDROID_KEYSTORE_BASE64||!password)throw new Error('Android-Signierung fehlt: ANDROID_KEYSTORE_BASE64 und ANDROID_KEYSTORE_PASSWORD als GitHub-Secrets setzen.');
  writeFileSync(keyFile,Buffer.from(process.env.ANDROID_KEYSTORE_BASE64,'base64'),{mode:0o600});
}else if(existsSync(configFile))({password,alias}=JSON.parse(readFileSync(configFile,'utf8')));
else{
  password=randomBytes(30).toString('hex');
  const result=spawnSync('keytool',['-genkeypair','-v','-keystore',keyFile,'-alias',alias,'-keyalg','RSA','-keysize','3072','-validity','10000','-storepass:env','KEY_PASSWORD','-keypass:env','KEY_PASSWORD','-dname','CN=Unser Alltag, O=Private App, C=AT'],{env:{...process.env,KEY_PASSWORD:password},stdio:'inherit'});
  if(result.status!==0)throw new Error('Signaturschlüssel konnte nicht erzeugt werden.');
  writeFileSync(configFile,JSON.stringify({password,alias},null,2),{mode:0o600});
}
const gradle=path.join(root,'mobile/android/app/build.gradle');let content=readFileSync(gradle,'utf8');
if(!content.includes('signingConfigs.alltagRelease')){
  content=content.replace('    buildTypes {',`    signingConfigs {
        alltagRelease {
            storeFile file(System.getenv('ALLTAG_KEYSTORE'))
            storePassword System.getenv('ALLTAG_KEY_PASSWORD')
            keyAlias System.getenv('ALLTAG_KEY_ALIAS')
            keyPassword System.getenv('ALLTAG_KEY_PASSWORD')
        }
    }
    buildTypes {`);
  content=content.replace(/(release\s*\{[\s\S]*?signingConfig )signingConfigs.debug/,'$1signingConfigs.alltagRelease');
  writeFileSync(gradle,content);
}
const env={...process.env,ALLTAG_KEYSTORE:keyFile,ALLTAG_KEY_PASSWORD:password,ALLTAG_KEY_ALIAS:alias,NODE_ENV:'production'};
const command=process.platform==='win32'?'gradlew.bat':'./gradlew';
const result=spawnSync(command,[':app:assembleRelease','--no-daemon','--max-workers=2','-PreactNativeArchitectures=arm64-v8a,armeabi-v7a'],{cwd:path.join(root,'mobile/android'),env,stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
mkdirSync(path.join(root,'releases'),{recursive:true});copyFileSync(path.join(root,'mobile/android/app/build/outputs/apk/release/app-release.apk'),path.join(root,'releases/Unser-Alltag.apk'));
console.log('Installierbare APK: releases/Unser-Alltag.apk');
