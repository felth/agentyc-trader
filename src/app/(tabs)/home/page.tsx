"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { HeroHeader } from "../../../components/ui/HeroHeader";
import { GoalRingCard } from "../../../components/ui/GoalRingCard";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { StatTile } from "../../../components/ui/StatTile";
import { StatTileGrid } from "../../../components/ui/StatTileGrid";
import { ActivityCard } from "../../../components/ui/ActivityCard";
import { ActivityList } from "../../../components/ui/ActivityList";
import { TrendList } from "../../../components/ui/TrendList";
import { TrendRow } from "../../../components/ui/TrendRow";

const goalRings = [
  { label: "Daily Profit Target", value: "65%", progress: 0.65 },
  { label: "Breakout Setups", value: "3/5", progress: 0.6 },
  { label: "Journal Entries", value: "2/3", progress: 0.66 }
];

const statTiles = [
  { label: "Win Rate", value: "62%", caption: "Last 20 trades" },
  { label: "Avg R", value: "+0.74", caption: "Daily average" },
  { label: "Max Drawdown", value: "-1.2R", caption: "This week" },
  { label: "Best Trade", value: "+2.4R", caption: "Gold breakout" }
];

const activities = [
  {
    title: "Closed XAUUSD +1.1R",
    subtitle: "Partial profit at fib extension",
    rightLabel: "2m ago",
    icon: <span className="text-lg">📈</span>
  },
  {
    title: "Journaled FRX-12 pattern",
    subtitle: "Pinned today's lesson",
    rightLabel: "25m ago",
    icon: <span className="text-lg">📝</span>
  },
  {
    title: "Backtest session completed",
    subtitle: "20 trade samples logged",
    rightLabel: "1h ago",
    icon: <span className="text-lg">⚙️</span>
  }
];

const trends = [
  { label: "Equity Curve", value: "$24,850", change: "+3.2%", positive: true },
  { label: "Daily R", value: "+1.4R", change: "+0.4R", positive: true },
  { label: "Risk Per Day", value: "0.6R", change: "-0.1R", positive: false }
];

export default function HomeTab() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

  return (
    <TabPage>
      <HeroHeader
        time={time}
        date={date}
        greeting="Hello, Liam"
        rightIcons={
          <>
            <span role="img" aria-label="search">
              🔍
            </span>
            <span role="img" aria-label="notifications">
              🔔
            </span>
          </>
        }
      />

      <section className="space-y-3 mb-6">
        <SectionHeader title="Daily Goals" actionIcon="✎" />
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
          {goalRings.map((goal) => (
            <GoalRingCard key={goal.label} {...goal} />
          ))}
        </div>
      </section>

      <section className="space-y-3 mb-6">
        <SectionHeader title="At a Glance" actionIcon="✎" actionText="Edit" />
        <StatTileGrid>
          {statTiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </StatTileGrid>
      </section>

      <section className="space-y-3 relative mb-6">
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(40px)"
            }}
          />
        </div>
        <div className="relative">
          <SectionHeader title="Recent Activity" actionText="See all" />
          <ActivityList>
            {activities.map((activity) => (
              <ActivityCard key={activity.title} {...activity} />
            ))}
          </ActivityList>
        </div>
      </section>

      <section className="space-y-3 mb-6">
        <SectionHeader title="Weekly Trends" />
        <TrendList>
          {trends.map((trend) => (
            <TrendRow key={trend.label} {...trend} />
          ))}
        </TrendList>
      </section>
    </TabPage>
  );
}

