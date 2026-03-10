"use client";

import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import Meter from "@/components/monologue/Meter";
import DrawerSheet from "@/components/monologue/DrawerSheet";
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

          return (
            <div className="flex flex-col gap-5">
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

              {counsellor.what_to_do_next?.length > 0 && (
                <div>
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
                    Next steps
                  </span>
                  <ul className="flex flex-col gap-1">
                    {counsellor.what_to_do_next.map((n: string, i: number) => (
                      <li key={i} className="text-[12px] text-[var(--t2)]">· {n}</li>
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
