import React from "react";

type SettingRowProps = {
  label: string;
  description?: string;
  action?: React.ReactNode;
};

export function SettingRow({ label, description, action }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white/5 border border-white/10 px-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

