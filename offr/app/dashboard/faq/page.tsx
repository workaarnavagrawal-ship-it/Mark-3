"use client";
import { useState } from "react";

const FAQS = [
  { category: "How it works", q: "How accurate are the predictions?", a: "offr scores are built on published entry requirements and self-reported offer data from 4,000+ students who applied in 2024–25. We weight your grades, personal statement quality, and applicant status. It's a strong signal — not a guarantee, but far more grounded than published minimums alone." },
  { category: "How it works", q: "What's the difference between Reach, Target and Safe?", a: "Safe (>70%) means you're comfortably above threshold and competitive in the real applicant pool. Target (40–70%) means it could genuinely go either way — your PS and interview will matter. Reach (<40%) means there's a significant gap. Possible, but exceptional supporting material would be needed." },
  { category: "How it works", q: "What is 'real applicant pool' data?", a: "We gathered self-reported offer data from students who applied in 2024–25 across 14 universities. This lets us compare your grades to people who actually received offers — not just the published floor. It's a more honest picture of what admission really looks like." },
  { category: "Personal statement", q: "Why does my personal statement affect the prediction?", a: "Our data shows a clear correlation between PS quality and offer rates, particularly at selective universities. Students with stronger statements consistently outperform those with similar grades but weaker ones. offr weights PS impact based on institutional selectivity." },
  { category: "Personal statement", q: "How does line-by-line PS feedback work?", a: "The PS Analyser splits your statement into sentence-level chunks, then evaluates each one for intellectual depth, specificity, evidence, and subject relevance. Each chunk gets a score (1–10), a verdict (Strong/Improve/Weak/Neutral), feedback, and an optional suggested rewrite." },
  { category: "Personal statement", q: "Should I use the UCAS 3 questions or single text format?", a: "If you're applying for 2025 entry, use the UCAS 3 questions format — it matches the new UCAS application structure. The legacy single-text format is there for older applications or if you prefer to draft as a continuous statement first." },
  { category: "Your profile", q: "Can I update my profile later?", a: "Yes — go to My Profile anytime and edit your grades, PS, or interests. All future assessments will automatically use your updated information." },
  { category: "Your profile", q: "Is my data secure?", a: "Yes. Your profile is stored in Supabase with row-level security — only you can access your data. Your personal statement is never shared or used outside of your own assessments." },
  { category: "Your profile", q: "Can I use offr for A-Levels as well as IB?", a: "Yes. offr supports both IB Diploma and A-Level students. Your predicted grades are compared against real offer holder profiles for each course." },
  { category: "Tracker & strategy", q: "How does the Offer Tracker work?", a: "Every time you run an assessment, it's saved automatically to your tracker. You can label each choice (Firm, Insurance, Backup, Wildcard), view your full UCAS picture in one place, and delete or re-run any entry." },
  { category: "Tracker & strategy", q: "What are hidden gems in Explore?", a: "Hidden gems are excellent, career-relevant courses that are less well-known than the obvious options — things like MORSE at Warwick, Cognitive Science at Edinburgh, or Management Science at LSE. They often have lower competition and strong graduate outcomes." },
  { category: "Tracker & strategy", q: "What does the Strategy page do?", a: "Strategy helps you audit your UCAS shortlist as a whole. It analyses your Safe/Target/Reach mix and flags if your list is unbalanced. It also surfaces PS improvement tips and alternative course suggestions based on your interests." },
  { category: "General", q: "Is offr free?", a: "Yes, completely. No credit card, no premium tier." },
  { category: "General", q: "What universities does offr cover?", a: "We currently cover 14 UK universities including Oxford, Cambridge, LSE, Imperial, UCL, Warwick, Edinburgh, Bristol, Durham, Bath, St Andrews, King's College London, Manchester, and Exeter." },
];

const CATEGORIES = [...new Set(FAQS.map(f => f.category))];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = activeCategory ? FAQS.filter(f => f.category === activeCategory) : FAQS;

  return (
    <div style={{ padding: "48px 52px", maxWidth: "700px" }}>
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Support</p>
        <h1 className="serif" style={{ fontSize: "44px", fontWeight: 400, letterSpacing: "-0.025em", color: "var(--t)", marginBottom: "12px" }}>FAQ</h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>Everything you need to know about how offr works.</p>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "7px", marginBottom: "24px", flexWrap: "wrap" }}>
        <button onClick={() => setActiveCategory(null)} style={{ padding: "6px 14px", borderRadius: "9999px", border: `1px solid ${!activeCategory ? "var(--acc)" : "var(--b)"}`, background: !activeCategory ? "var(--acc)" : "transparent", color: !activeCategory ? "var(--t-inv)" : "var(--t3)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms" }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setActiveCategory(activeCategory === c ? null : c)} style={{ padding: "6px 14px", borderRadius: "9999px", border: `1px solid ${activeCategory === c ? "var(--acc)" : "var(--b)"}`, background: activeCategory === c ? "var(--acc)" : "transparent", color: activeCategory === c ? "var(--t-inv)" : "var(--t3)", fontSize: "12px", cursor: "pointer", fontFamily: "var(--font-dm, var(--sans))", transition: "all 150ms" }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        {filtered.map((faq, i) => {
          const idx = FAQS.indexOf(faq);
          const isOpen = open === idx;
          return (
            <div key={idx} style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: "var(--r)", overflow: "hidden" }}>
              <button onClick={() => setOpen(isOpen ? null : idx)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left", gap: "16px", transition: "background 150ms",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--s2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <span style={{ fontSize: "14px", color: "var(--t)", lineHeight: 1.4, fontFamily: "var(--font-dm, var(--sans))" }}>{faq.q}</span>
                <span style={{ color: "var(--t3)", fontSize: "12px", flexShrink: 0, display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>▾</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 22px 18px", borderTop: "1px solid var(--b)" }}>
                  <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.8, paddingTop: "16px" }}>{faq.a}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
