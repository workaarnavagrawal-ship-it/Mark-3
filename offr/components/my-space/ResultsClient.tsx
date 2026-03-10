"use client";

import Link from "next/link";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import Meter from "@/components/monologue/Meter";
import DrawerSheet from "@/components/monologue/DrawerSheet";
import { PrimaryActionKey } from "@/components/monologue/Keys";
import { useState } from "react";
import type { ProfileV2 } from "@/lib/types";

const BAND_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)", color: "var(--tgt-t)", border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)", color: "var(--rch-t)", border: "1px solid var(--rch-b)" },
};

interface Props {
  profile: ProfileV2;
  assessments: any[];
}

export function ResultsClient({ profile, assessments }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<any>(null);

  // Compute band balance
  const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
  assessments.forEach((a) => {
    const band = a.result_json?.band || a.band;
    if (band && bands[band] !== undefined) bands[band]++;
  });

  function openDetail(a: any) {
    setDrawerItem(a);
    setDrawerOpen(true);
  }

  return (
    <div style={{ padding: "48px 52px", maxWidth: "720px" }}>
      <LabelRail
        items={[
          "RESULTS",
          `${assessments.length} ASSESSED`,
          `SAFE: ${bands.Safe} · TARGET: ${bands.Target} · REACH: ${bands.Reach}`,
        ]}
        className="mb-6"
      />

      <h1 className="serif text-[36px] font-normal text-[var(--t)] mb-2">
        Results
      </h1>
      <p className="text-[13px] text-[var(--t3)] mb-8 leading-relaxed">
        Your offer chances for each assessed choice. Tap any card for full detail.
      </p>

      {/* Balance overview */}
      {assessments.length > 0 && (
        <HardwarePanel className="mb-6">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
            Portfolio Balance
          </span>
          <div className="flex gap-4">
            {(["Safe", "Target", "Reach"] as const).map((band) => (
              <div key={band} className="flex-1">
                <Meter
                  label={band}
                  value={assessments.length ? (bands[band] / assessments.length) * 100 : 0}
                  variant={band.toLowerCase() as "safe" | "target" | "reach"}
                />
                <p className="font-mono text-[11px] text-[var(--t2)] text-center mt-1">
                  {bands[band]}
                </p>
              </div>
            ))}
          </div>
        </HardwarePanel>
      )}

      {/* Assessment cards */}
      {assessments.length === 0 && (
        <HardwarePanel>
          <p className="text-[13px] text-[var(--t3)] text-center py-6">
            No assessments yet. Go to My Strategy to add choices and run checks.
          </p>
        </HardwarePanel>
      )}

      <div className="flex flex-col gap-3">
        {assessments.map((a, i) => {
          const result = a.result_json || {};
          const band = result.band || a.band || "?";
          const chance = result.chance_percent ?? a.chance_percent ?? "?";
          const bs = BAND_COLORS[band] || BAND_COLORS.Reach;

          return (
            <button key={a.id || i} onClick={() => openDetail(a)} className="w-full text-left">
              <HardwarePanel compact>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="serif text-[17px] font-normal text-[var(--t)] mb-1 truncate">
                      {a.course_name}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--t3)]">
                      {a.university_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="serif text-[24px] font-normal text-[var(--t)] leading-none">
                      {chance}%
                    </span>
                    <span
                      className="pill"
                      style={{ background: bs.bg, color: bs.color, border: bs.border }}
                    >
                      {band}
                    </span>
                  </div>
                </div>
              </HardwarePanel>
            </button>
          );
        })}
      </div>

      {/* Detail drawer */}
      <DrawerSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="ASSESSMENT DETAIL"
      >
        {drawerItem && (() => {
          const result = drawerItem.result_json || {};
          const band = result.band || drawerItem.band || "?";
          const chance = result.chance_percent ?? drawerItem.chance_percent ?? "?";
          const bs = BAND_COLORS[band] || BAND_COLORS.Reach;
          const counsellor = result.counsellor || {};

          // Breakdown scores
          const fitScore = drawerItem.fit_score ?? result.fit_score ?? null;
          const gradeMatch = drawerItem.grade_match ?? result.grade_match ?? null;
          const subjectMatch = result.subject_match ?? null;
          const psImpact = drawerItem.ps_impact ?? result.ps_impact ?? null;

          // "What would change this" actions
          const changeActions: { label: string; href: string }[] = [];
          if (psImpact !== null && psImpact < 60) {
            changeActions.push({ label: "Improve your personal statement — PS impact is low", href: "/your-ps" });
          }
          if (gradeMatch !== null && gradeMatch < 50) {
            changeActions.push({ label: "Consider a course with lower grade requirements", href: "/my-strategy" });
          }
          if (band === "Reach") {
            changeActions.push({ label: "Explore alternative courses with better fit", href: "/database" });
          }
          if (changeActions.length === 0 && band !== "Safe") {
            changeActions.push({ label: "Run PS analysis to boost your chances", href: "/your-ps" });
          }

          // Determine bottleneck for primary CTA
          const bottleneck = psImpact !== null && psImpact < 50 ? "ps" : "strategy";

          return (
            <div className="flex flex-col gap-5">
              {/* Header */}
              <div>
                <h3 className="serif text-[22px] font-normal text-[var(--t)] mb-1">
                  {drawerItem.course_name}
                </h3>
                <p className="font-mono text-[11px] text-[var(--t3)]">
                  {drawerItem.university_name}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="serif text-[36px] font-normal text-[var(--t)] leading-none">
                  {chance}%
                </span>
                <span
                  className="pill text-[12px]"
                  style={{ background: bs.bg, color: bs.color, border: bs.border }}
                >
                  {band}
                </span>
              </div>

              {result.verdict && (
                <p className="text-[13px] text-[var(--t2)] leading-relaxed">
                  {result.verdict}
                </p>
              )}

              {/* ── BREAKDOWN panel ── */}
              <HardwarePanel compact>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
                  Breakdown
                </span>
                <div className="flex flex-col gap-3">
                  {fitScore !== null && (
                    <Meter label="Fit Score" value={fitScore} variant="accent" />
                  )}
                  {gradeMatch !== null && (
                    <Meter label="Grade Match" value={gradeMatch} variant={gradeMatch >= 70 ? "safe" : gradeMatch >= 40 ? "target" : "reach"} />
                  )}
                  {subjectMatch !== null && (
                    <Meter label="Subject Match" value={subjectMatch} variant={subjectMatch >= 70 ? "safe" : subjectMatch >= 40 ? "target" : "reach"} />
                  )}
                  {psImpact !== null && (
                    <Meter label="PS Impact" value={psImpact} variant={psImpact >= 60 ? "safe" : psImpact >= 30 ? "target" : "reach"} />
                  )}
                  {fitScore === null && gradeMatch === null && subjectMatch === null && psImpact === null && (
                    <p className="text-[12px] text-[var(--t3)]">
                      Run a detailed assessment to see the full breakdown.
                    </p>
                  )}
                </div>
              </HardwarePanel>

              {/* ── WHAT WOULD CHANGE THIS panel ── */}
              {changeActions.length > 0 && (
                <HardwarePanel compact>
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
                    What would change this
                  </span>
                  <div className="flex flex-col gap-2">
                    {changeActions.slice(0, 3).map((action, i) => (
                      <Link key={i} href={action.href} className="no-underline block">
                        <div className="flex items-center gap-3 group">
                          <span className="w-5 h-5 rounded-full border border-[var(--acc-border)] bg-[var(--s3)] flex items-center justify-center shrink-0">
                            <span className="font-mono text-[9px] font-bold text-[var(--acc)]">
                              {i + 1}
                            </span>
                          </span>
                          <span className="text-[12px] text-[var(--t2)] group-hover:text-[var(--acc)] transition-colors">
                            {action.label}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </HardwarePanel>
              )}

              {/* Primary CTA based on bottleneck */}
              <Link href={bottleneck === "ps" ? "/your-ps" : "/my-strategy"} style={{ textDecoration: "none" }}>
                <PrimaryActionKey>
                  {bottleneck === "ps" ? "IMPROVE PS" : "ADJUST STRATEGY"}
                </PrimaryActionKey>
              </Link>

              {/* Strengths / Risks / Next Steps */}
              {counsellor.strengths?.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
                    Strengths
                  </span>
                  <ul className="flex flex-col gap-1">
                    {counsellor.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-[12px] text-[var(--safe-t)]">· {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {counsellor.risks?.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
                    Risks
                  </span>
                  <ul className="flex flex-col gap-1">
                    {counsellor.risks.map((r: string, i: number) => (
                      <li key={i} className="text-[12px] text-[var(--rch-t)]">· {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.checks && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--safe-t)] mb-1 block">
                      Passed ({result.checks.passed?.length || 0})
                    </span>
                    <ul className="flex flex-col gap-0.5">
                      {(result.checks.passed || []).map((c: string, i: number) => (
                        <li key={i} className="text-[11px] text-[var(--t3)]">✓ {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex-1">
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--rch-t)] mb-1 block">
                      Failed ({result.checks.failed?.length || 0})
                    </span>
                    <ul className="flex flex-col gap-0.5">
                      {(result.checks.failed || []).map((c: string, i: number) => (
                        <li key={i} className="text-[11px] text-[var(--t3)]">✕ {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </DrawerSheet>
    </div>
  );
}
