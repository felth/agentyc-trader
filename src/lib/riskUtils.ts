export function getRiskSeverity(openRiskPercent: number): "OK" | "ELEVATED" | "DANGER" {
  if (openRiskPercent >= 1.0) return "DANGER";
  if (openRiskPercent >= 0.5) return "ELEVATED";
  return "OK";
}

