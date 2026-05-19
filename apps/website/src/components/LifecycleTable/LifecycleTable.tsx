/** LifecycleTable — renders DX tooling lifecycle data as per-tool version tables. */
import { usePluginData } from "@docusaurus/useGlobalData";
import React from "react";

import type {
  ToolCategory,
  ToolLifecycle,
  VersionEntry,
  VersionStatus,
} from "./types";

import styles from "./LifecycleTable.module.css";
import { STATUS_META } from "./types";

const CATEGORY_CLASS: Record<ToolCategory, string> = {
  "build-tool": styles.categoryBuildTool,
  ci: styles.categoryCi,
  infra: styles.categoryInfra,
  runtime: styles.categoryRuntime,
};

const CATEGORY_LABEL: Record<ToolCategory, string> = {
  "build-tool": "Build Tool",
  ci: "CI/CD",
  infra: "Infrastructure",
  runtime: "Runtime",
};

const STATUS_CLASS: Record<VersionStatus, string> = {
  active: styles.statusActive,
  deprecated: styles.statusDeprecated,
  eol: styles.statusEol,
  maintenance: styles.statusMaintenance,
};

function StatusBadge({ status }: { readonly status: VersionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`${styles.statusBadge} ${STATUS_CLASS[status]}`}>
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function ToolVersionTable({ tool }: { readonly tool: ToolLifecycle }) {
  return (
    <section className={styles.toolSection}>
      <div className={styles.toolHeader}>
        <h3>{tool.name}</h3>
        <span
          className={`${styles.categoryBadge} ${CATEGORY_CLASS[tool.category]}`}
        >
          {CATEGORY_LABEL[tool.category]}
        </span>
      </div>
      <p className={styles.policy}>{tool.lifecyclePolicy}</p>
      <p className={styles.vendorLink}>
        {tool.vendorLifecycleUrl.startsWith("/") ? (
          <a href={tool.vendorLifecycleUrl}>Lifecycle reference →</a>
        ) : (
          <a
            href={tool.vendorLifecycleUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Vendor lifecycle schedule ↗
          </a>
        )}
      </p>
      <div className={styles.communicationSection}>
        <strong>Communication channels</strong>
        <ul className={styles.communicationList}>
          {tool.communicationChannels.map((channel) => (
            <li key={channel}>{channel}</li>
          ))}
        </ul>
      </div>
      <table className={styles.versionTable}>
        <thead>
          <tr>
            <th>Version</th>
            <th>Status</th>
            <th>Supported Since</th>
            <th>EOL Date</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {tool.versions.map((v: VersionEntry) => (
            <tr key={v.version}>
              <td>
                <strong>{v.version}</strong>
              </td>
              <td>
                <StatusBadge status={v.status} />
              </td>
              <td>{v.supportedSince ?? "—"}</td>
              <td>{v.eolDate ?? "—"}</td>
              <td>
                {v.notes ?? "—"}
                {v.migrationGuideUrl && (
                  <>
                    {" "}
                    <a href={v.migrationGuideUrl}>Migration guide</a>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function LifecycleTable() {
  const { tools } = usePluginData("lifecycle-data-loader") as {
    tools: readonly ToolLifecycle[];
  };

  return (
    <div className={styles.lifecycleContainer}>
      {tools.map((tool) => (
        <ToolVersionTable key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
