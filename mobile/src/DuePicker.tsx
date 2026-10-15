import React,{useState} from 'react';
import { View,Pressable,Text,Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
export default function DuePicker({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const [mode,setMode]=useState<'date'|'time'|null>(null),date=value?new Date(value):new Date();
  return <View><Pressable accessibilityRole="button" accessibilityLabel="Fälligkeit ändern" onPress={()=>setMode('date')} style={{padding:14,backgroundColor:'#F1ECF3',borderRadius:12}}><Text>{date.toLocaleString('de-AT',{dateStyle:'medium',timeStyle:'short'})}</Text></Pressable>{mode&&<DateTimePicker value={date} mode={Platform.OS==='ios'?'datetime':mode} display={Platform.OS==='ios'?'spinner':'default'} onChange={(event,next)=>{if(event.type==='dismissed'){setMode(null);return;}if(next)onChange(next.toISOString());setMode(Platform.OS==='android'&&mode==='date'?'time':null);}}/>}{mode&&Platform.OS==='ios'&&<Pressable onPress={()=>setMode(null)}><Text style={{padding:12,color:'#382C43'}}>Übernehmen</Text></Pressable>}</View>;
}
