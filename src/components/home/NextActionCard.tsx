"use client";

import Link from "next/link";

type NextActionCardProps = {
  action?: string;
  riskSeverity?: "OK" | "ELEVATED" | "DANGER";
  imminentHighImpact?: boolean;
  onViewPlan?: () => void;
};

export default function NextActionCard({
  action,
  riskSeverity,
  imminentHighImpact,
  onViewPlan,
}: NextActionCardProps) {
  // Determine primary message
  let message = "No action recommended";
  let messageColor = "text-white/50";
  let buttonText: string | null = null;
  let buttonAction: (() => void) | null = null;

  if (imminentHighImpact) {
    message = "News risk — no new trades";
    messageColor = "text-[#FFBF00]";
  } else if (riskSeverity === "DANGER") {
    message = "Reduce exposure";
    messageColor = "text-[#FF4D4D]";
    buttonText = "View positions";
    buttonAction = () => window.location.href = "/trades";
  } else if (riskSeverity === "ELEVATED") {
    message = "Risk elevated — trade lighter";
    messageColor = "text-[#FFBF00]";
  } else if (action) {
    message = action;
    messageColor = "text-white";
    buttonText = "View plan";
    buttonAction = onViewPlan || (() => window.location.href = "/agent");
  }

  return (
    <section className="px-6 py-4">
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5 font-medium">
              Next Action
            </p>
            <p className={`text-[16px] font-semibold ${messageColor} leading-tight`}>
              {message}
            </p>
          </div>
          {buttonText && buttonAction && (
            <button
              onClick={buttonAction}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium rounded-xl transition-colors active:scale-[0.98] flex-shrink-0"
            >
              {buttonText}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

