"use client";
import React,{useState,useEffect,useRef} from "react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { Input } from "@/components/ui/input";
interface CustomerSuggestion{id:string;full_name:string;phone:string|null;email:string|null}
export interface CustomerPickerProps{value:string;onChange:(name:string)=>void;onSelect:(id:string,name:string)=>void;onClear:()=>void;placeholder?:string;inputClassName?:string}
export default function CustomerPicker({value,onChange,onSelect,onClear,placeholder="Search customer name or phone...",inputClassName=""}:CustomerPickerProps){
 const [suggestions,setSuggestions]=useState<CustomerSuggestion[]>([]);const selected=useRef(false);
 useEffect(()=>{if(value.trim().length<2){setSuggestions([]);return;}const timer=setTimeout(async()=>{const session=readSession();if(!session)return;try{const result=await apiRequest<{data:CustomerSuggestion[]}>("/customers?q="+encodeURIComponent(value.trim()),{method:"GET"},session.token);setSuggestions(result.data.slice(0,5));}catch(error){console.error("Customer search failed",error);}},180);return()=>clearTimeout(timer);},[value]);
 const choose=(c:CustomerSuggestion)=>{selected.current=true;setSuggestions([]);onSelect(c.id,c.full_name);};
 return <div className="relative"><Input type="text" value={value} onChange={e=>{selected.current=false;onChange(e.target.value);}} onBlur={()=>{setTimeout(()=>{setSuggestions([]);if(!selected.current)onClear();},200);}} placeholder={placeholder} className={inputClassName} autoComplete="off"/>{suggestions.length>0&&<div className="absolute left-0 right-0 z-50 mt-1 max-h-[180px] overflow-y-auto rounded-2xl border border-[#1d2434] bg-[#111520] shadow-2xl">{suggestions.map(c=><button key={c.id} type="button" onMouseDown={()=>choose(c)} className="flex w-full items-center justify-between border-b border-[#1d2434] px-4 py-2.5 text-left text-xs hover:bg-[#1c2333]"><span className="font-bold text-white">{c.full_name}</span><span className="font-mono text-[10px] text-slate-400">{c.phone||c.email||"Customer"}</span></button>)}</div>}</div>;
}
