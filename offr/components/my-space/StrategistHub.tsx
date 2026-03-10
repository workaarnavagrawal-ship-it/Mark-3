"use client";

import Link from "next/link";
import HardwarePanel from "@/components/monologue/HardwarePanel";
import LabelRail from "@/components/monologue/LabelRail";
import { PrimaryActionKey } from "@/components/monologue/Keys";
import type { ProfileV2 } from "@/lib/types";

interface Props {
  profile: ProfileV2;
  assessmentCount: number;
  hasPS: boolean;
  shortlistCount: number;
}

export function StrategistHub({ profile, assessmentCount, hasPS, shortlistCount }: Props) {
  const choicesDone = assessmentCount >= 5;
  const psDone = hasPS;
  const checksDone = choicesDone && psDone;

  // Determine primary CTA
  let ctaLabel = "ADD MY 5 CHOICES";
  let ctaHref = "/my-space/strategy";
  if (choicesDone && !psDone) {
    ctaLabel = "START PS";
    ctaHref = "/my-space/ps";
  } else if (choicesDone && psDone) {
    ctaLabel = "RUN CHECKS";
    ctaHref = "/my-space/results";
  }

  return (
    <>
      {/* ── YOUR PLAN panel ── */}
      <HardwarePanel
        spotlight
        header={
          <LabelRail
            items={[
              "MODE: STRATEGIST",
              `CHOICES: ${assessmentCount}/5`,
              psDone ? "PS: SAVED" : "PS: PENDING",
            ]}
          />
        }
      >
        <h2 className="serif text-[28px] font-normal text-[var(--t)] mb-2">
          Your Plan
        </h2>
        <p className="text-[13px] text-[var(--t3)] mb-8 leading-relaxed">
          &quot;Yeah, science! ...but like, which science?&quot; — Jesse knows the direction. Build a plan: 5 smart choices, a strong PS, strategic pivots.
        </p>

        {/* Checklist */}
        <div className="flex flex-col gap-4 mb-8">
          <ChecklistItem
            step="01"
            label="Add 5 UCAS choices"
            href="/my-space/strategy"
            done={choicesDone}
          />
          <ChecklistItem
            step="02"
            label="Build your personal statement"
            href="/my-space/ps"
            done={psDone}
          />
          <ChecklistItem
            step="03"
            label="Run checks on all choices"
            href="/my-space/results"
            done={checksDone}
          />
        </div>

        <Link href={ctaHref} style={{ textDecoration: "none" }}>
          <PrimaryActionKey>{ctaLabel}</PrimaryActionKey>
        </Link>
      </HardwarePanel>

      {/* ── Import from shortlist ── */}
      {shortlistCount > 0 && (
        <HardwarePanel className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)]">
              Import from shortlist
            </span>
            <span className="font-mono text-[11px] text-[var(--t2)]">
              {shortlistCount} saved
            </span>
          </div>
          <p className="text-[13px] text-[var(--t3)] mb-4">
            Move shortlisted courses into your strategy slots.
          </p>
          <Link
            href="/my-space/strategy"
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--acc)] no-underline hover:underline"
          >
            Open Strategy →
          </Link>
        </HardwarePanel>
      )}

      {/* ── Quick course search ── */}
      <HardwarePanel className="mt-4">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-3 block">
          Quick search
        </span>
        <p className="text-[13px] text-[var(--t3)] mb-4">
          Browse the full database to find courses and add to your strategy.
        </p>
        <Link
          href="/my-space/database"
          className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--acc)] no-underline hover:underline"
        >
          Open Database →
        </Link>
      </HardwarePanel>
    </>
  );
}

function ChecklistItem({
  step,
  label,
  href,
  done,
}: {
  step: string;
  label: string;
  href: string;
  done: boolean;
}) {
  return (
    <Link href={href} className="no-underline block">
      <div className="flex items-center gap-4 group">
        <span
          className={`
            w-8 h-8 rounded-full flex items-center justify-center shrink-0
            font-mono text-[10px] font-bold
            transition-all duration-150
            ${
              done
                ? "bg-[var(--acc)] text-[var(--t-inv)]"
                : "border border-[var(--b-strong)] text-[var(--t3)] group-hover:border-[var(--acc-border)] group-hover:text-[var(--acc)]"
            }
          `}
        >
          {done ? "✓" : step}
        </span>
        <span
          className={`
            font-mono text-[12px] uppercase tracking-[0.08em]
            transition-colors duration-150
            ${done ? "text-[var(--t3)] line-through" : "text-[var(--t)] group-hover:text-[var(--acc)]"}
          `}
        >
          {label}
        </span>
      </div>
    </Link>
  );
}
