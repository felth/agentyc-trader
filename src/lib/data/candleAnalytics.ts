// Candle-based Analytics Derivation
// Derive DOM, Volume Delta, CVD, Volume Profile from real candle data

import type { Candle } from "./xauusd";
import type {
  DomSnapshot,
  VolumeDeltaSnapshot,
  VolumeProfileSnapshot,
  LiquidityZonesSnapshot,
} from "./dashboard";

// Derive DOM levels from recent candles
export function deriveDom(candles: Candle[], currentPrice: number): DomSnapshot {
  if (candles.length === 0) {
    return {
      levels: [],
      volumeImbalancePct: null,
      liquidityAbove: null,
      liquidityBelow: null,
      source: "DERIVED",
    };
  }

  // Use last 50 candles to estimate DOM
  const recent = candles.slice(-50);
  
  // Group prices into levels around current price
  const levels: { price: number; bidSize: number; askSize: number }[] = [];
  const priceStep = currentPrice * 0.001; // 0.1% price steps
  
  // Create 5-7 levels around current price
  for (let i = 3; i >= -3; i--) {
    const price = currentPrice + i * priceStep;
    
    // Estimate bid/ask size from candle volume at nearby prices
    const nearbyCandles = recent.filter(
      (c) => Math.abs(c.close - price) < priceStep * 2
    );

    // Estimate: up candles = buying pressure (ask), down candles = selling pressure (bid)
    const upVolume = nearbyCandles
      .filter((c) => c.close >= c.open)
      .reduce((sum, c) => sum + (c.volume || 1), 0);
    const downVolume = nearbyCandles
      .filter((c) => c.close < c.open)
      .reduce((sum, c) => sum + (c.volume || 1), 0);

    levels.push({
      price: parseFloat(price.toFixed(2)),
      bidSize: Math.round(downVolume / nearbyCandles.length || 1),
      askSize: Math.round(upVolume / nearbyCandles.length || 1),
    });
  }

  // Calculate volume imbalance
  const totalBid = levels.reduce((sum, l) => sum + l.bidSize, 0);
  const totalAsk = levels.reduce((sum, l) => sum + l.askSize, 0);
  const totalVolume = totalBid + totalAsk;
  const volumeImbalancePct =
    totalVolume > 0 ? ((totalAsk - totalBid) / totalVolume) * 100 : null;

  // Estimate liquidity above/below
  const liquidityAbove = levels
    .filter((l) => l.price > currentPrice)
    .reduce((sum, l) => sum + l.askSize, 0);
  const liquidityBelow = levels
    .filter((l) => l.price < currentPrice)
    .reduce((sum, l) => sum + l.bidSize, 0);

  return {
    levels,
    volumeImbalancePct: volumeImbalancePct ? parseFloat(volumeImbalancePct.toFixed(1)) : null,
    liquidityAbove: liquidityAbove > 0 ? liquidityAbove : null,
    liquidityBelow: liquidityBelow > 0 ? liquidityBelow : null,
    source: "DERIVED",
  };
}

// Derive Volume Delta and CVD from candles
export function deriveVolumeDelta(candles: Candle[]): VolumeDeltaSnapshot {
  if (candles.length === 0) {
    return {
      barVolume: null,
      volumeDelta: null,
      cvd: null,
      tapeSpeed: null,
      notes: "No candle data available",
      source: "DERIVED",
    };
  }

  // Use last 100 candles for calculations
  const recent = candles.slice(-100);
  
  // Latest bar volume
  const latestCandle = recent[recent.length - 1];
  const barVolume = latestCandle.volume || null;

  // Volume Delta: difference between buying and selling volume
  // Up candles = buying, down candles = selling
  const upVolume = recent
    .filter((c) => c.close >= c.open)
    .reduce((sum, c) => sum + (c.volume || 1), 0);
  const downVolume = recent
    .filter((c) => c.close < c.open)
    .reduce((sum, c) => sum + (c.volume || 1), 0);
  
  const volumeDelta = upVolume - downVolume;

  // CVD (Cumulative Volume Delta): cumulative sum of volume delta
  let cvd = 0;
  for (const candle of recent) {
    if (candle.close >= candle.open) {
      cvd += candle.volume || 1;
    } else {
      cvd -= candle.volume || 1;
    }
  }

  // Tape speed: candles per minute (approximate)
  if (recent.length >= 2) {
    const timeSpan = (recent[recent.length - 1].time - recent[0].time) / 1000 / 60; // minutes
    const tapeSpeed = timeSpan > 0 ? Math.round(recent.length / timeSpan) : null;
    
    return {
      barVolume,
      volumeDelta: volumeDelta !== 0 ? volumeDelta : null,
      cvd: cvd !== 0 ? cvd : null,
      tapeSpeed,
      notes: "Derived from candle data",
      source: "DERIVED",
    };
  }

  return {
    barVolume,
    volumeDelta: volumeDelta !== 0 ? volumeDelta : null,
    cvd: cvd !== 0 ? cvd : null,
    tapeSpeed: null,
    notes: "Derived from candle data",
    source: "DERIVED",
  };
}

// Derive Volume Profile from candles
export function deriveVolumeProfile(
  candles: Candle[],
  currentPrice: number
): VolumeProfileSnapshot {
  if (candles.length === 0) {
    return {
      poc: null,
      valueAreaHigh: null,
      valueAreaLow: null,
      highVolumeNodes: [],
      lowVolumeAreas: [],
      source: "DERIVED",
    };
  }

  // Use last 3 days of candles (or all if less)
  const window = candles.length > 288 ? candles.slice(-288) : candles; // ~3 days at 15min intervals

  // Bin prices into buckets
  const priceRange = Math.max(...window.map((c) => c.high)) - Math.min(...window.map((c) => c.low));
  const bucketSize = priceRange / 50; // 50 price buckets
  const buckets: Map<number, number> = new Map();

  // Distribute volume across price buckets
  for (const candle of window) {
    const volume = candle.volume || 1;
    const priceRange = candle.high - candle.low;
    
    if (priceRange === 0) {
      const bucket = Math.round(candle.close / bucketSize) * bucketSize;
      buckets.set(bucket, (buckets.get(bucket) || 0) + volume);
    } else {
      // Distribute volume across the price range
      const steps = Math.max(1, Math.round(priceRange / bucketSize));
      for (let i = 0; i < steps; i++) {
        const price = candle.low + (i / steps) * priceRange;
        const bucket = Math.round(price / bucketSize) * bucketSize;
        buckets.set(bucket, (buckets.get(bucket) || 0) + volume / steps);
      }
    }
  }

  // Find POC (Point of Control) - bucket with highest volume
  let poc: number | null = null;
  let maxVolume = 0;
  for (const [price, volume] of buckets.entries()) {
    if (volume > maxVolume) {
      maxVolume = volume;
      poc = price;
    }
  }

  // Calculate Value Area (70% of volume)
  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]);
  const totalVolume = sortedBuckets.reduce((sum, [, vol]) => sum + vol, 0);
  const valueAreaVolume = totalVolume * 0.7;

  let accumulatedVolume = 0;
  const valueAreaPrices: number[] = [];
  
  for (const [price] of sortedBuckets) {
    if (accumulatedVolume < valueAreaVolume) {
      valueAreaPrices.push(price);
      accumulatedVolume += buckets.get(price) || 0;
    } else {
      break;
    }
  }

  const valueAreaHigh = valueAreaPrices.length > 0 
    ? Math.max(...valueAreaPrices) 
    : null;
  const valueAreaLow = valueAreaPrices.length > 0 
    ? Math.min(...valueAreaPrices) 
    : null;

  // High volume nodes (top 3 buckets)
  const highVolumeNodes = sortedBuckets
    .slice(0, 3)
    .map(([price]) => parseFloat(price.toFixed(2)));

  // Low volume areas (buckets with < 5% of average volume)
  const avgVolume = totalVolume / buckets.size;
  const lowVolumeAreas = Array.from(buckets.entries())
    .filter(([, vol]) => vol < avgVolume * 0.05)
    .map(([price]) => parseFloat(price.toFixed(2)))
    .slice(0, 5);

  return {
    poc: poc ? parseFloat(poc.toFixed(2)) : null,
    valueAreaHigh: valueAreaHigh ? parseFloat(valueAreaHigh.toFixed(2)) : null,
    valueAreaLow: valueAreaLow ? parseFloat(valueAreaLow.toFixed(2)) : null,
    highVolumeNodes,
    lowVolumeAreas,
    source: "DERIVED",
  };
}

// Derive Liquidity Zones from Volume Profile
export function deriveLiquidityZones(
  volumeProfile: VolumeProfileSnapshot,
  currentPrice: number
): LiquidityZonesSnapshot {
  const above: { level: number; label: string }[] = [];
  const below: { level: number; label: string }[] = [];

  // Use high volume nodes above/below price as liquidity zones
  if (volumeProfile.highVolumeNodes) {
    const aboveNodes = volumeProfile.highVolumeNodes
      .filter((node) => node > currentPrice)
      .sort((a, b) => a - b)
      .slice(0, 2);
    
    const belowNodes = volumeProfile.highVolumeNodes
      .filter((node) => node < currentPrice)
      .sort((a, b) => b - a)
      .slice(0, 2);

    aboveNodes.forEach((node, idx) => {
      above.push({ level: node, label: idx === 0 ? "HighVolume" : "Support" });
    });

    belowNodes.forEach((node, idx) => {
      below.push({ level: node, label: idx === 0 ? "HighVolume" : "Resistance" });
    });
  }

  // Add Value Area boundaries if available
  if (volumeProfile.valueAreaHigh && volumeProfile.valueAreaHigh > currentPrice) {
    if (!above.find((z) => Math.abs(z.level - volumeProfile.valueAreaHigh!) < 1)) {
      above.push({ level: volumeProfile.valueAreaHigh, label: "ValueAreaHigh" });
    }
  }

  if (volumeProfile.valueAreaLow && volumeProfile.valueAreaLow < currentPrice) {
    if (!below.find((z) => Math.abs(z.level - volumeProfile.valueAreaLow!) < 1)) {
      below.push({ level: volumeProfile.valueAreaLow, label: "ValueAreaLow" });
    }
  }

  // Sort and limit
  above.sort((a, b) => a.level - b.level);
  below.sort((a, b) => b.level - a.level);

  return {
    abovePrice: above.slice(0, 2),
    belowPrice: below.slice(0, 2),
    source: "DERIVED",
  };
}

