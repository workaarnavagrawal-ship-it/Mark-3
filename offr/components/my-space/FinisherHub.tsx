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
  /** Top 3 actionable fixes for the user */
  fixes: { label: string; href: string }[];
}

export function FinisherHub({ profile, assessmentCount, hasPS, fixes }: Props) {
  const choicesLocked = assessmentCount >= 5;
  const psLocked = hasPS;
  const chancesLocked = choicesLocked; // chances = assessments exist
  const allReady = choicesLocked && psLocked && chancesLocked;

  return (
    <>
      {/* ── FINAL CHECKS panel ── */}
      <HardwarePanel
        spotlight
        header={
          <LabelRail
            items={[
              "MODE: FINISHER",
              choicesLocked ? "CHOICES: ✓" : "CHOICES: ✕",
              psLocked ? "PS: ✓" : "PS: ✕",
              chancesLocked ? "CHANCES: ✓" : "CHANCES: ✕",
            ]}
          />
        }
      >
        <h2 className="serif text-[28px] font-normal text-[var(--t)] mb-2">
          Final Checks
        </h2>
        <p className="text-[13px] text-[var(--t3)] mb-8 leading-relaxed">
          &quot;I am the one who knocks.&quot; — You&apos;re ready to submit. Lock in your choices,
          analyse your PS, and get honest offer chances before you hit send.
        </p>

        {/* Lock indicators */}
        <div className="flex flex-col gap-4 mb-8">
          <LockRow label="5 UCAS Choices" locked={choicesLocked} href="/my-strategy" />
          <LockRow label="PS Analysis" locked={psLocked} href="/your-ps" />
          <LockRow label="Offer Chances" locked={chancesLocked} href="/results" />
        </div>

        {allReady ? (
          <PrimaryActionKey disabled>READY</PrimaryActionKey>
        ) : (
          <Link href={!choicesLocked ? "/my-strategy" : !psLocked ? "/your-ps" : "/results"} style={{ textDecoration: "none" }}>
            <PrimaryActionKey>COMPLETE FINAL CHECKS</PrimaryActionKey>
          </Link>
        )}
      </HardwarePanel>

      {/* ── Fix these before submit ── */}
      {fixes.length > 0 && (
        <HardwarePanel className="mt-4">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--t3)] mb-4 block">
            Fix these before submit
          </span>
          <div className="flex flex-col gap-3">
            {fixes.map((fix, i) => (
              <Link key={i} href={fix.href} className="no-underline block">
                <div className="flex items-center gap-3 group">
                  <span className="w-6 h-6 rounded-full border border-[var(--rch-b)] bg-[var(--rch-bg)] flex items-center justify-center shrink-0">
                    <span className="font-mono text-[10px] font-bold text-[var(--rch-t)]">
                      {i + 1}
                    </span>
                  </span>
                  <span className="text-[13px] text-[var(--t2)] group-hover:text-[var(--acc)] transition-colors">
                    {fix.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </HardwarePanel>
      )}
    </>
  );
}

function LockRow({
  label,
  locked,
  href,
}: {
  label: string;
  locked: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="no-underline block">
      <div className="flex items-center justify-between group">
        <span
          className={`
            font-mono text-[12px] uppercase tracking-[0.08em]
            ${locked ? "text-[var(--t3)]" : "text-[var(--t)] group-hover:text-[var(--acc)]"}
          `}
        >
          {label}
        </span>
        <span
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            font-mono text-[12px] font-bold
            ${
              locked
                ? "bg-[var(--acc)] text-[var(--t-inv)]"
                : "border border-[var(--rch-b)] bg-[var(--rch-bg)] text-[var(--rch-t)]"
            }
          `}
        >
          {locked ? "✓" : "✕"}
        </span>
      </div>
    </Link>
  );
}
