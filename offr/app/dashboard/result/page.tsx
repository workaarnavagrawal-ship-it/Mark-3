"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadAssessment } from "@/lib/storage";
import type { OfferAssessResponse } from "@/lib/types";

const BS: Record<string, any> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "var(--safe-b)", bar: "var(--safe-t)" },
  Target: { bg: "var(--tgt-bg)",  color: "var(--tgt-t)",  border: "var(--tgt-b)", bar: "var(--tgt-t)" },
  Reach:  { bg: "var(--rch-bg)",  color: "var(--rch-t)",  border: "var(--rch-b)", bar: "var(--rch-t)" },
};

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return <p style={{ color: "var(--t3)", fontSize: "13px" }}>—</p>;
  return (
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "9px" }}>
      {items.map((x,i) => (
        <li key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "var(--t2)", lineHeight: 1.65 }}>
          <span style={{ color: "var(--b-strong)", flexShrink: 0, marginTop: "2px" }}>·</span>{x}
        </li>
      ))}
    </ul>
  );
}

export default function ResultPage() {
  const [data, setData] = useState<OfferAssessResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setData(loadAssessment()); }, []);
  if (!mounted) return null;

  if (!data) return (
    <div style={{ padding: "48px 52px" }}>
      <p style={{ color: "var(--t3)", marginBottom: "20px" }}>No result found.</p>
      <Link href="/dashboard/assess" className="btn btn-prim">Run an assessment →</Link>
    </div>
  );

  const bs = BS[data.band] || BS.Reach;
  const MSG = {
    Safe: "You're comfortably above the threshold and competitive in the real applicant pool.",
    Target: "It could genuinely go either way. Your PS and any interview will matter.",
    Reach: "There's a meaningful gap. Outstanding supporting material would be needed.",
  };

  return (
    <div style={{ padding: "48px 52px", maxWidth: "780px" }}>
      {/* Hero result */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <span className="pill" style={{ background: bs.bg, color: bs.color, border: `1px solid ${bs.border}`, marginBottom: "16px", display: "inline-flex" }}>{data.band}</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "10px" }}>
              <p className="serif" style={{ fontSize: "72px", fontWeight: 400, color: "var(--t)", lineHeight: 1, letterSpacing: "-0.03em" }}>{data.chance_percent}</p>
              <span className="serif" style={{ fontSize: "32px", color: "var(--t3)" }}>%</span>
            </div>
            <p className="serif" style={{ fontSize: "18px", color: "var(--t2)", marginBottom: "6px" }}>{data.verdict}</p>
            {data.course.course_name && <p style={{ fontSize: "13px", color: "var(--t3)" }}>{data.course.course_name}</p>}
          </div>
          <Link href="/dashboard/assess" style={{ fontSize: "13px", color: "var(--t3)", textDecoration: "none" }}>New →</Link>
        </div>

        <p style={{ fontSize: "14px", color: "var(--t3)", marginBottom: "16px", lineHeight: 1.7 }}>{MSG[data.band]}</p>

        {/* Band bar */}
        <div style={{ height: "4px", borderRadius: "2px", background: "var(--s3)", overflow: "hidden", marginBottom: "6px" }}>
          <div style={{ height: "100%", background: bs.bar, width: `${Math.max(2, Math.min(100, data.chance_percent))}%`, borderRadius: "2px", transition: "width 1s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--t3)" }}>
          <span>Reach &lt;40%</span><span>Target 40–70%</span><span>Safe &gt;70%</span>
        </div>
      </div>

      {/* Applicant context */}
      {data.applicant_context && (
        <div className="card" style={{ marginBottom: "10px" }}>
          <p className="label" style={{ marginBottom: "14px" }}>Real applicant pool · 2024–25</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
            <span className="serif" style={{ fontSize: "40px", color: "var(--t)", fontWeight: 400 }}>Top {100 - data.applicant_context.percentile}%</span>
            <span style={{ fontSize: "13px", color: "var(--t3)" }}>of offer holders</span>
          </div>
          <div style={{ height: "3px", background: "var(--s3)", borderRadius: "2px", marginBottom: "10px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "var(--acc)", opacity: 0.6, width: `${data.applicant_context.percentile}%`, borderRadius: "2px" }} />
          </div>
          <p style={{ fontSize: "13px", color: "var(--t3)", lineHeight: 1.65 }}>
            Your grade profile ranks in the top {100 - data.applicant_context.percentile}% of {data.applicant_context.n} self-reported offer holders at this university from 2024–25.
          </p>
        </div>
      )}

      {/* Checks */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <div className="card">
          <p className="label" style={{ marginBottom: "14px" }}>Passed checks</p>
          <Bullets items={data.checks.passed} />
        </div>
        <div className="card">
          <p className="label" style={{ marginBottom: "14px" }}>Areas of concern</p>
          <Bullets items={data.checks.failed} />
        </div>
      </div>

      {/* What would improve */}
      {data.counsellor.what_to_do_next?.length > 0 && (
        <div className="card" style={{ marginBottom: "10px" }}>
          <p className="label" style={{ marginBottom: "14px" }}>What would improve this result</p>
          <Bullets items={data.counsellor.what_to_do_next} />
        </div>
      )}

      {/* Counsellor */}
      <div className="card" style={{ marginBottom: "10px" }}>
        <p className="label" style={{ marginBottom: "16px" }}>Admissions analysis</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          <div>
            <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Strengths</p>
            <Bullets items={data.counsellor.strengths} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" }}>Risks</p>
            <Bullets items={data.counsellor.risks} />
          </div>
        </div>
      </div>

      {/* PS */}
      {data.ps_analysis && (
        <div className="card" style={{ marginBottom: "10px" }}>
          <p className="label" style={{ marginBottom: "14px" }}>Personal statement</p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <span className="pill" style={{ background: "var(--s3)", color: "var(--t2)", border: "1px solid var(--b)" }}>{data.ps_analysis.scores?.band}</span>
            <span style={{ fontSize: "13px", color: "var(--t3)" }}>{data.ps_analysis.scores?.weighted_total}/100</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Strengths</p>
              <Bullets items={(data.ps_analysis.strengths || []).slice(0,3)} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>To improve</p>
              <Bullets items={[...(data.ps_analysis.risks||[]), ...(data.ps_analysis.red_flags||[])].slice(0,3)} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <Link href="/dashboard/assess" className="btn btn-prim">Try another →</Link>
        <Link href="/dashboard/tracker" className="btn btn-ghost">View tracker</Link>
        <Link href="/dashboard/ps" className="btn btn-ghost">Analyse PS</Link>
      </div>
    </div>
  );
}
