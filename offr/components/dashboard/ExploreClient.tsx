"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getUniqueCourses } from "@/lib/api";
import type { UniqueCourse } from "@/lib/types";

interface ExploreClientProps {
  interests: string[];
}

export function ExploreClient({ interests }: ExploreClientProps) {
  const [courses, setCourses] = useState<UniqueCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await getUniqueCourses();
        if (!cancelled) {
          setCourses(data);
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
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const name = c.course_name.toLowerCase();
      const fac = (c.faculties || []).join(" ").toLowerCase();
      return name.includes(q) || fac.includes(q);
    });
  }, [courses, search]);

  return (
    <div style={{ padding: "48px 52px", maxWidth: "860px" }}>
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

      {/* Search */}
      <div style={{ marginBottom: "20px" }}>
        <input
          className="inp"
          placeholder="Search courses or subject areas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "8px" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--t3)" }}>
          <span>
            {loading
              ? "Loading courses…"
              : `${filtered.length} of ${courses.length} courses`}
          </span>
        </div>
      </div>

      {/* Errors */}
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

      {/* Course list */}
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
            <div
              key={c.course_key}
              style={{
                padding: "20px 24px",
                background: "var(--s1)",
                border: "1px solid var(--b)",
                borderRadius: "var(--r)",
                transition: "border-color 150ms",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor =
                  "var(--b-strong)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor = "var(--b)")
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
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "4px",
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
                      {c.universities_count === 1
                        ? "university"
                        : "universities"}
                    </span>
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
              </div>
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
                <Link
                  href={`/dashboard/assess?query=${encodeURIComponent(
                    c.course_name
                  )}`}
                  className="link-chances-pill"
                  style={{
                    marginLeft: "auto",
                    fontSize: "12px",
                    borderStyle: "solid",
                    borderWidth: "1px",
                    borderRadius: "9999px",
                    padding: "4px 12px",
                  }}
                >
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
