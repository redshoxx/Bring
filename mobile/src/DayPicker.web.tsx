import React from 'react';
import {View,Text} from 'react-native';
import {s} from './ui';
export default function DayPicker({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <View style={{gap:7,marginBottom:15}}><Text style={s.label}>{label}</Text>{React.createElement('input',{type:'date',value,'aria-label':label,onChange:(e:any)=>{if(e.target.value)onChange(e.target.value);},style:{padding:13,border:'1px solid #EBE4E9',borderRadius:12,fontFamily:'inherit',fontSize:15,background:'#FFFEFC',color:'#382C43',width:'100%',boxSizing:'border-box',minHeight:50}})}</View>;}
