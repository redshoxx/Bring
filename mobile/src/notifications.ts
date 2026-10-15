import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Item } from './types';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:true,shouldSetBadge:false})});
export async function allowNotifications() {
  if(Platform.OS==='web')return false;
  if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('tasks',{name:'Aufgaben-Erinnerungen',importance:Notifications.AndroidImportance.HIGH});
  const current=await Notifications.getPermissionsAsync();
  return current.granted || (await Notifications.requestPermissionsAsync()).granted;
}
let sequence=Promise.resolve();
export function syncReminders(items:Item[],userId:string,enabled:boolean){
  if(Platform.OS==='web')return Promise.resolve();
  sequence=sequence.catch(()=>{}).then(async()=>{
    // Only manage this app's task schedules; never clear unrelated notifications.
    const existing=(await Notifications.getAllScheduledNotificationsAsync()).filter(n=>n.identifier.startsWith('task:'));
    const permission=await Notifications.getPermissionsAsync();
    const wanted=new Map<string,{item:Item,date:Date}>();
    if(enabled&&permission.granted)for(const item of items){
      if(item.kind!=='task'||item.data.done||!item.data.reminder||!item.data.due)continue;
      if(item.data.assignee ? item.data.assignee!==userId : item.owner!==userId)continue;
      const date=new Date(item.data.due);date.setMinutes(date.getMinutes()-(item.data.reminderMinutes??1440));
      if(date.getTime()>Date.now())wanted.set(`task:${item.id}:${item.rev}`,{item,date});
    }
    for(const n of existing)if(!wanted.has(n.identifier))await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const present=new Set(existing.map(n=>n.identifier));
    for(const [id,{item,date}] of [...wanted].sort((a,b)=>a[1].date.getTime()-b[1].date.getTime()).slice(0,60)){
      if(present.has(id))continue;
      await Notifications.scheduleNotificationAsync({identifier:id,content:{title:'Erinnerung an deine Aufgabe',body:item.data.title,sound:'default',data:{itemId:item.id}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date,channelId:'tasks'}});
    }
  });return sequence;
}
