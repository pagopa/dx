/**
 * Shared Vitest fixtures for dependency-tracking integration tests that need a
 * telemetry collector and disposable test containers.
 */
import { type StartedTestContainer } from "testcontainers";

import {
  startTelemetryCollector,
  type TelemetryCollector,
} from "./dependency-tracking-test-helpers";

export interface DependencyTrackingFixtures {
  readonly telemetryCollector: TelemetryCollector;
}

export const telemetryCollectorFixture = async (
  // The empty pattern is required by Vitest.
  // eslint-disable-next-line no-empty-pattern
  {},
  use: (telemetryCollector: TelemetryCollector) => Promise<void>,
) => {
  const telemetryCollector = await startTelemetryCollector();

  try {
    await use(telemetryCollector);
  } finally {
    await telemetryCollector.close();
  }
};

export const createContainerFixture =
  <TContainer extends StartedTestContainer>(
    startContainer: () => Promise<TContainer>,
  ) =>
  // The empty pattern is required by Vitest.
  // eslint-disable-next-line no-empty-pattern
  async ({}, use: (container: TContainer) => Promise<void>) => {
    const container = await startContainer();

    try {
      await use(container);
    } finally {
      await container.stop();
    }
  };
