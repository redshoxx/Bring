import React from 'react';
export default function DuePicker({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const local=value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
  return React.createElement('input',{type:'datetime-local',value:local,'aria-label':'Fälligkeit',onChange:(e:any)=>{if(e.target.value)onChange(new Date(e.target.value).toISOString());},style:{padding:14,border:'1px solid #E4DDE5',borderRadius:12,fontFamily:'inherit',fontSize:16,background:'#FFFEFC',color:'#382C43',width:'100%',boxSizing:'border-box'}});
}
