"use client";

import React from "react";
import { TabPage } from "../../../components/layout/TabPage";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { SettingRow } from "../../../components/ui/SettingRow";

export default function ProfileTab() {
  return (
    <TabPage>
      <section className="space-y-2">
        <SectionHeader title="Profile" />
        <div className="rounded-3xl bg-white/5 border border-white/10 px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F56300]/20 flex items-center justify-center text-[#F56300] text-lg font-semibold">
            LF
          </div>
          <div>
            <p className="text-sm font-semibold">Liam Feltham</p>
            <p className="text-xs text-slate-400">agentyc.pro</p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Preferences" />
        <div className="space-y-2">
          <SettingRow label="Trading Session" description="US session, alerts on" action={<span>Change</span>} />
          <SettingRow label="Risk Template" description="Dynamic 0.5% – 1% per trade" action={<span>Edit</span>} />
          <SettingRow label="Notifications" description="Push + email" action={<span>Manage</span>} />
        </div>
      </section>

      <section className="space-y-2">
        <SectionHeader title="Data Sync" />
        <SettingRow label="Supabase connection" description="Synced 5 minutes ago" action={<span>View</span>} />
        <SettingRow label="Pinecone ingestion" description="Vectors: 124" action={<span>Inspect</span>} />
      </section>
    </TabPage>
  );
}

