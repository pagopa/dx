/**
 * Main package entry point.
 * Exports public API for programmatic usage.
 */

export { AzDashboardRawBuilder } from "./builders/azure-dashboard-raw/index.js";
export { AzDashboardBuilder } from "./builders/azure-dashboard/index.js";
export { Builder, type TemplateFn } from "./builders/base.js";
export { type BuilderType, createBuilder } from "./core/builder-factory.js";
export { type Config, ConfigSchema, loadConfig } from "./core/config/index.js";
export * from "./core/errors/index.js";
export { OA3Resolver } from "./core/resolver/index.js";
