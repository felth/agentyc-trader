import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const bridgeUrl = process.env.IBKR_BRIDGE_URL;
  const bridgeKey = process.env.IBKR_BRIDGE_KEY;

  if (!bridgeUrl || !bridgeKey) {
    return NextResponse.json({
      ok: false,
      error: "IBKR_BRIDGE_URL or IBKR_BRIDGE_KEY not set",
      bridgeUrl: bridgeUrl || "NOT SET",
      bridgeKeySet: !!bridgeKey,
    });
  }

  // Test connection to bridge
  const testResults: any = {
    bridgeUrl,
    bridgeKeySet: !!bridgeKey,
    tests: {},
  };

  // Test 1: Health endpoint
  try {
    const healthUrl = `${bridgeUrl}/health`;
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(healthUrl, {
      method: "GET",
      headers: {
        "X-Bridge-Key": bridgeKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    testResults.tests.health = {
      success: res.ok,
      status: res.status,
      statusText: res.statusText,
      duration: `${duration}ms`,
      data: res.ok ? await res.json().catch(() => null) : null,
    };
  } catch (err: any) {
    testResults.tests.health = {
      success: false,
      error: err?.message || "Unknown error",
      errorType: err?.name || "Unknown",
      isTimeout: err?.name === "AbortError",
    };
  }

  // Test 2: Account endpoint
  try {
    const accountUrl = `${bridgeUrl}/account`;
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(accountUrl, {
      method: "GET",
      headers: {
        "X-Bridge-Key": bridgeKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    testResults.tests.account = {
      success: res.ok,
      status: res.status,
      statusText: res.statusText,
      duration: `${duration}ms`,
      hasData: res.ok,
    };
  } catch (err: any) {
    testResults.tests.account = {
      success: false,
      error: err?.message || "Unknown error",
      errorType: err?.name || "Unknown",
      isTimeout: err?.name === "AbortError",
    };
  }

  // Summary
  const allTestsPassed = Object.values(testResults.tests).every((t: any) => t.success);
  testResults.summary = {
    allPassed: allTestsPassed,
    totalTests: Object.keys(testResults.tests).length,
    passedTests: Object.values(testResults.tests).filter((t: any) => t.success).length,
  };

  return NextResponse.json({
    ok: allTestsPassed,
    ...testResults,
    recommendations: !allTestsPassed ? [
      "1. Check if the IBKR bridge service is running on the droplet: `systemctl status ibkr-bridge`",
      "2. Check firewall rules: `sudo ufw status` - ensure port 8000 is open",
      "3. Verify the bridge is listening: `netstat -tlnp | grep 8000`",
      "4. Check bridge logs: `journalctl -u ibkr-bridge -n 50`",
      "5. Test from droplet: `curl http://localhost:8000/health`",
      "6. If using HTTP, Vercel might need HTTPS - consider using a reverse proxy (nginx) with SSL",
    ] : [],
  });
}

