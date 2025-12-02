import { NextResponse } from 'next/server';
import { getIbkrHealth, getIbkrAccount, getIbkrPositions, getIbkrOrders } from '@/lib/data/ibkrBridge';

export const runtime = 'nodejs';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasBridgeUrl: !!process.env.IBKR_BRIDGE_URL,
      hasBridgeKey: !!process.env.IBKR_BRIDGE_KEY,
      bridgeUrl: process.env.IBKR_BRIDGE_URL || 'NOT SET',
    },
    tests: {},
  };

  // Test 1: Health check
  try {
    const health = await getIbkrHealth();
    diagnostics.tests.health = { ok: true, data: health };
  } catch (error: any) {
    diagnostics.tests.health = {
      ok: false,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    };
  }

  // Test 2: Account endpoint
  try {
    const account = await getIbkrAccount();
    diagnostics.tests.account = { ok: true, data: account };
  } catch (error: any) {
    diagnostics.tests.account = {
      ok: false,
      error: error?.message || 'Unknown error',
    };
  }

  // Test 3: Positions endpoint
  try {
    const positions = await getIbkrPositions();
    diagnostics.tests.positions = { ok: true, data: positions };
  } catch (error: any) {
    diagnostics.tests.positions = {
      ok: false,
      error: error?.message || 'Unknown error',
    };
  }

  // Test 4: Orders endpoint
  try {
    const orders = await getIbkrOrders();
    diagnostics.tests.orders = { ok: true, data: orders };
  } catch (error: any) {
    diagnostics.tests.orders = {
      ok: false,
      error: error?.message || 'Unknown error',
    };
  }

  const allPassed = Object.values(diagnostics.tests).every((t: any) => t.ok === true);

  return NextResponse.json({
    ok: allPassed,
    diagnostics,
  });
}

