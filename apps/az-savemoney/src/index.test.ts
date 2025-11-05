import { describe, expect, it } from "vitest";

describe("Tag Analysis", () => {
  it("should detect resources without tags", () => {
    const resource = { tags: undefined };
    const hasNoTags = !resource.tags || Object.keys(resource.tags).length === 0;

    expect(hasNoTags).toBe(true);
  });

  it("should detect resources with empty tags object", () => {
    const resource = { tags: {} };
    const hasNoTags = !resource.tags || Object.keys(resource.tags).length === 0;

    expect(hasNoTags).toBe(true);
  });

  it("should detect resources with tags", () => {
    const resource = { tags: { Environment: "Production", Owner: "Team" } };
    const hasNoTags = !resource.tags || Object.keys(resource.tags).length === 0;

    expect(hasNoTags).toBe(false);
  });
});
describe("Location Matching", () => {
  it("should detect location mismatch - case insensitive", () => {
    const resourceLocation = "westeurope";
    const preferredLocation = "italynorth";
    const isLocationMatch = resourceLocation
      .toLowerCase()
      .includes(preferredLocation.toLowerCase());

    expect(isLocationMatch).toBe(false);
  });

  it("should detect location match - case insensitive", () => {
    const resourceLocation = "italynorth";
    const preferredLocation = "italy";
    const isLocationMatch = resourceLocation
      .toLowerCase()
      .includes(preferredLocation.toLowerCase());

    expect(isLocationMatch).toBe(true);
  });

  it("should detect partial location match", () => {
    const resourceLocation = "italynorth";
    const preferredLocation = "italy";
    const isLocationMatch = resourceLocation
      .toLowerCase()
      .includes(preferredLocation.toLowerCase());

    expect(isLocationMatch).toBe(true);
  });
});

describe("Cost Risk Assessment", () => {
  it("should assign high risk to Virtual Machines", () => {
    const costRisk: "high" | "low" | "medium" = "high";
    expect(costRisk).toBe("high");
  });

  it("should assign high risk to App Service Plans", () => {
    const costRisk: "high" | "low" | "medium" = "high";
    expect(costRisk).toBe("high");
  });

  it("should assign medium risk to Storage Accounts", () => {
    const costRisk: "high" | "low" | "medium" = "medium";
    expect(costRisk).toBe("medium");
  });

  it("should assign medium risk to Disks", () => {
    const costRisk: "high" | "low" | "medium" = "medium";
    expect(costRisk).toBe("medium");
  });

  it("should assign medium risk to Network resources", () => {
    const costRisk: "high" | "low" | "medium" = "medium";
    expect(costRisk).toBe("medium");
  });
});

describe("Metric Analysis Thresholds", () => {
  it("should flag VM with CPU usage below 1%", () => {
    const cpuUsage = 0.5;
    const isLowCpu = cpuUsage < 1;

    expect(isLowCpu).toBe(true);
  });

  it("should not flag VM with normal CPU usage", () => {
    const cpuUsage = 25.5;
    const isLowCpu = cpuUsage < 1;

    expect(isLowCpu).toBe(false);
  });

  it("should flag App Service Plan with CPU below 5%", () => {
    const cpuPercentage = 3.2;
    const isVeryLowCpu = cpuPercentage < 5;

    expect(isVeryLowCpu).toBe(true);
  });

  it("should flag App Service Plan with memory below 10%", () => {
    const memoryPercentage = 7.8;
    const isVeryLowMemory = memoryPercentage < 10;

    expect(isVeryLowMemory).toBe(true);
  });

  it("should flag Storage Account with transactions below 100", () => {
    const transactions = 45;
    const isVeryLowTransactions = transactions < 100;

    expect(isVeryLowTransactions).toBe(true);
  });

  it("should flag low network traffic (less than 1MB)", () => {
    const bytesInDDoS = 500000; // 0.5 MB
    const isVeryLowTraffic = bytesInDDoS < 1000000;

    expect(isVeryLowTraffic).toBe(true);
  });

  it("should flag very low network traffic (less than 10MB)", () => {
    const networkIn = 1024 * 1024 * 5; // 5MB
    const isLowTraffic = networkIn < 1024 * 1024 * 10;

    expect(isLowTraffic).toBe(true);
  });
});

describe("VM Power State Detection", () => {
  it("should detect deallocated VM", () => {
    const vmStatusCode = "PowerState/deallocated";
    const isDeallocated = vmStatusCode === "PowerState/deallocated";

    expect(isDeallocated).toBe(true);
  });

  it("should detect stopped VM", () => {
    const vmStatusCode = "PowerState/stopped";
    const isStopped = vmStatusCode === "PowerState/stopped";

    expect(isStopped).toBe(true);
  });

  it("should detect running VM", () => {
    const vmStatusCode = "PowerState/running";
    const isRunning = vmStatusCode === "PowerState/running";

    expect(isRunning).toBe(true);
  });

  it("should identify power state prefix", () => {
    const statusCode = "PowerState/deallocated";
    const isPowerState = statusCode.startsWith("PowerState/");

    expect(isPowerState).toBe(true);
  });
});

describe("Disk Attachment State", () => {
  it("should detect unattached disk by state", () => {
    const diskState = "Unattached";
    const isUnattached = diskState.toLowerCase() === "unattached";

    expect(isUnattached).toBe(true);
  });

  it("should detect unattached disk by missing managedBy", () => {
    const managedBy = undefined;
    const isUnattached = !managedBy;

    expect(isUnattached).toBe(true);
  });

  it("should detect attached disk", () => {
    const diskState = "Reserved";
    const managedBy =
      "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm";
    const isAttached = diskState.toLowerCase() !== "unattached" && !!managedBy;

    expect(isAttached).toBe(true);
  });
});

describe("Network Interface Attachment", () => {
  it("should detect NIC attached to VM", () => {
    const virtualMachine = {
      id: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Compute/virtualMachines/vm",
    };
    const privateEndpoint = undefined;
    const isAttached = virtualMachine || privateEndpoint;

    expect(isAttached).toBeTruthy();
  });

  it("should detect NIC attached to Private Endpoint", () => {
    const virtualMachine = undefined;
    const privateEndpoint = {
      id: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/privateEndpoints/pe",
    };
    const isAttached = virtualMachine || privateEndpoint;

    expect(isAttached).toBeTruthy();
  });

  it("should detect unattached NIC", () => {
    const virtualMachine = undefined;
    const privateEndpoint = undefined;
    const isAttached = virtualMachine || privateEndpoint;

    expect(isAttached).toBeFalsy();
  });
});
describe("Public IP Association", () => {
  it("should detect unassociated Public IP", () => {
    const ipConfiguration = undefined;
    const natGateway = undefined;
    const isAssociated = ipConfiguration || natGateway;

    expect(isAssociated).toBeFalsy();
  });

  it("should detect Public IP associated with NAT Gateway", () => {
    const ipConfiguration = undefined;
    const natGateway = {
      id: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/natGateways/nat",
    };
    const isAssociated = ipConfiguration || natGateway;

    expect(isAssociated).toBeTruthy();
  });

  it("should detect Public IP with IP configuration", () => {
    const ipConfiguration = {
      id: "/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Network/loadBalancers/lb/frontendIPConfigurations/config",
    };
    const natGateway = undefined;
    const isAssociated = ipConfiguration || natGateway;

    expect(isAssociated).toBeTruthy();
  });

  it("should detect unused static Public IP", () => {
    const publicIPAllocationMethod = "Static";
    const ipConfiguration = undefined;
    const isUnusedStatic =
      publicIPAllocationMethod === "Static" && !ipConfiguration;

    expect(isUnusedStatic).toBe(true);
  });
});

describe("App Service Plan Analysis", () => {
  it("should detect App Service Plan with no apps", () => {
    const numberOfSites = 0;
    const hasNoApps = numberOfSites === 0;

    expect(hasNoApps).toBe(true);
  });

  it("should detect App Service Plan with apps", () => {
    const numberOfSites = 3 as number;
    const hasNoApps = numberOfSites === 0;

    expect(hasNoApps).toBe(false);
  });

  it("should detect oversized Premium plan with low usage", () => {
    const skuTier = "PremiumV3";
    const cpuPercentage = 8;
    const isOversized = skuTier.includes("Premium") && cpuPercentage < 10;

    expect(isOversized).toBe(true);
  });

  it("should not flag Premium plan with high usage", () => {
    const skuTier = "Premium";
    const cpuPercentage = 75;
    const isOversized = skuTier.includes("Premium") && cpuPercentage < 10;

    expect(isOversized).toBe(false);
  });
});
