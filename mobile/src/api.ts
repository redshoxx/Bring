import Constants from 'expo-constants';
import { Platform } from 'react-native';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export const configured = Constants.expoConfig?.extra || {};
export const initialUrl = configured.apiUrl || (Platform.OS==='web' ? `${location.origin}/api` : '');
export function normalizeUrl(input:string) {
  const text=input.trim().replace(/\/$/,'');
  const url=new URL(text);
  const local=['localhost','127.0.0.1','10.0.2.2','terminal.local'].includes(url.hostname);
  if(url.protocol!=='https:' && !(url.protocol==='http:' && (__DEV__ || local))) throw new Error('Bitte eine HTTPS-Serveradresse verwenden.');
  if(url.username||url.password||url.search||url.hash) throw new Error('Bitte nur die Serveradresse ohne Zugangsdaten eingeben.');
  return text;
}
export async function request(base:string,token:string|null,route:string,method='GET',body?:unknown) {
  let response:Response;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {response=await fetch(`${base}${route}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{}),signal:controller.signal});} catch {throw new ApiError(0,'Keine Verbindung zum Server. Bitte Verbindung prüfen.');}finally{clearTimeout(timer);}
  if(response.status===204)return null;
  const json=await response.json().catch(()=>({error:'Ungültige Serverantwort.'}));
  if(!response.ok)throw new ApiError(response.status,json.error||'Anfrage fehlgeschlagen.');
  return json;
}
export function socketUrl(base:string){const url=new URL(base);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.pathname='/live';return url.toString();}
