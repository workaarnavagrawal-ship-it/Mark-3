"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import {
  getUniqueCourses,
  listShortlistedCourses,
  addShortlistedCourse,
  removeShortlistedCourse,
  postSuggest,
} from "@/lib/api";
import { AIBlock } from "@/components/ai/AIBlock";
import { CourseDetailModal } from "./CourseDetailModal";
import type { AIStatus, UniqueCourse, HiddenGemRecommendation, ShortlistedCourse } from "@/lib/types";

interface ExploreClientProps {
  interests: string[];
}

type TabFilter = "all" | "shortlisted";

export function ExploreClient({ interests }: ExploreClientProps) {
  const [courses, setCourses] = useState<UniqueCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  // Shortlist state
  const [shortlistedKeys, setShortlistedKeys] = useState<Set<string>>(new Set());
  const [shortlistBusy, setShortlistBusy] = useState<string | null>(null); // course_key being toggled
  const [shortlistErr, setShortlistErr] = useState("");

  // Modal
  const [openCourse, setOpenCourse] = useState<UniqueCourse | null>(null);

  // Tab filter
  const [tab, setTab] = useState<TabFilter>("all");

  // ── Load courses ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const [coursesData, shortlistData] = await Promise.all([
          getUniqueCourses(),
          listShortlistedCourses().catch(() => [] as ShortlistedCourse[]),
        ]);
        if (!cancelled) {
          setCourses(coursesData);
          setShortlistedKeys(new Set(shortlistData.map((s) => s.course_key)));
          // Trigger AI gem loading now that courses are available
          loadGems(coursesData);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load courses.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Shortlist toggle ──────────────────────────────────────────────
  const toggleShortlist = useCallback(
    async (course: UniqueCourse) => {
      if (shortlistBusy) return;
      const key = course.course_key;
      const wasShortlisted = shortlistedKeys.has(key);

      // Optimistic update
      setShortlistBusy(key);
      setShortlistErr("");
      setShortlistedKeys((prev) => {
        const next = new Set(prev);
        if (wasShortlisted) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        if (wasShortlisted) {
          await removeShortlistedCourse(key);
        } else {
          await addShortlistedCourse({
            course_key: key,
            course_name: course.course_name,
            universities_count: course.universities_count,
          });
        }
      } catch (e: any) {
        // Revert optimistic update
        setShortlistedKeys((prev) => {
          const next = new Set(prev);
          if (wasShortlisted) next.add(key);
          else next.delete(key);
          return next;
        });
        setShortlistErr(e?.message || "Failed to update shortlist. Please try again.");
      } finally {
        setShortlistBusy(null);
      }
    },
    [shortlistedKeys, shortlistBusy],
  );

  // ── Hidden gems — AI-powered via /api/py/suggest ─────────────────
  const [hiddenGems,   setHiddenGems]   = useState<HiddenGemRecommendation[]>([]);
  const [gemsStatus,   setGemsStatus]   = useState<AIStatus>("idle");
  const [gemsError,    setGemsError]    = useState<string | null>(null);

  const loadGems = useCallback(async (allCourses: UniqueCourse[]) => {
    if (!interests.length) return;
    setGemsStatus("loading");
    setGemsError(null);
    try {
      const res = await postSuggest({
        interests,
        curriculum: "IB",   // curriculum not critical for name-matching; explored cross-curriculum
        top_n: 5,
      });
      // Map AI suggestions back to full UniqueCourse objects by name (for shortlist / modal)
      const nameIndex = new Map(allCourses.map(c => [c.course_name.toLowerCase(), c]));
      const gems: HiddenGemRecommendation[] = (res.suggestions ?? []).flatMap(s => {
        const full = nameIndex.get(s.course_name.toLowerCase());
        if (!full) return [];
        return [{ course: full, reason: s.tradeoff || s.reason }];
      });
      setHiddenGems(gems);
      setGemsStatus("ok");
    } catch (e: unknown) {
      setGemsError((e as Error)?.message ?? "Could not load suggestions.");
      setGemsStatus("error");
    }
  }, [interests]);

  // ── Filtered course list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = courses;

    // Tab filter
    if (tab === "shortlisted") {
      list = list.filter((c) => shortlistedKeys.has(c.course_key));
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = c.course_name.toLowerCase();
        const fac = (c.faculties || []).join(" ").toLowerCase();
        return name.includes(q) || fac.includes(q);
      });
    }

    return list;
  }, [courses, search, tab, shortlistedKeys]);

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: "40px" }}>
        <p className="label" style={{ marginBottom: "10px" }}>Discovery</p>
        <h1
          className="serif"
          style={{
            fontSize: "44px",
            fontWeight: 400,
            color: "var(--t)",
            marginBottom: "10px",
            letterSpacing: "-0.02em",
          }}
        >
          Explore Courses
        </h1>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.65 }}>
          Every course in the Offr dataset, deduplicated across universities. Use this to discover options, then check your chances.
        </p>
      </div>

      {/* ── Hidden Gems — AI-powered ─────────────────────────────────── */}
      {!loading && !err && interests.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ marginBottom: "14px" }}>
            <p className="label" style={{ marginBottom: "4px" }}>Personalised for you</p>
            <h2 className="serif" style={{ fontSize: "20px", fontWeight: 400, color: "var(--t)" }}>
              Hidden Gems
            </h2>
          </div>
          <AIBlock
            status={gemsStatus}
            error={gemsError ?? undefined}
            onRetry={() => loadGems(courses)}
            skeletonLines={3}
          >
            {hiddenGems.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {hiddenGems.map((gem) => (
                  <HiddenGemRow
                    key={gem.course.course_key}
                    gem={gem}
                    isShortlisted={shortlistedKeys.has(gem.course.course_key)}
                    shortlistBusy={shortlistBusy === gem.course.course_key}
                    onOpen={setOpenCourse}
                    onToggleShortlist={toggleShortlist}
                  />
                ))}
              </div>
            ) : gemsStatus === "ok" ? (
              <div style={{ padding: "14px 18px", background: "var(--s2)", border: "1px solid var(--b)", borderRadius: "var(--r)", fontSize: "13px", color: "var(--t3)" }}>
                No hidden gems found for your current interests. Try updating them in your{" "}
                <Link href="/dashboard/profile" style={{ color: "var(--t)", textDecoration: "none", borderBottom: "1px solid var(--b-strong)" }}>profile</Link>
                , or explore all courses below.
              </div>
            ) : null}
          </AIBlock>
        </div>
      )}

      {/* No interests → gem nudge */}
      {!loading && !err && interests.length === 0 && (
        <div
          style={{
            marginBottom: "28px",
            padding: "14px 18px",
            background: "var(--s2)",
            border: "1px solid var(--b)",
            borderRadius: "var(--r)",
            fontSize: "13px",
            color: "var(--t3)",
          }}
        >
          Add interests to your{" "}
          <Link
            href="/dashboard/profile"
            style={{
              color: "var(--t)",
              textDecoration: "none",
              borderBottom: "1px solid var(--b-strong)",
            }}
          >
            profile
          </Link>{" "}
          to see personalised Hidden Gems here.
        </div>
      )}

      {/* ── Tab filter ──────────────────────────────────────────────── */}
      {!loading && !err && (
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
            borderBottom: "1px solid var(--b)",
            paddingBottom: "0",
          }}
        >
          {(["all", "shortlisted"] as TabFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--t)" : "2px solid transparent",
                padding: "8px 14px",
                fontSize: "13px",
                color: tab === t ? "var(--t)" : "var(--t3)",
                cursor: "pointer",
                marginBottom: "-1px",
                transition: "color 150ms",
              }}
            >
              {t === "all"
                ? "All courses"
                : `Shortlisted (${shortlistedKeys.size})`}
            </button>
          ))}
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "20px" }}>
        <input
          className="inp"
          placeholder="Search courses or subject areas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "8px" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "var(--t3)",
          }}
        >
          <span>
            {loading
              ? "Loading courses…"
              : `${filtered.length} of ${courses.length} courses`}
          </span>
        </div>
      </div>

      {/* Shortlist error */}
      {shortlistErr && (
        <div
          style={{
            marginBottom: "12px",
            padding: "10px 14px",
            background: "var(--rch-bg)",
            border: "1px solid var(--rch-b)",
            borderRadius: "var(--r)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{shortlistErr}</p>
          <button
            onClick={() => setShortlistErr("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--rch-t)",
              fontSize: "16px",
              lineHeight: 1,
              padding: "0 2px",
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Load error */}
      {err && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            background: "var(--rch-bg)",
            border: "1px solid var(--rch-b)",
            borderRadius: "10px",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{err}</p>
        </div>
      )}

      {/* ── Course list ─────────────────────────────────────────────── */}
      {loading ? (
        <div
          style={{
            padding: "48px 32px",
            textAlign: "center",
            color: "var(--t3)",
            fontSize: "14px",
          }}
        >
          Fetching courses…
        </div>
      ) : tab === "shortlisted" && shortlistedKeys.size === 0 ? (
        <div
          style={{
            padding: "48px 32px",
            textAlign: "center",
            color: "var(--t3)",
            fontSize: "14px",
          }}
        >
          <p style={{ marginBottom: "8px" }}>No courses shortlisted yet.</p>
          <button
            onClick={() => setTab("all")}
            style={{
              background: "none",
              border: "1px solid var(--b)",
              borderRadius: "var(--r)",
              padding: "6px 16px",
              fontSize: "13px",
              color: "var(--t3)",
              cursor: "pointer",
            }}
          >
            Browse all courses →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "48px 32px",
            textAlign: "center",
            color: "var(--t3)",
            fontSize: "14px",
          }}
        >
          No courses match your search.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((c) => (
            <CourseRow
              key={c.course_key}
              course={c}
              isShortlisted={shortlistedKeys.has(c.course_key)}
              shortlistBusy={shortlistBusy === c.course_key}
              onOpen={setOpenCourse}
              onToggleShortlist={toggleShortlist}
            />
          ))}
        </div>
      )}

      {/* ── Course Detail Modal ──────────────────────────────────────── */}
      {openCourse && (
        <CourseDetailModal
          course={openCourse}
          onClose={() => setOpenCourse(null)}
          isShortlisted={shortlistedKeys.has(openCourse.course_key)}
          shortlistBusy={shortlistBusy === openCourse.course_key}
          onToggleShortlist={toggleShortlist}
        />
      )}
    </div>
  );
}

// ── Hidden Gem row ─────────────────────────────────────────────────────────

interface RowProps {
  isShortlisted: boolean;
  shortlistBusy: boolean;
  onOpen: (course: UniqueCourse) => void;
  onToggleShortlist: (course: UniqueCourse) => void;
}

function HiddenGemRow({
  gem,
  isShortlisted,
  shortlistBusy,
  onOpen,
  onToggleShortlist,
}: { gem: HiddenGemRecommendation } & RowProps) {
  const c = gem.course;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(c)}
      style={{
        padding: "18px 22px",
        background: "var(--s1)",
        border: `1px solid ${isShortlisted ? "var(--b-strong)" : "var(--b)"}`,
        borderRadius: "var(--r)",
        transition: "border-color 150ms",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          isShortlisted ? "var(--b-strong)" : "var(--b)")
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
              flexWrap: "wrap",
            }}
          >
            <h3
              className="serif"
              style={{ fontSize: "16px", fontWeight: 400, color: "var(--t)" }}
            >
              {c.course_name}
            </h3>
            <span
              className="pill"
              style={{
                fontSize: "11px",
                padding: "2px 10px",
                borderRadius: "9999px",
                border: "1px solid var(--b)",
                color: "var(--t3)",
                background: "var(--s2)",
              }}
            >
              {c.universities_count}{" "}
              {c.universities_count === 1 ? "university" : "universities"}
            </span>
            {isShortlisted && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 9px",
                  borderRadius: "9999px",
                  border: "1px solid var(--safe-b)",
                  color: "var(--safe-t)",
                  background: "var(--safe-bg)",
                }}
              >
                ✓ Shortlisted
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "var(--t3)", lineHeight: 1.5 }}>
            {gem.reason}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleShortlist(c);
          }}
          disabled={shortlistBusy}
          style={{
            flexShrink: 0,
            background: "none",
            border: "1px solid var(--b)",
            borderRadius: "9999px",
            padding: "4px 12px",
            fontSize: "12px",
            color: "var(--t3)",
            cursor: shortlistBusy ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {shortlistBusy ? "…" : isShortlisted ? "✓" : "+"}
        </button>
      </div>
    </div>
  );
}

// ── Standard course row ────────────────────────────────────────────────────

function CourseRow({
  course: c,
  isShortlisted,
  shortlistBusy,
  onOpen,
  onToggleShortlist,
}: { course: UniqueCourse } & RowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(c)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(c)}
      style={{
        padding: "20px 24px",
        background: "var(--s1)",
        border: `1px solid ${isShortlisted ? "var(--b-strong)" : "var(--b)"}`,
        borderRadius: "var(--r)",
        transition: "border-color 150ms",
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--b-strong)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          isShortlisted ? "var(--b-strong)" : "var(--b)")
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "4px",
              flexWrap: "wrap",
            }}
          >
            <h3
              className="serif"
              style={{
                fontSize: "18px",
                fontWeight: 400,
                color: "var(--t)",
              }}
            >
              {c.course_name}
            </h3>
            <span
              className="pill"
              style={{
                fontSize: "11px",
                padding: "2px 10px",
                borderRadius: "9999px",
                border: "1px solid var(--b)",
                color: "var(--t3)",
                background: "var(--s2)",
              }}
            >
              {c.universities_count}{" "}
              {c.universities_count === 1 ? "university" : "universities"}
            </span>
            {isShortlisted && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 9px",
                  borderRadius: "9999px",
                  border: "1px solid var(--safe-b)",
                  color: "var(--safe-t)",
                  background: "var(--safe-bg)",
                }}
              >
                ✓ Shortlisted
              </span>
            )}
          </div>
          {c.faculties.length > 0 && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--t3)",
                marginBottom: "6px",
              }}
            >
              {c.faculties.join(" · ")}
            </p>
          )}
          {c.min_entry_hint && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--t3)",
                marginBottom: "4px",
              }}
            >
              Typical entry signal: {c.min_entry_hint}
            </p>
          )}
        </div>

        {/* Shortlist toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleShortlist(c);
          }}
          disabled={shortlistBusy}
          style={{
            flexShrink: 0,
            background: "none",
            border: "1px solid var(--b)",
            borderRadius: "9999px",
            padding: "4px 12px",
            fontSize: "12px",
            color: "var(--t3)",
            cursor: shortlistBusy ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {shortlistBusy ? "…" : isShortlisted ? "✓ Saved" : "+ Shortlist"}
        </button>
      </div>

      {/* University pills */}
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {c.universities.slice(0, 4).map((u) => (
          <span
            key={u.university_id}
            style={{
              fontSize: "11px",
              color: "var(--t3)",
              border: "1px solid var(--b)",
              borderRadius: "9999px",
              padding: "2px 9px",
            }}
          >
            {u.university_name}
          </span>
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "var(--t3)",
          }}
        >
          Click to view details →
        </span>
      </div>
    </div>
  );
}
