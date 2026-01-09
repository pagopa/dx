import type { TokenCredential } from "@azure/identity";

import { SubscriptionClient } from "@azure/arm-resources-subscriptions";
import { z } from "zod/v4";

import {
  type CloudAccountRepository,
  cloudAccountSchema,
} from "../../domain/cloud-account.js";
import { defaultLocation } from "./locations.js";

export class AzureSubscriptionRepository implements CloudAccountRepository {
  #subscriptionClient: SubscriptionClient;

  constructor(credential: TokenCredential) {
    this.#subscriptionClient = new SubscriptionClient(credential);
  }

  async list() {
    const subscriptions = [];
    for await (const subscription of this.#subscriptionClient.subscriptions.list()) {
      if (subscription.state === "Enabled") {
        subscriptions.push({
          defaultLocation,
          displayName: subscription.displayName,
          id: subscription.subscriptionId,
        });
      }
    }
    return z.array(cloudAccountSchema).parse(subscriptions);
  }
}
