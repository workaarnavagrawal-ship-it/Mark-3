"use client";

import { useCallback, useEffect, useState } from "react";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import DrawerSheet from "@/components/monologue/DrawerSheet";
import { SecondaryKey } from "@/components/monologue/Keys";
import { getCourseGroups, getCourseGroupDetail } from "@/lib/api";
import type { CourseGroup, CourseGroupDetail, Offering } from "@/lib/types";

export function DatabaseClient() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<CourseGroupDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchGroups = useCallback(async (q?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getCourseGroups(q || undefined);
      setGroups(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  function handleSearch() {
    fetchGroups(query);
  }

  async function openDetail(key: string) {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const detail = await getCourseGroupDetail(key);
      setDrawerData(detail);
    } catch {
      setDrawerData(null);
    } finally {
      setDrawerLoading(false);
    }
  }

  return (
    <div style={{ padding: "48px 52px", maxWidth: "720px" }}>
      <LabelRail items={["DATABASE", `${groups.length} COURSES`]} className="mb-6" />

      <h1 className="serif text-[36px] font-normal text-[var(--t)] mb-2">
        Database
      </h1>
      <p className="text-[13px] text-[var(--t3)] mb-8 leading-relaxed">
        Every course once — browse the full catalog, compare offerings across universities,
        and add to your shortlist or strategy.
      </p>

      {/* Search panel */}
      <HardwarePanel className="mb-6">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
          Search courses
        </span>
        <div className="flex gap-3">
          <input
            className="inp flex-1"
            placeholder="e.g. Economics, Computer Science, Medicine..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <SecondaryKey onClick={handleSearch}>Search</SecondaryKey>
        </div>
      </HardwarePanel>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--rch-bg)] border border-[var(--rch-b)]">
          <p className="font-mono text-[11px] text-[var(--rch-t)]">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="w-5 h-5 border-2 border-[var(--acc)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results list */}
      {!loading && groups.length === 0 && (
        <p className="text-[13px] text-[var(--t3)] text-center py-8">
          No courses found. Try a different search.
        </p>
      )}

      {!loading && groups.length > 0 && (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <button
              key={g.course_group_key}
              onClick={() => openDetail(g.course_group_key)}
              className="w-full text-left"
            >
              <HardwarePanel compact>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="serif text-[17px] font-normal text-[var(--t)] mb-1 truncate">
                      {g.course_group_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--acc)]">
                        {g.offerings_count} {g.offerings_count === 1 ? "offering" : "offerings"}
                      </span>
                      {g.offerings_preview.slice(0, 3).map((uni) => (
                        <span
                          key={uni}
                          className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)]"
                        >
                          {uni}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--t3)] shrink-0">
                    View →
                  </span>
                </div>
              </HardwarePanel>
            </button>
          ))}
        </div>
      )}

      {/* Course group detail drawer */}
      <DrawerSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="COURSE GROUP DETAIL"
      >
        {drawerLoading && (
          <div className="flex items-center justify-center py-12">
            <span className="w-5 h-5 border-2 border-[var(--acc)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {drawerData && !drawerLoading && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="serif text-[22px] font-normal text-[var(--t)] mb-1">
                {drawerData.course_group_name}
              </h3>
              {drawerData.representative_faculty && (
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--t3)]">
                  {drawerData.representative_faculty}
                </p>
              )}
              <p className="font-mono text-[11px] text-[var(--acc)] mt-2">
                {drawerData.offerings_count} {drawerData.offerings_count === 1 ? "offering" : "offerings"} across universities
              </p>
            </div>

            {/* Offerings list */}
            <div className="flex flex-col gap-3">
              {(drawerData.offerings || []).map((o: Offering) => (
                <div
                  key={o.course_id}
                  className="p-4 rounded-xl border border-[var(--b)] bg-[var(--bg)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[var(--t)] font-medium mb-1">
                        {o.uni_name}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--t3)]">
                        {o.course_name} · {o.degree_type}
                      </p>
                    </div>
                  </div>

                  {o.typical_offer && (
                    <div className="mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--t3)]">
                        Typical offer:{" "}
                      </span>
                      <span className="text-[12px] text-[var(--t2)]">{o.typical_offer}</span>
                    </div>
                  )}

                  {o.estimated_annual_cost_international && (
                    <div className="mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--t3)]">
                        Intl cost:{" "}
                      </span>
                      <span className="text-[12px] text-[var(--t2)]">
                        £{o.estimated_annual_cost_international.toLocaleString()}/yr
                      </span>
                    </div>
                  )}

                  {o.required_subjects && (
                    <div className="mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--t3)]">
                        Required subjects:{" "}
                      </span>
                      <span className="text-[12px] text-[var(--t2)]">{o.required_subjects}</span>
                    </div>
                  )}

                  {o.ps_expected_signals && (
                    <div className="mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--t3)]">
                        PS signals:{" "}
                      </span>
                      <span className="text-[12px] text-[var(--t2)]">{o.ps_expected_signals}</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 rounded-lg border border-[var(--acc-border)] bg-[var(--acc-dim)] font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--acc)] hover:bg-[var(--acc)] hover:text-[var(--t-inv)] transition-all">
                      Shortlist
                    </button>
                    <button className="px-3 py-1.5 rounded-lg border border-[var(--b-strong)] bg-transparent font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)] hover:border-[var(--acc-border)] hover:text-[var(--acc)] transition-all">
                      Add to Strategy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DrawerSheet>
    </div>
  );
}
