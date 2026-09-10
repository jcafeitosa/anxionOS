import { describe, expect, test } from "bun:test";
import { checkEntitlement, createPlanCatalog, getEntitlementsForPlan, PLAN_IDS } from "@anxionos/billing";

describe("SaaS plan catalog", () => {
  test("contains all four plans with entitlements", () => {
    const catalog = createPlanCatalog();
    expect(Object.keys(catalog)).toEqual([...PLAN_IDS]);
    for (const planId of PLAN_IDS) {
      expect(catalog[planId].id).toBe(planId);
      expect(catalog[planId].entitlements.maxAgents).toBeGreaterThan(0);
      expect(catalog[planId].entitlements.maxConnections).toBeGreaterThan(0);
      expect(catalog[planId].entitlements.maxStrategies).toBeGreaterThan(0);
      expect(catalog[planId].entitlements.maxAgencies).toBeGreaterThan(0);
      expect(catalog[planId].entitlements.storageMb).toBeGreaterThan(0);
      expect(catalog[planId].entitlements.apiRequestsPerMinute).toBeGreaterThan(0);
    }
  });

  test("returns entitlements", () => {
    expect(getEntitlementsForPlan("freemium")).toEqual({ maxAgents: 1, maxConnections: 1, maxStrategies: 1, maxAgencies: 1, storageMb: 100, apiRequestsPerMinute: 30 });
  });

  test("checks under, at, and over limit", () => {
    expect(checkEntitlement("beginner", "maxAgents", 2)).toEqual({ allowed: true, limit: 3, current: 2, remaining: 1 });
    expect(checkEntitlement("beginner", "maxAgents", 3)).toEqual({ allowed: true, limit: 3, current: 3, remaining: 0 });
    expect(checkEntitlement("beginner", "maxAgents", 4)).toEqual({ allowed: false, limit: 3, current: 4, remaining: 0 });
  });

  test("rejects invalid usage", () => {
    expect(() => checkEntitlement("pro", "maxAgents", -1)).toThrow(RangeError);
    expect(() => checkEntitlement("pro", "maxAgents", Number.NaN)).toThrow(RangeError);
  });

  test("matches profit fees", () => {
    const catalog = createPlanCatalog();
    expect(catalog.freemium.pricing.profitFeePercentage).toBe(20);
    expect(catalog.beginner.pricing.profitFeePercentage).toBe(15);
    expect(catalog.trader.pricing.profitFeePercentage).toBe(10);
    expect(catalog.pro.pricing.profitFeePercentage).toBe(10);
  });

  test("has correct feature flags", () => {
    const catalog = createPlanCatalog();
    expect(catalog.freemium.features).toMatchObject({ crypto: true, stocks: false });
    expect(catalog.beginner.features).toMatchObject({ crypto: true, stocks: false });
    expect(catalog.trader.features).toMatchObject({ crypto: true, stocks: true });
    expect(catalog.pro.features).toMatchObject({ crypto: true, stocks: true, advancedResources: true, operationalSupport: true });
  });
});
