"use client";

import ConsoleRail, { RailPanel } from "@/components/monologue/ConsoleRail";
import LabelRail from "@/components/monologue/LabelRail";
import type { PersonaV2 } from "@/lib/types";

const PERSONA_LABELS: Record<PersonaV2, string> = {
  EXPLORER: "EXPLORER",
  STRATEGIST: "STRATEGIST",
  FINISHER: "FINISHER",
};

const DEADLINE_LABEL_MAP: Record<string, string> = {
  early: "EARLY DEADLINE WINDOW",
  main: "MAIN DEADLINE WINDOW",
};

interface Props {
  persona: PersonaV2;
  shortlistCount: number;
  assessmentCount: number;
  hasPS: boolean;
  deadlineWindow: "early" | "main";
}

export function MySpaceConsoleRail({
  persona,
  shortlistCount,
  assessmentCount,
  hasPS,
  deadlineWindow,
}: Props) {
  return (
    <ConsoleRail>
      {/* ── STATUS ── */}
      <RailPanel title="Status">
        <LabelRail
          items={[
            `MODE: ${PERSONA_LABELS[persona]}`,
            "AI: ONLINE",
            assessmentCount > 0 ? "SAVED" : "UNSAVED",
          ]}
        />
      </RailPanel>

      {/* ── SHORTLIST ── */}
      <RailPanel title="Shortlist">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[32px] font-light text-[var(--t)] leading-none">
            {shortlistCount}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--t3)]">
            courses saved
          </span>
        </div>
      </RailPanel>

      {/* ── NEXT ACTION ── */}
      <RailPanel title="Next Action">
        <NextAction
          persona={persona}
          assessmentCount={assessmentCount}
          hasPS={hasPS}
        />
      </RailPanel>

      {/* ── DEADLINE ── */}
      <RailPanel title="Deadline Window">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--acc)]">
          {DEADLINE_LABEL_MAP[deadlineWindow]}
        </span>
      </RailPanel>

      {/* ── RECENT ── */}
      <RailPanel title="Recent">
        <div className="flex flex-col gap-1">
          <RecentLine label="Assessments" value={`${assessmentCount} / 5`} />
          <RecentLine label="PS" value={hasPS ? "Saved" : "Not started"} />
          <RecentLine label="Shortlisted" value={String(shortlistCount)} />
        </div>
      </RailPanel>
    </ConsoleRail>
  );
}

/* ── Next action per persona ────────────────────────────────── */

function NextAction({
  persona,
  assessmentCount,
  hasPS,
}: {
  persona: PersonaV2;
  assessmentCount: number;
  hasPS: boolean;
}) {
  let text = "";
  let href = "";

  if (persona === "EXPLORER") {
    text = "Run a clarity session to surface courses";
    href = "/my-space";
  } else if (persona === "STRATEGIST") {
    if (assessmentCount < 5) {
      text = `Add ${5 - assessmentCount} more UCAS choice${5 - assessmentCount > 1 ? "s" : ""}`;
      href = "/my-strategy";
    } else if (!hasPS) {
      text = "Start your personal statement";
      href = "/your-ps";
    } else {
      text = "Run final checks on all choices";
      href = "/results";
    }
  } else {
    // FINISHER
    if (assessmentCount < 5) {
      text = "Complete your 5 UCAS choices";
      href = "/my-strategy";
    } else if (!hasPS) {
      text = "Analyse your personal statement";
      href = "/your-ps";
    } else {
      text = "All checks complete — review results";
      href = "/results";
    }
  }

  return (
    <a
      href={href}
      className="block text-[13px] text-[var(--acc)] no-underline hover:underline"
    >
      {text} →
    </a>
  );
}

/* ── Small summary line ─────────────────────────────────────── */

function RecentLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--t3)]">
        {label}
      </span>
      <span className="font-mono text-[11px] text-[var(--t2)]">{value}</span>
    </div>
  );
}
