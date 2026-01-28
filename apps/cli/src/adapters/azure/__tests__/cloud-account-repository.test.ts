import type { Subscription } from "@azure/arm-resources-subscriptions";

import { describe, expect, it, vi } from "vitest";

import { AzureSubscriptionRepository } from "../cloud-account-repository.js";

const createMockSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  displayName: "Test Subscription",
  state: "Enabled",
  subscriptionId: "00000000-0000-0000-0000-000000000001",
  ...overrides,
});

const createMockSubscriptionClient = (subscriptions: Subscription[]) => {
  const listIterator = async function* () {
    for (const sub of subscriptions) {
      yield sub;
    }
  };

  return {
    subscriptions: {
      list: listIterator,
    },
  };
};

vi.mock("@azure/arm-resources-subscriptions", () => ({
  SubscriptionClient: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { DefaultAzureCredential } from "@azure/identity";

const MockedSubscriptionClient = SubscriptionClient as unknown as ReturnType<
  typeof vi.fn
>;

describe("AzureSubscriptionRepository", () => {
  it("should return a list of enabled subscriptions", async () => {
    const subscriptions = [
      createMockSubscription({
        displayName: "Sub 1",
        subscriptionId: "sub-1",
      }),
      createMockSubscription({
        displayName: "Sub 2",
        subscriptionId: "sub-2",
      }),
    ];
    MockedSubscriptionClient.mockImplementation(() =>
      createMockSubscriptionClient(subscriptions),
    );

    const repository = new AzureSubscriptionRepository(
      new DefaultAzureCredential(),
    );
    const result = await repository.list();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      displayName: "Sub 1",
      id: "sub-1",
    });
    expect(result[1]).toMatchObject({
      displayName: "Sub 2",
      id: "sub-2",
    });
  });

  it("should filter out disabled subscriptions", async () => {
    const subscriptions = [
      createMockSubscription({
        displayName: "Enabled Sub",
        state: "Enabled",
        subscriptionId: "enabled-sub",
      }),
      createMockSubscription({
        displayName: "Disabled Sub",
        state: "Disabled",
        subscriptionId: "disabled-sub",
      }),
    ];
    MockedSubscriptionClient.mockImplementation(() =>
      createMockSubscriptionClient(subscriptions),
    );

    const repository = new AzureSubscriptionRepository(
      new DefaultAzureCredential(),
    );
    const result = await repository.list();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      displayName: "Enabled Sub",
      id: "enabled-sub",
    });
  });

  it("should return an empty array when no subscriptions exist", async () => {
    MockedSubscriptionClient.mockImplementation(() =>
      createMockSubscriptionClient([]),
    );

    const repository = new AzureSubscriptionRepository(
      new DefaultAzureCredential(),
    );
    const result = await repository.list();

    expect(result).toEqual([]);
  });

  it("should filter out subscriptions with other states", async () => {
    const subscriptions = [
      createMockSubscription({ state: "Enabled" }),
      createMockSubscription({ state: "Warned" }),
      createMockSubscription({ state: "PastDue" }),
      createMockSubscription({ state: "Deleted" }),
    ];
    MockedSubscriptionClient.mockImplementation(() =>
      createMockSubscriptionClient(subscriptions),
    );

    const repository = new AzureSubscriptionRepository(
      new DefaultAzureCredential(),
    );
    const result = await repository.list();

    expect(result).toHaveLength(1);
  });
});
