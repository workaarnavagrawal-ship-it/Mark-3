"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Note { id: string; title: string; body: string; x: number; y: number; tone: "parchment"|"smoke"|"moss"|"aubergine"; minimized: boolean; zIndex: number; }

const TONES = {
  parchment: { bg:"rgba(232,223,200,0.12)", border:"rgba(232,223,200,0.22)", title:"#EFE8D8", body:"#B9B6AE", dot:"#E8DFC8" },
  smoke:     { bg:"rgba(18,18,22,0.80)",   border:"rgba(255,255,255,0.10)", title:"#F4F1E8", body:"#6E6C66", dot:"#6E6C66" },
  moss:      { bg:"rgba(22,48,24,0.72)",   border:"rgba(40,74,46,0.50)",   title:"#BFE8C7", body:"#7AAB84", dot:"#BFE8C7" },
  aubergine: { bg:"rgba(42,18,42,0.78)",   border:"rgba(100,40,100,0.38)", title:"#DFC8EF", body:"#9B7AAB", dot:"#DFC8EF" },
};

let topZ = 200;

export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showTray, setShowTray] = useState(false);
  const drag = useRef<{ id:string; sx:number; sy:number; nx:number; ny:number }|null>(null);

  const add = (tone: Note["tone"]) => { topZ++; const id = Math.random().toString(36).slice(2); setNotes(p => [...p, { id, title:"", body:"", x:80+Math.random()*120, y:60+Math.random()*80, tone, minimized:false, zIndex:topZ }]); setShowTray(false); };
  const upd = (id: string, patch: Partial<Note>) => setNotes(p => p.map(n => n.id===id ? {...n,...patch} : n));
  const del = (id: string) => setNotes(p => p.filter(n => n.id!==id));
  const front = useCallback((id: string) => { topZ++; upd(id, { zIndex:topZ }); }, []);

  const onDown = (e: React.MouseEvent, id: string, x: number, y: number) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag==="TEXTAREA"||tag==="INPUT"||tag==="BUTTON") return;
    e.preventDefault(); drag.current = { id, sx:e.clientX, sy:e.clientY, nx:x, ny:y }; front(id);
  };

  useEffect(() => {
    const move = (e: MouseEvent) => { if (!drag.current) return; upd(drag.current.id, { x:Math.max(0,drag.current.nx+(e.clientX-drag.current.sx)), y:Math.max(0,drag.current.ny+(e.clientY-drag.current.sy)) }); };
    const up = () => { drag.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <>
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:100 }}>
        {notes.map(n => {
          const t = TONES[n.tone];
          return (
            <div key={n.id} style={{ position:"absolute", left:n.x+210, top:n.y+60, width:n.minimized?"160px":"230px", background:t.bg, border:`1px solid ${t.border}`, backdropFilter:"blur(14px) saturate(120%)", WebkitBackdropFilter:"blur(14px) saturate(120%)", borderRadius:"14px", zIndex:n.zIndex, pointerEvents:"all", boxShadow:"0 4px 24px rgba(0,0,0,0.35)", transition:"width 200ms ease" }}>
              <div onMouseDown={e => onDown(e,n.id,n.x,n.y)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px 8px", cursor:"grab", borderBottom:n.minimized?"none":`1px solid ${t.border}`, userSelect:"none" }}>
                <div style={{ display:"flex", gap:"4px" }}>
                  {(Object.keys(TONES) as Note["tone"][]).map(tone => (
                    <button key={tone} onClick={() => upd(n.id,{tone})} style={{ width:"8px", height:"8px", borderRadius:"50%", background:TONES[tone].dot, border:"none", cursor:"pointer", opacity:n.tone===tone?1:0.28, transition:"opacity 150ms" }} />
                  ))}
                </div>
                <div style={{ display:"flex", gap:"3px" }}>
                  <button onClick={() => upd(n.id,{minimized:!n.minimized})} style={{ background:"transparent", border:"none", color:t.body, fontSize:"12px", cursor:"pointer", padding:"0 3px", lineHeight:1 }}>{n.minimized?"□":"—"}</button>
                  <button onClick={() => del(n.id)} style={{ background:"transparent", border:"none", color:t.body, fontSize:"14px", cursor:"pointer", padding:"0 3px", lineHeight:1 }}>×</button>
                </div>
              </div>
              {!n.minimized && (
                <div style={{ padding:"10px 12px 12px" }} onClick={() => front(n.id)}>
                  <input value={n.title} onChange={e => upd(n.id,{title:e.target.value})} placeholder="Title" style={{ width:"100%", background:"transparent", border:"none", outline:"none", fontFamily:"var(--font-garamond, var(--serif))", fontSize:"14px", fontWeight:500, color:t.title, marginBottom:"7px", display:"block" }} />
                  <textarea value={n.body} onChange={e => upd(n.id,{body:e.target.value})} placeholder="Write a note…" rows={4} style={{ width:"100%", background:"transparent", border:"none", outline:"none", fontSize:"13px", color:t.body, resize:"none", lineHeight:1.55, fontFamily:"var(--font-dm, var(--sans))", display:"block" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <div style={{ position:"fixed", bottom:"24px", right:"24px", zIndex:150, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"8px" }}>
        {showTray && (
          <div className="glass-dark" style={{ borderRadius:"12px", padding:"7px", minWidth:"136px", display:"flex", flexDirection:"column", gap:"1px" }}>
            {(Object.keys(TONES) as Note["tone"][]).map(tone => (
              <button key={tone} onClick={() => add(tone)} style={{ display:"flex", alignItems:"center", gap:"9px", background:"transparent", border:"none", padding:"8px 10px", borderRadius:"8px", cursor:"pointer", color:"var(--t2)", fontSize:"13px", fontFamily:"var(--font-dm, var(--sans))", transition:"background 150ms", textAlign:"left" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background="var(--s3)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background="transparent"}>
                <span style={{ width:"9px", height:"9px", borderRadius:"50%", background:TONES[tone].dot, flexShrink:0, display:"inline-block" }} />
                {tone.charAt(0).toUpperCase()+tone.slice(1)}
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setShowTray(v => !v)} style={{ width:"42px", height:"42px", borderRadius:"50%", background:showTray?"var(--acc)":"var(--s2)", border:`1px solid ${showTray?"transparent":"var(--b-strong)"}`, color:showTray?"var(--t-inv)":"var(--t3)", fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.4)", transition:"all 160ms ease" }}>
          {showTray?"×":"✎"}
        </button>
      </div>
    </>
  );
}
