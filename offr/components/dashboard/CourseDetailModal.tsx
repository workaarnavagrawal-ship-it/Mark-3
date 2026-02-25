"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getUniqueCourseDetail } from "@/lib/api";
import type { UniqueCourse, UniqueCourseDetail } from "@/lib/types";

interface CourseDetailModalProps {
  course: UniqueCourse;
  onClose: () => void;
  /** Whether this course is currently shortlisted */
  isShortlisted: boolean;
  /** Loading state for shortlist toggle */
  shortlistBusy: boolean;
  onToggleShortlist: (course: UniqueCourse) => void;
}

export function CourseDetailModal({
  course,
  onClose,
  isShortlisted,
  shortlistBusy,
  onToggleShortlist,
}: CourseDetailModalProps) {
  const [detail, setDetail] = useState<UniqueCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch detail on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await getUniqueCourseDetail(course.course_key);
        if (!cancelled) setDetail(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load course details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [course.course_key]);

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={course.course_name}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        background: "rgba(0,0,0,0.35)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Sheet / drawer panel */}
      <div
        style={{
          width: "min(520px, 100vw)",
          height: "100vh",
          background: "var(--bg)",
          borderLeft: "1px solid var(--b)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 32px 20px",
            borderBottom: "1px solid var(--b)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <h2
              className="serif"
              style={{
                fontSize: "22px",
                fontWeight: 400,
                color: "var(--t)",
                lineHeight: 1.25,
                flex: 1,
              }}
            >
              {course.course_name}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                flexShrink: 0,
                background: "none",
                border: "1px solid var(--b)",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                cursor: "pointer",
                color: "var(--t3)",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
              {course.universities_count}{" "}
              {course.universities_count === 1 ? "university" : "universities"}
            </span>
            {course.faculties.slice(0, 2).map((f) => (
              <span
                key={f}
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
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {loading && (
            <p style={{ fontSize: "14px", color: "var(--t3)" }}>Loading details…</p>
          )}

          {err && (
            <div
              style={{
                padding: "12px 14px",
                background: "var(--rch-bg)",
                border: "1px solid var(--rch-b)",
                borderRadius: "var(--r)",
              }}
            >
              <p style={{ fontSize: "13px", color: "var(--rch-t)" }}>{err}</p>
            </div>
          )}

          {!loading && !err && detail && (
            <>
              {/* Universities offering */}
              <div>
                <p
                  className="label"
                  style={{ marginBottom: "12px" }}
                >
                  Universities offering this course
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {detail.offerings.map((o) => (
                    <div
                      key={o.university_id}
                      style={{
                        padding: "14px 18px",
                        background: "var(--s1)",
                        border: "1px solid var(--b)",
                        borderRadius: "var(--r)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--t)",
                          marginBottom: "4px",
                        }}
                      >
                        {o.university_name}
                      </p>
                      {o.typical_offer && (
                        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "2px" }}>
                          Typical offer: {o.typical_offer}
                        </p>
                      )}
                      {o.required_subjects && (
                        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "2px" }}>
                          Required subjects: {o.required_subjects}
                        </p>
                      )}
                      {o.min_requirements && (
                        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "2px" }}>
                          Min requirements: {o.min_requirements}
                        </p>
                      )}
                      {o.estimated_annual_cost_international != null && (
                        <p style={{ fontSize: "12px", color: "var(--t3)", marginBottom: "2px" }}>
                          Int'l annual cost: £{o.estimated_annual_cost_international.toLocaleString()}
                        </p>
                      )}
                      {o.course_url && (
                        <a
                          href={o.course_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "12px",
                            color: "var(--t3)",
                            textDecoration: "none",
                            borderBottom: "1px solid var(--b)",
                          }}
                        >
                          Course page →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Entry hint */}
              {course.min_entry_hint && (
                <div style={{ marginTop: "20px" }}>
                  <p className="label" style={{ marginBottom: "6px" }}>
                    Entry signal
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--t3)" }}>
                    {course.min_entry_hint}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTAs */}
        <div
          style={{
            padding: "20px 32px",
            borderTop: "1px solid var(--b)",
            display: "flex",
            gap: "10px",
            flexShrink: 0,
          }}
        >
          {/* Shortlist toggle */}
          <button
            onClick={() => onToggleShortlist(course)}
            disabled={shortlistBusy}
            style={{
              flex: 1,
              padding: "10px 0",
              background: isShortlisted ? "var(--s2)" : "var(--bg)",
              border: `1px solid ${isShortlisted ? "var(--b-strong)" : "var(--b)"}`,
              borderRadius: "var(--r)",
              fontSize: "13px",
              color: isShortlisted ? "var(--t)" : "var(--t3)",
              cursor: shortlistBusy ? "wait" : "pointer",
              transition: "all 150ms",
            }}
          >
            {shortlistBusy
              ? "Saving…"
              : isShortlisted
              ? "✓ Shortlisted"
              : "+ Shortlist"}
          </button>

          {/* Check chances */}
          <Link
            href={`/dashboard/assess?query=${encodeURIComponent(course.course_name)}`}
            className="link-chances-pill"
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "13px",
              padding: "10px 0",
              borderStyle: "solid",
              borderWidth: "1px",
              borderRadius: "var(--r)",
            }}
          >
            Check my chances →
          </Link>
        </div>
      </div>
    </div>
  );
}
