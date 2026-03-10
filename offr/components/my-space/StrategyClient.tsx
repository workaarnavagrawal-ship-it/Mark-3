"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import { PrimaryActionKey, SecondaryKey } from "@/components/monologue/Keys";
import Meter from "@/components/monologue/Meter";
import {
  getUniversities,
  getCourses,
  postOfferAssess,
} from "@/lib/api";
import { isEarlyDeadline, isMedDentVet, checkMedDentVetConstraint, UCAS_MAX_CHOICES } from "@/lib/ucas";
import type { UniversityItem, CourseListItem, OfferAssessRequest, OfferAssessResponse, ProfileV2 } from "@/lib/types";

interface SlotData {
  universityId: string;
  universityName: string;
  courseId: string;
  courseName: string;
  degreeType: string;
  typicalOffer: string;
  status: "EMPTY" | "SELECTED" | "CHECKED";
  result?: OfferAssessResponse;
}

const EMPTY_SLOT: SlotData = {
  universityId: "",
  universityName: "",
  courseId: "",
  courseName: "",
  degreeType: "",
  typicalOffer: "",
  status: "EMPTY",
};

const BAND_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Safe:   { bg: "var(--safe-bg)", color: "var(--safe-t)", border: "1px solid var(--safe-b)" },
  Target: { bg: "var(--tgt-bg)", color: "var(--tgt-t)", border: "1px solid var(--tgt-b)" },
  Reach:  { bg: "var(--rch-bg)", color: "var(--rch-t)", border: "1px solid var(--rch-b)" },
};

interface Props {
  profile: ProfileV2;
  existingAssessments?: any[];
}

export function StrategyClient({ profile, existingAssessments = [] }: Props) {
  const [slots, setSlots] = useState<SlotData[]>(() => {
    // Prefill from existing assessments
    const filled: SlotData[] = existingAssessments.slice(0, 5).map((a: any) => ({
      universityId: a.university_id || a.course_id?.split("_")[0] || "",
      universityName: a.university_name || "",
      courseId: a.course_id || "",
      courseName: a.course_name || "",
      degreeType: "",
      typicalOffer: "",
      status: "CHECKED" as const,
      result: a.result_json || undefined,
    }));
    while (filled.length < UCAS_MAX_CHOICES) filled.push({ ...EMPTY_SLOT });
    return filled;
  });

  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [coursesByUni, setCoursesByUni] = useState<Record<string, CourseListItem[]>>({});
  const [loadingSlot, setLoadingSlot] = useState<number | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // Load universities on mount
  useEffect(() => {
    getUniversities().then(setUniversities).catch(() => {});
  }, []);

  // Load courses when uni selected
  const loadCourses = useCallback(async (uniId: string) => {
    if (coursesByUni[uniId]) return;
    try {
      const courses = await getCourses(uniId);
      setCoursesByUni((prev) => ({ ...prev, [uniId]: courses }));
    } catch {}
  }, [coursesByUni]);

  function updateSlot(idx: number, partial: Partial<SlotData>) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...partial } : s)));
  }

  function selectUni(idx: number, uniId: string) {
    const uni = universities.find((u) => u.university_id === uniId);
    updateSlot(idx, {
      universityId: uniId,
      universityName: uni?.university_name || uniId,
      courseId: "",
      courseName: "",
      status: "EMPTY",
      result: undefined,
    });
    loadCourses(uniId);
  }

  function selectCourse(idx: number, courseId: string) {
    const courses = coursesByUni[slots[idx].universityId] || [];
    const course = courses.find((c) => c.course_id === courseId);
    updateSlot(idx, {
      courseId,
      courseName: course?.course_name || "",
      degreeType: course?.degree_type || "",
      typicalOffer: course?.min_requirements || "",
      status: "SELECTED",
      result: undefined,
    });
  }

  function removeSlot(idx: number) {
    updateSlot(idx, { ...EMPTY_SLOT });
  }

  async function runCheck(idx: number) {
    const slot = slots[idx];
    if (!slot.courseId) return;
    setLoadingSlot(idx);
    try {
      const req: OfferAssessRequest = {
        course_id: slot.courseId,
        home_or_intl: profile.home_or_intl?.toLowerCase() as "home" | "intl",
        curriculum: profile.curriculum === "ALEVEL" ? "A_LEVELS" : "IB",
        university: slot.universityName,
      };
      if (profile.curriculum === "IB" && profile.ib_total_points) {
        req.ib = {
          core_points: profile.ib_bonus_points ?? 0,
          hl: [],
          sl: [],
          total_points: profile.ib_total_points,
        };
      }
      const res = await postOfferAssess(req);
      updateSlot(idx, { status: "CHECKED", result: res });
    } catch {
      // Keep as selected, don't crash
    } finally {
      setLoadingSlot(null);
    }
  }

  async function batchCheck() {
    setBatchLoading(true);
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].courseId && slots[i].status !== "CHECKED") {
        await runCheck(i);
      }
    }
    setBatchLoading(false);
  }

  // Compute balance
  const bands: Record<string, number> = { Safe: 0, Target: 0, Reach: 0 };
  slots.forEach((s) => {
    if (s.result?.band) bands[s.result.band]++;
  });
  const checkedCount = slots.filter((s) => s.status === "CHECKED").length;
  const filledCount = slots.filter((s) => s.courseId).length;

  // Deadline window
  const hasEarly = slots.some((s) => s.courseId && isEarlyDeadline(s.courseId, s.courseName));

  // Med/dent/vet constraint
  const mdvWarning = checkMedDentVetConstraint(
    slots.filter((s) => s.courseName).map((s) => s.courseName)
  );

  return (
    <div style={{ padding: "48px 52px", maxWidth: "720px" }}>
      <LabelRail
        items={[
          "MY STRATEGY",
          `FILLED: ${filledCount}/${UCAS_MAX_CHOICES}`,
          `CHECKED: ${checkedCount}/${UCAS_MAX_CHOICES}`,
        ]}
        className="mb-6"
      />

      <h1 className="serif text-[36px] font-normal text-[var(--t)] mb-2">
        My Strategy
      </h1>
      <p className="text-[13px] text-[var(--t3)] mb-8 leading-relaxed">
        Build your 5 UCAS choices. Pick a university and course for each slot,
        then run checks to see your offer chances.
      </p>

      {/* Warnings */}
      {hasEarly && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--tgt-bg)] border border-[var(--tgt-b)]">
          <p className="font-mono text-[11px] text-[var(--tgt-t)]">
            EARLY DEADLINE WINDOW — One or more choices require an earlier submission (Oxbridge / Medicine / Dentistry / Vet).
          </p>
        </div>
      )}
      {mdvWarning && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[var(--rch-bg)] border border-[var(--rch-b)]">
          <p className="font-mono text-[11px] text-[var(--rch-t)]">{mdvWarning}</p>
        </div>
      )}

      {/* 5 Slot panels */}
      <div className="flex flex-col gap-4 mb-8">
        {slots.map((slot, idx) => (
          <HardwarePanel
            key={idx}
            compact
            header={
              <LabelRail
                items={[
                  `SLOT ${idx + 1}`,
                  slot.status === "CHECKED"
                    ? `${slot.result?.band || "?"} · ${slot.result?.chance_percent ?? "?"}%`
                    : slot.status === "SELECTED"
                    ? "NOT CHECKED"
                    : "EMPTY",
                ]}
              />
            }
          >
            <div className="flex flex-col gap-3">
              {/* University picker */}
              <div>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-1 block">
                  University
                </span>
                <select
                  className="inp w-full"
                  value={slot.universityId}
                  onChange={(e) => selectUni(idx, e.target.value)}
                >
                  <option value="">Select university...</option>
                  {universities.map((u) => (
                    <option key={u.university_id} value={u.university_id}>
                      {u.university_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course picker */}
              {slot.universityId && (
                <div>
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-1 block">
                    Course
                  </span>
                  <select
                    className="inp w-full"
                    value={slot.courseId}
                    onChange={(e) => selectCourse(idx, e.target.value)}
                  >
                    <option value="">Select course...</option>
                    {(coursesByUni[slot.universityId] || []).map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.course_name} ({c.degree_type || "—"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selected course info */}
              {slot.courseId && (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--t)] font-medium truncate">
                      {slot.courseName}
                    </p>
                    {slot.typicalOffer && (
                      <p className="font-mono text-[10px] text-[var(--t3)]">
                        Typical: {slot.typicalOffer}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    {slot.status !== "CHECKED" && (
                      <SecondaryKey
                        onClick={() => runCheck(idx)}
                        disabled={loadingSlot === idx}
                      >
                        {loadingSlot === idx ? "..." : "RUN CHECK"}
                      </SecondaryKey>
                    )}
                    <button
                      onClick={() => removeSlot(idx)}
                      className="text-[var(--t3)] hover:text-[var(--rch-t)] text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Result display */}
              {slot.result && (
                <div className="mt-2 pt-3 border-t border-[var(--b)]">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="serif text-[28px] font-normal text-[var(--t)] leading-none">
                      {slot.result.chance_percent}%
                    </span>
                    {(() => {
                      const bs = BAND_COLORS[slot.result!.band] || BAND_COLORS.Reach;
                      return (
                        <span
                          className="pill"
                          style={{ background: bs.bg, color: bs.color, border: bs.border }}
                        >
                          {slot.result!.band}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-[12px] text-[var(--t3)] leading-relaxed">
                    {slot.result.verdict}
                  </p>
                </div>
              )}
            </div>
          </HardwarePanel>
        ))}
      </div>

      {/* Balance panel */}
      {checkedCount > 0 && (
        <HardwarePanel className="mb-6">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
            Balance
          </span>
          <div className="flex gap-4">
            {(["Safe", "Target", "Reach"] as const).map((band) => {
              const bs = BAND_COLORS[band];
              return (
                <div key={band} className="flex-1">
                  <Meter
                    label={band}
                    value={bands[band] ? (bands[band] / checkedCount) * 100 : 0}
                    variant={band.toLowerCase() as "safe" | "target" | "reach"}
                  />
                  <p className="font-mono text-[11px] text-[var(--t2)] text-center mt-1">
                    {bands[band]}
                  </p>
                </div>
              );
            })}
          </div>
        </HardwarePanel>
      )}

      {/* Batch check CTA */}
      <PrimaryActionKey
        onClick={batchCheck}
        loading={batchLoading}
        disabled={filledCount === 0}
      >
        RUN CHECKS FOR ALL {UCAS_MAX_CHOICES}
      </PrimaryActionKey>

      {/* Import from shortlist */}
      <div className="mt-6">
        <Link
          href="/my-space/database"
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--t3)] no-underline hover:text-[var(--acc)] transition-colors"
        >
          Browse database to add courses →
        </Link>
      </div>
    </div>
  );
}
