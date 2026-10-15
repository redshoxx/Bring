import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { initialUrl, normalizeUrl, request, socketUrl, ApiError } from './api';
import { storage } from './storage';
import { Item, ItemData, Kind, Settings, Snapshot } from './types';
import { syncReminders } from './notifications';
function newId(){
  const bytes=Crypto.getRandomBytes(16);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function useHousehold(){
  const [base,setBase]=useState(initialUrl),[token,setToken]=useState<string|null>(null),[snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [ready,setReady]=useState(false),[status,setStatus]=useState<'connecting'|'live'|'offline'>('connecting');
  const [error,setError]=useState(''),[saving,setSaving]=useState(0);const alive=useRef(true);
  useEffect(()=>{alive.current=true;(async()=>{const [url,t]=await Promise.all([storage.get('alltag.server'),storage.token()]);if(!alive.current)return;if(url)setBase(url);setToken(t);setReady(true);})().catch(()=>{setError('Gespeicherte Anmeldung konnte nicht geladen werden.');setReady(true);});return()=>{alive.current=false;};},[]);
  const apply=useCallback((next:Snapshot)=>{setSnapshot(next);setError('');},[]);
  const refresh=useCallback(async()=>{if(!token)return;const next=await request(base,token,'/snapshot');apply(next);},[base,token,apply]);
  const signOut=useCallback(async()=>{
    if(token)await request(base,token,'/auth/logout','POST').catch(()=>{});
    await storage.setToken(null);setToken(null);setSnapshot(null);await syncReminders([], '',false);setStatus('connecting');
  },[base,token]);
  useEffect(()=>{
    if(!ready||!token||!base)return;
    let disposed=false,ws:WebSocket|undefined,retry:ReturnType<typeof setTimeout>|undefined,attempt=0;
    const connect=()=>{
      if(disposed)return;setStatus('connecting');
      try{
        ws=new WebSocket(socketUrl(base));
        ws.onopen=()=>ws?.send(JSON.stringify({type:'auth',token}));
        ws.onmessage=e=>{try{const data=JSON.parse(e.data);if(data.type==='snapshot'&&!disposed){apply(data);setStatus('live');attempt=0;}}catch{setError('Synchronisierung konnte nicht gelesen werden.');}};
        ws.onclose=e=>{if(disposed)return;setStatus('offline');if(e.code===4001){setError('Deine Sitzung ist abgelaufen. Bitte erneut anmelden.');void signOut();return;}retry=setTimeout(connect,Math.min(15000,1000*2**attempt++));};
        ws.onerror=()=>{if(!disposed)setStatus('offline');};
      }catch{setStatus('offline');retry=setTimeout(connect,3000);}
    };
    void refresh().catch(e=>{if(!disposed){setError(e.message);if(e.status===401)void signOut();}});connect();
    const sub=AppState.addEventListener('change',state=>{if(state==='active'){void refresh().catch(()=>{});if(ws?.readyState!==WebSocket.OPEN){clearTimeout(retry);ws?.close();connect();}}});
    return()=>{disposed=true;clearTimeout(retry);sub.remove();ws?.close();};
  },[ready,base,token,apply,refresh,signOut]);
  useEffect(()=>{if(snapshot)void syncReminders(snapshot.items,snapshot.user.id,snapshot.user.settings.notifications??true).catch(()=>setError('Erinnerungen konnten nicht geplant werden. Bitte Berechtigungen prüfen.'));},[snapshot]);
  const authenticate=async(url:string,email:string,password:string,name?:string)=>{
    const normalized=normalizeUrl(url);const auth=await request(normalized,null,name?'/auth/register':'/auth/login','POST',{email,password,...(name?{name}:{})});
    await storage.set('alltag.server',normalized);await storage.setToken(auth.token);setBase(normalized);setToken(auth.token);
  };
  const preview=async()=>{
    if(Platform.OS!=='web'||!['terminal.local','localhost','127.0.0.1'].includes(location.hostname))throw new Error('Nur in der lokalen Testumgebung verfügbar.');
    const auth=await request(location.origin,null,'/preview/session','POST');
    const url=`${location.origin}/api`;await storage.set('alltag.server',url);await storage.setToken(auth.token);setBase(url);setToken(auth.token);
  };
  const save=async(kind:Kind,data:ItemData,visibility:'private'|'shared',item?:Item)=>{
    if(!snapshot)throw new Error('Bitte zuerst anmelden.');
    const id=item?.id||newId();setSaving(n=>n+1);
    try{
      const result:Item=await request(base,token,`/items/${id}`,'PUT',{id,kind,data,visibility,expectedRev:item?.rev||0});
      // An HTTP response is authoritative. A following snapshot reconciles concurrent edits.
      setSnapshot(s=>s?{...s,items:[result,...s.items.filter(i=>i.id!==id)]}:s);
      await refresh();return result;
    }catch(e){if(e instanceof ApiError&&e.status===409)await refresh().catch(()=>{});throw e;}finally{setSaving(n=>n-1);}
  };
  const remove=async(item:Item)=>{setSaving(n=>n+1);try{await request(base,token,`/items/${item.id}?rev=${item.rev}`,'DELETE');setSnapshot(s=>s?{...s,items:s.items.filter(i=>i.id!==item.id)}:s);await refresh();}finally{setSaving(n=>n-1);}};
  const settings=async(input:Settings)=>{apply(await request(base,token,'/settings','PATCH',input));};
  const invite=()=>request(base,token,'/partner/invite','POST');
  const join=async(code:string)=>apply(await request(base,token,'/partner/join','POST',{code}));
  const leave=async()=>apply(await request(base,token,'/partner/leave','POST'));
  return {base,token,snapshot,ready,status,error,setError,saving,authenticate,preview,signOut,save,remove,settings,invite,join,leave,refresh};
}
