"use client";

import { useState } from "react";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import { PrimaryActionKey } from "@/components/monologue/Keys";
import ChipSet from "@/components/monologue/ChipSet";
import Meter from "@/components/monologue/Meter";
import DrawerSheet from "@/components/monologue/DrawerSheet";
import { postRecommend } from "@/lib/api";
import type { RecommendResult, ExplorerPrefs, ProfileV2 } from "@/lib/types";
import type { RecommendRequest } from "@/lib/api";

const OPTIMIZE_OPTIONS = ["PRESTIGE", "BUDGET", "BALANCE"];
const VIBE_OPTIONS = ["CHILL", "INTELLECTUAL", "CITY", "CAMPUS", "CAREER"];
const LOCATION_OPTIONS = ["LONDON", "BIG CITY", "FLEXIBLE"];

interface Props {
  profile: ProfileV2;
  initialRuns?: number;
}

export function ExplorerHub({ profile, initialRuns = 0 }: Props) {
  const [optimizeFor, setOptimizeFor] = useState<string[]>(["BALANCE"]);
  const [vibes, setVibes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>(["FLEXIBLE"]);
  const [interests, setInterests] = useState<string[]>(profile.interest_tags || []);
  const [freeText, setFreeText] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [runCount, setRunCount] = useState(initialRuns);
  const [error, setError] = useState("");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerItem, setDrawerItem] = useState<RecommendResult | null>(null);

  async function generate() {
    setError("");
    setLoading(true);
    try {
      const prefs: ExplorerPrefs = {
        optimize_for: (optimizeFor[0] || "BALANCE") as ExplorerPrefs["optimize_for"],
        vibe: vibes,
        location: locations,
        interests,
        free_text: freeText || undefined,
      };
      const body: RecommendRequest = {
        curriculum: profile.curriculum,
        home_or_intl: profile.home_or_intl,
        predicted_summary: profile.predicted_summary,
        ib_total_points: profile.ib_total_points,
        preferences: prefs,
      };
      const res = await postRecommend(body);
      if (res.status === "error") {
        setError(res.message || "Failed to generate recommendations.");
        return;
      }
      setResults(res.recommendations || []);
      setRunCount((c) => c + 1);
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  function openDrawer(item: RecommendResult) {
    setDrawerItem(item);
    setDrawerOpen(true);
  }

  return (
    <>
      {/* ── CLARITY SESSION panel ── */}
      <HardwarePanel
        spotlight
        header={
          <LabelRail
            items={[
              `MODE: EXPLORER`,
              `RUNS: ${runCount}`,
              results.length > 0 ? "SAVED" : "UNSAVED",
            ]}
          />
        }
      >
        <h2 className="serif text-[28px] font-normal text-[var(--t)] mb-2">
          Clarity Session
        </h2>
        <p className="text-[13px] text-[var(--t3)] mb-6 leading-relaxed">
          Tell us what matters. We&apos;ll surface courses from the database that fit.
        </p>

        {/* Optimize for */}
        <div className="mb-5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
            Optimize for
          </span>
          <ChipSet
            options={OPTIMIZE_OPTIONS}
            selected={optimizeFor}
            onToggle={(v) => setOptimizeFor([v])}
            multi={false}
          />
        </div>

        {/* Uni life vibe */}
        <div className="mb-5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
            Uni life vibe
          </span>
          <ChipSet
            options={VIBE_OPTIONS}
            selected={vibes}
            onToggle={(v) =>
              setVibes((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
              )
            }
          />
        </div>

        {/* Location */}
        <div className="mb-5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
            Location
          </span>
          <ChipSet
            options={LOCATION_OPTIONS}
            selected={locations}
            onToggle={(v) => setLocations([v])}
            multi={false}
          />
        </div>

        {/* Interests */}
        <div className="mb-5">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
            Interests
          </span>
          <div className="flex flex-wrap gap-2">
            {interests.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-[0.1em] border border-[var(--acc-border)] bg-[var(--acc-dim)] text-[var(--acc)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Free text */}
        <div className="mb-6">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-2 block">
            Tell me more (optional)
          </span>
          <textarea
            className="inp w-full resize-none"
            rows={3}
            placeholder="e.g. I love the intersection of tech and policy, ideally in a city with a strong startup scene..."
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            maxLength={500}
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--rch-bg)] border border-[var(--rch-b)]">
            <p className="font-mono text-[11px] text-[var(--rch-t)]">{error}</p>
          </div>
        )}

        <PrimaryActionKey onClick={generate} loading={loading}>
          GENERATE SHORTLIST
        </PrimaryActionKey>
      </HardwarePanel>

      {/* ── Results feed ── */}
      {results.length > 0 && (
        <div className="mt-6">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-4 block">
            RUN {String(runCount).padStart(2, "0")} — {results.length} recommendations
          </span>
          <div className="flex flex-col gap-3">
            {results.map((rec) => (
              <HardwarePanel key={rec.course_id} compact>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="serif text-[17px] font-normal text-[var(--t)] mb-1">
                      {rec.course_name}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--t3)] mb-3">
                      {rec.uni_name} · {rec.degree_type} · {rec.faculty}
                    </p>
                    <Meter label="FIT" value={rec.fit_score} variant="accent" />
                    <ul className="mt-3 flex flex-col gap-1">
                      {rec.reasons.slice(0, 3).map((r, i) => (
                        <li
                          key={i}
                          className="text-[12px] text-[var(--t2)] leading-relaxed"
                        >
                          · {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openDrawer(rec)}
                      className="px-4 py-2 rounded-lg border border-[var(--b-strong)] bg-transparent font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--t3)] hover:border-[var(--acc-border)] hover:text-[var(--acc)] transition-all"
                    >
                      View
                    </button>
                    <button className="px-4 py-2 rounded-lg border border-[var(--acc-border)] bg-[var(--acc-dim)] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--acc)] hover:bg-[var(--acc)] hover:text-[var(--t-inv)] transition-all">
                      Shortlist
                    </button>
                  </div>
                </div>
              </HardwarePanel>
            ))}
          </div>
        </div>
      )}

      {/* ── Offering detail drawer ── */}
      <DrawerSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="OFFERING DETAIL"
      >
        {drawerItem && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="serif text-[22px] font-normal text-[var(--t)] mb-1">
                {drawerItem.course_name}
              </h3>
              <p className="font-mono text-[11px] text-[var(--t3)]">
                {drawerItem.uni_name} · {drawerItem.degree_type} · {drawerItem.faculty}
              </p>
            </div>

            <Meter label="FIT SCORE" value={drawerItem.fit_score} variant="accent" />

            {drawerItem.typical_offer && (
              <div>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-1 block">
                  Typical Offer
                </span>
                <p className="text-[13px] text-[var(--t)]">{drawerItem.typical_offer}</p>
              </div>
            )}

            {drawerItem.estimated_annual_cost_international && (
              <div>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-1 block">
                  Estimated Annual Cost (Intl)
                </span>
                <p className="text-[13px] text-[var(--t)]">
                  £{drawerItem.estimated_annual_cost_international.toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-1 block">
                Why this fits
              </span>
              <ul className="flex flex-col gap-1">
                {drawerItem.reasons.map((r, i) => (
                  <li key={i} className="text-[13px] text-[var(--t2)] leading-relaxed">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 mt-2">
              <button className="flex-1 py-3 rounded-xl border border-[var(--acc-border)] bg-[var(--acc-dim)] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--acc)] hover:bg-[var(--acc)] hover:text-[var(--t-inv)] transition-all">
                Shortlist
              </button>
              <button className="flex-1 py-3 rounded-xl border border-[var(--b-strong)] bg-transparent font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--t3)] hover:border-[var(--acc-border)] hover:text-[var(--acc)] transition-all">
                Add to Strategy
              </button>
            </div>
          </div>
        )}
      </DrawerSheet>
    </>
  );
}
