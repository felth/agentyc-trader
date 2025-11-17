"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { UserCard } from "../../../components/profile/UserCard";
import { RiskProfileSection } from "../../../components/profile/RiskProfileSection";
import { ConnectionsSection } from "../../../components/profile/ConnectionsSection";
import { DisplayPrefsSection } from "../../../components/profile/DisplayPrefsSection";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { SettingRow } from "../../../components/ui/SettingRow";

export default function ProfileTab() {
  return (
    <TabPage>
      <div className="mb-6">
        <UserCard initials="LF" name="Liam" subtitle="Account currency: USD" />
      </div>

      <div className="mb-6">
        <RiskProfileSection />
      </div>

      <section className="rounded-3xl bg-white/5 border border-white/5 px-4 py-3 space-y-2 mb-6">
        <SectionHeader title="Alerts & Notifications" />
        <SettingRow label="Push alerts" description="Enabled · 4 categories" detail="Edit" />
        <SettingRow label="Email summaries" description="Daily wrap at 18:00" detail="Change" />
        <SettingRow label="Session reminders" description="Pre-market prep at 08:15" detail="Adjust" />
      </section>

      <div className="mb-6">
        <ConnectionsSection />
      </div>

      <div>
        <DisplayPrefsSection />
      </div>
    </TabPage>
  );
}

