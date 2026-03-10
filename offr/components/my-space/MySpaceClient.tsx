"use client";

import { ExplorerHub } from "./ExplorerHub";
import { StrategistHub } from "./StrategistHub";
import { FinisherHub } from "./FinisherHub";
import type { ProfileV2 } from "@/lib/types";

interface Props {
  profile: ProfileV2;
  assessmentCount: number;
  shortlistCount: number;
  hasPS: boolean;
}

export function MySpaceClient({ profile, assessmentCount, shortlistCount, hasPS }: Props) {
  const persona = profile.persona ?? "EXPLORER";

  // Compute finisher fixes
  const fixes: { label: string; href: string }[] = [];
  if (assessmentCount < 5) {
    fixes.push({
      label: `Add ${5 - assessmentCount} more UCAS choice${5 - assessmentCount > 1 ? "s" : ""} to your strategy`,
      href: "/my-strategy",
    });
  }
  if (!hasPS) {
    fixes.push({
      label: "Write and analyse your personal statement",
      href: "/your-ps",
    });
  }
  if (assessmentCount > 0 && assessmentCount < 5) {
    fixes.push({
      label: "Run offer checks on remaining slots",
      href: "/results",
    });
  }

  return (
    <div style={{ padding: "48px 52px", maxWidth: "720px" }}>
      {persona === "EXPLORER" && (
        <ExplorerHub profile={profile} />
      )}
      {persona === "STRATEGIST" && (
        <StrategistHub
          profile={profile}
          assessmentCount={assessmentCount}
          hasPS={hasPS}
          shortlistCount={shortlistCount}
        />
      )}
      {persona === "FINISHER" && (
        <FinisherHub
          profile={profile}
          assessmentCount={assessmentCount}
          hasPS={hasPS}
          fixes={fixes.slice(0, 3)}
        />
      )}
    </div>
  );
}
