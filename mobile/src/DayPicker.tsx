import React,{useState} from 'react';
import {View,Text,Pressable,Platform} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {s} from './ui';
export default function DayPicker({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  const [open,setOpen]=useState(false);const date=new Date(`${value}T12:00:00`);
  return <View style={{gap:7,marginBottom:15}}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(true)} style={s.input}><Text style={s.body}>{date.toLocaleDateString('de-AT',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</Text></Pressable>{open&&<DateTimePicker value={date} mode="date" display={Platform.OS==='ios'?'spinner':'default'} onChange={(event,next)=>{if(Platform.OS!=='ios')setOpen(false);if(event.type==='set'&&next)onChange(`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}-${String(next.getDate()).padStart(2,'0')}`);}}/>}{open&&Platform.OS==='ios'&&<Pressable onPress={()=>setOpen(false)}><Text style={s.bodyStrong}>Übernehmen</Text></Pressable>}</View>;
}
