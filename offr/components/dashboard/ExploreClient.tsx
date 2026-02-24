"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCourses, getUniversities } from "@/lib/api";
import type { CourseListItem } from "@/lib/types";

const HIDDEN_GEMS = ["MORSE","Liberal Arts","Cognitive Science","Human Sciences","Management Science","Linguistics","Global Health","Law with another subject","Computer Science & Philosophy"];

const CURATED = [
  { name: "PPE", full: "Philosophy, Politics & Economics", unis: ["Oxford","Warwick","UCL","Durham"], vibe: "The classic route to politics, journalism or finance.", tags: ["Politics","Economics","Philosophy"], hidden: false },
  { name: "Liberal Arts", full: "Liberal Arts & Sciences", unis: ["UCL","King's","Exeter"], vibe: "Design your own degree across humanities, social science and natural science.", tags: ["History","Philosophy","Sociology"], hidden: true },
  { name: "MORSE", full: "Maths, Operational Research, Stats & Economics", unis: ["Warwick"], vibe: "One of the most employable degrees in the UK. Maths meets the real world.", tags: ["Mathematics","Economics"], hidden: true },
  { name: "Human Sciences", full: "Human Sciences", unis: ["Oxford","UCL"], vibe: "Biology, psychology, anthropology and evolution combined.", tags: ["Biology","Psychology"], hidden: true },
  { name: "Management", full: "Management with Finance/Marketing", unis: ["LSE","Bath","Warwick"], vibe: "Proper academic business with a quantitative edge.", tags: ["Business","Economics","Mathematics"], hidden: false },
  { name: "International Relations", full: "International Relations", unis: ["LSE","Warwick","St Andrews","Edinburgh"], vibe: "Geopolitics, diplomacy, global economics. Great for law or international careers.", tags: ["Politics","History","Economics"], hidden: false },
  { name: "Cognitive Science", full: "Cognitive Science", unis: ["Edinburgh","Sussex"], vibe: "Brain, mind, AI and language. One of the most underrated degrees.", tags: ["Psychology","Computer Science","Philosophy"], hidden: true },
  { name: "History & Economics", full: "History & Economics", unis: ["LSE","Warwick","Durham"], vibe: "More analytical than straight history, more contextual than straight econ.", tags: ["History","Economics"], hidden: false },
  { name: "CS & Philosophy", full: "Computer Science & Philosophy", unis: ["Oxford","Edinburgh","King's"], vibe: "Ethics, AI and logic. A rare combination that genuinely stands out.", tags: ["Computer Science","Philosophy"], hidden: true },
  { name: "Biomedical Sciences", full: "Biomedical Sciences", unis: ["UCL","Imperial","King's","Edinburgh"], vibe: "Medicine-adjacent without the clinical commitment. Strong for research.", tags: ["Biology","Chemistry"], hidden: false },
  { name: "Architecture", full: "Architecture (B.Arch / BA)", unis: ["UCL","Edinburgh","Manchester","Bath"], vibe: "Art meets engineering meets urban planning. A lifestyle degree.", tags: ["Art & Design","Mathematics"], hidden: false },
  { name: "Global Health", full: "Global Health & Social Medicine", unis: ["King's"], vibe: "Medicine's policy and social side. Underrated and unusual.", tags: ["Biology","Sociology"], hidden: true },
  { name: "Economics & Politics", full: "Economics & Politics", unis: ["Warwick","Bristol","Edinburgh","Bath"], vibe: "Everything you need for policy, consultancy or finance.", tags: ["Economics","Politics"], hidden: false },
  { name: "Linguistics", full: "Linguistics", unis: ["Cambridge","Edinburgh","UCL"], vibe: "Language, cognition, structure. Massively underrated for tech careers.", tags: ["Philosophy","Computer Science"], hidden: true },
  { name: "Management Science", full: "Management Science / Decision Science", unis: ["Warwick","LSE","Bath"], vibe: "Quantitative business. Loved by consulting and finance firms.", tags: ["Mathematics","Business","Economics"], hidden: true },
  { name: "Cognitive & Computer Science", full: "Cognitive & Computer Science", unis: ["Sussex","Edinburgh"], vibe: "The AI-native degree. Combines ML, cognition and data.", tags: ["Computer Science","Psychology"], hidden: true },
];

const ALL_TAGS = [...new Set(CURATED.flatMap(c => c.tags))].sort();

export function ExploreClient({ interests }: { interests: string[] }) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");

  const suggested = interests.length > 0
    ? CURATED.filter(c => c.tags.some(t => interests.includes(t))).slice(0, 4)
    : [];

  const filtered = CURATED.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.full.toLowerCase().includes(search.toLowerCase()) && !c.vibe.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTag && !c.tags.includes(activeTag)) return false;
    if (!showHidden && c.hidden) return false;
    return true;
  });

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Discovery</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, color: "var(--t)", marginBottom: "10px", letterSpacing: "-0.02em" }}>Explore Courses</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Degrees you might not have considered. Some of the best courses are the least obvious.</p>
      </div>

      {/* Suggested */}
      {suggested.length > 0 && (
        <div style={{ marginBottom: "36px" }}>
          <p className="label" style={{ marginBottom: "14px" }}>Based on your interests · {interests.join(", ")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {suggested.map(c => (
              <div key={c.name} style={{ padding: "20px 22px", background: "var(--s1)", border: "1px solid var(--b-strong)", borderRadius: "var(--r)", transition: "border-color 150ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--acc)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6px" }}>
                  <h3 className="serif" style={{ fontSize: "18px", fontWeight: 400, color: "var(--t)" }}>{c.name}</h3>
                  {c.hidden && <span style={{ fontSize: "10px", color: "var(--tgt-t)", border: "1px solid var(--tgt-b)", background: "var(--tgt-bg)", borderRadius: "9999px", padding: "2px 8px", flexShrink: 0, marginLeft: "8px" }}>hidden gem</span>}
                </div>
                <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "10px" }}>{c.full}</p>
                <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.6, marginBottom: "14px" }}>{c.vibe}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                  {c.unis.slice(0,3).map(u => <span key={u} style={{ fontSize: "11px", color: "var(--t3)", border: "1px solid var(--b)", borderRadius: "9999px", padding: "2px 9px" }}>{u}</span>)}
                </div>
                <Link href={`/dashboard/assess?query=${encodeURIComponent(c.full)}`} style={{ fontSize: "12px", color: "var(--t3)", textDecoration: "none", transition: "color 150ms" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--t)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--t3)"}>
                  Check my chances →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div style={{ marginBottom: "24px" }}>
        <input className="inp" placeholder="Search courses, subjects, or keywords…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: "12px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
          {ALL_TAGS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{
              padding: "5px 13px", borderRadius: "9999px", fontSize: "12px", cursor: "pointer",
              border: `1px solid ${activeTag === tag ? "var(--acc)" : "var(--b)"}`,
              background: activeTag === tag ? "var(--acc)" : "transparent",
              color: activeTag === tag ? "var(--t-inv)" : "var(--t3)",
              fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms",
            }}>
              {tag}
            </button>
          ))}
          <button onClick={() => setShowHidden(v => !v)} style={{
            marginLeft: "auto", padding: "5px 13px", borderRadius: "9999px", fontSize: "12px", cursor: "pointer",
            border: `1px solid ${showHidden ? "var(--tgt-b)" : "var(--b)"}`,
            background: showHidden ? "var(--tgt-bg)" : "transparent",
            color: showHidden ? "var(--tgt-t)" : "var(--t3)",
            fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms",
          }}>
            {showHidden ? "✦ Showing hidden gems" : "Show hidden gems"}
          </button>
        </div>
      </div>

      {/* Course list */}
      {filtered.length === 0 ? (
        <div style={{ padding: "48px 32px", textAlign: "center", color: "var(--t3)", fontSize: "14px" }}>No courses match your filters.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map(c => (
            <div key={c.name} style={{ padding: "20px 24px", background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", transition: "border-color 150ms" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <h3 className="serif" style={{ fontSize: "18px", fontWeight: 400, color: "var(--t)" }}>{c.name}</h3>
                    {c.hidden && <span style={{ fontSize: "10px", color: "var(--tgt-t)", border: "1px solid var(--tgt-b)", background: "var(--tgt-bg)", borderRadius: "9999px", padding: "2px 8px" }}>hidden gem ✦</span>}
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "8px" }}>{c.full}</p>
                  <p style={{ fontSize: "13px", color: "var(--t2)", lineHeight: 1.65 }}>{c.vibe}</p>
                </div>
              </div>
              <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                {c.unis.map(u => <span key={u} style={{ fontSize: "11px", color: "var(--t3)", border: "1px solid var(--b)", borderRadius: "9999px", padding: "2px 9px" }}>{u}</span>)}
                <Link href={`/dashboard/assess?query=${encodeURIComponent(c.full)}`}
                  style={{ marginLeft: "auto", fontSize: "12px", color: "var(--t3)", border: "1px solid var(--b)", borderRadius: "9999px", padding: "4px 12px", textDecoration: "none", transition: "all 150ms" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--t)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--b)"; (e.currentTarget as HTMLElement).style.color = "var(--t3)"; }}>
                  Check my chances →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
