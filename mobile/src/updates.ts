import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { configured } from './api';
import { storage } from './storage';
export type Release = {version:string;notes:string;android:{url:string;sha256:string};ios:{sourceUrl:string}};
export const currentVersion=Constants.expoConfig?.version||'0.1.0';
export function newer(next:string,current:string){const a=next.split('.').map(Number),b=current.split('.').map(Number);if(a.length!==3||a.some(n=>!Number.isInteger(n)))return false;for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}
export async function checkUpdate():Promise<Release|null>{
  const manifestUrl=await storage.get('alltag.updateManifest')||configured.updateManifest;
  if(Platform.OS==='web'||!manifestUrl)return null;
  const manifest=new URL(manifestUrl);if(manifest.protocol!=='https:')throw new Error('Update-Adresse muss HTTPS verwenden.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  let response:Response;
  try{response=await fetch(manifest.toString(),{headers:{'Cache-Control':'no-cache'},signal:controller.signal});}finally{clearTimeout(timer);}
  if(!response.ok)throw new Error('Update-Prüfung momentan nicht erreichbar.');
  const data=await response.json();
  if(typeof data.version!=='string'||!newer(data.version,currentVersion))return null;
  const target=Platform.OS==='android'?data.android?.url:data.ios?.sourceUrl;
  if(typeof target!=='string'||new URL(target).protocol!=='https:')throw new Error('Ungültige Update-Adresse.');
  return data;
}
