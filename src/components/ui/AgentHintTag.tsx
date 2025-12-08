"use client";

export default function AgentHintTag({
  text,
}: {
  text: string;
}) {
  return (
    <div className="text-[11px] uppercase font-semibold tracking-wide px-2 py-[2px] rounded-md bg-[#1A1A1A] text-[#7FE1FF] inline-block">
      AGENTYC • {text}
    </div>
  );
}

