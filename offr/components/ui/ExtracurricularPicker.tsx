"use client";
import { useState } from "react";

const CURATED = [
  "MUN (Model UN)", "Debate", "Entrepreneurship / Startups", "Research",
  "Olympiads", "Sports", "Music", "Volunteering", "Leadership",
  "Art & Design", "Drama / Theatre", "Photography / Film",
  "Coding / Programming", "Community Service", "Tutoring / Teaching",
  "Science Fairs", "Student Government", "Reading / Writing Club", "Languages",
];

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  /** Style variant: "onboarding" uses slightly larger pill sizing */
  variant?: "onboarding" | "profile";
}

export function ExtracurricularPicker({ value, onChange, variant = "profile" }: Props) {
  const [query, setQuery] = useState("");
  const [customInput, setCustomInput] = useState("");

  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter(x => x !== item) : [...value, item]);

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setCustomInput("");
  };

  const filtered = CURATED.filter(e => e.toLowerCase().includes(query.toLowerCase()));
  const pillSize = variant === "onboarding" ? { padding: "7px 14px", fontSize: "13px" } : { padding: "5px 12px", fontSize: "12px" };

  const selS: React.CSSProperties = {
    background: "var(--s2)", border: "1px solid var(--b)",
    borderRadius: "var(--ri)", padding: "10px 12px",
    fontSize: "14px", color: "var(--t)", outline: "none",
    fontFamily: "var(--font-dm, var(--sans))", width: "100%",
  };

  return (
    <div>
      {/* Search */}
      <input
        style={{ ...selS, marginBottom: "12px" }}
        placeholder="Search activities…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Search extracurriculars"
      />

      {/* Curated list */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
        {filtered.map(item => {
          const active = value.includes(item);
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              style={{
                ...pillSize,
                borderRadius: "9999px",
                border: `1px solid ${active ? "var(--acc)" : "var(--b)"}`,
                background: active ? "var(--acc)" : "transparent",
                color: active ? "var(--t-inv)" : "var(--t3)",
                cursor: "pointer", transition: "all 150ms",
                fontFamily: "var(--font-dm, var(--sans))",
              }}
            >
              {item}
            </button>
          );
        })}
        {filtered.length === 0 && query && (
          <p style={{ fontSize: "13px", color: "var(--t3)" }}>No matches — add it below.</p>
        )}
      </div>

      {/* Custom add */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          style={{ ...selS, flex: 1 }}
          placeholder="Add your own… (press Enter)"
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          aria-label="Add custom extracurricular"
        />
        <button
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="btn btn-ghost"
          style={{ flexShrink: 0 }}
        >
          + Add
        </button>
      </div>

      {/* Selected chips */}
      {value.length > 0 && (
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {value.map(item => (
            <span
              key={item}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "4px 10px", borderRadius: "9999px",
                background: "var(--acc)", color: "var(--t-inv)",
                fontSize: "12px", fontFamily: "var(--font-dm, var(--sans))",
              }}
            >
              {item}
              <button
                onClick={() => onChange(value.filter(x => x !== item))}
                aria-label={`Remove ${item}`}
                style={{
                  background: "none", border: "none", color: "inherit",
                  cursor: "pointer", padding: 0, lineHeight: 1,
                  fontSize: "13px", display: "flex", alignItems: "center",
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
