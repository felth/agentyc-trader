"use client";

import React from "react";

type HeroHeaderProps = {
  time: string;
  date: string;
  greeting: string;
  rightIcons?: React.ReactNode;
  backgroundImage?: string;
};

export function HeroHeader({
  time,
  date,
  greeting,
  rightIcons,
  backgroundImage
}: HeroHeaderProps) {
  const bg = backgroundImage
    ? `url(${backgroundImage})`
    : "linear-gradient(135deg, rgba(9,9,17,0.9), rgba(30,30,40,0.6))";

  return (
    <section className="relative h-44 rounded-3xl overflow-hidden">
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: backgroundImage ? undefined : bg,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />
      <div className="relative h-full flex flex-col justify-between px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{time}</span>
          <div className="flex items-center gap-3">{rightIcons}</div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-slate-300">{date}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        </div>
      </div>
    </section>
  );
}

