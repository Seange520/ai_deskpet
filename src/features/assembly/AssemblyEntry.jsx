import {useState} from 'react';
import {createPortal} from 'react-dom';
import {Wrench} from 'lucide-react';
import {useWorldMap} from '../world/navigationStore';
import {nearKickback} from '../street/kickbackStore';
import AssemblyPanel from './AssemblyPanel';
import {useAssembly} from './assemblyStore';
import './assembly.css';
export default function AssemblyEntry(){
 const [open,setOpen]=useState(false),nav=useWorldMap(),done=useAssembly(s=>s.save.completed);
 const available=nearKickback()&&!nav.open&&!nav.active;
 return createPortal(<>{available&&!open&&<button className="assembly-entry" data-assembly-bench aria-label="打开装配台" onClick={()=>setOpen(true)}><i className={done?"assembly-cold-lamp lit":"assembly-cold-lamp"} aria-label={done?"冷库灯亮":"冷库灯灭"}/><Wrench size={18}/><span>冷库门旁 · 根之手装配台{done?' · 冷库灯亮':''}</span></button>}{open&&<AssemblyPanel onClose={()=>setOpen(false)}/>}</>,document.body);
}
