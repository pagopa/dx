import type { Props } from "@theme/DocRoot/Layout/Sidebar";
import type { ReactNode } from "react";

import { useDocsSidebar } from "@docusaurus/plugin-content-docs/client";
import { useLocation } from "@docusaurus/router";
/**
 * Adds a resizable desktop wrapper around the Docusaurus docs sidebar.
 */
import {
  prefersReducedMotion,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import ExpandButton from "@theme/DocRoot/Layout/Sidebar/ExpandButton";
import DocSidebar from "@theme/DocSidebar";
import React, { useCallback, useEffect, useState } from "react";

import styles from "./styles.module.css";

const defaultSidebarWidth = 280;
const minSidebarWidth = 240;
const maxSidebarWidth = 420;
const keyboardResizeStep = 16;

const classNames = (...values: (false | string | undefined)[]): string =>
  values.filter(Boolean).join(" ");

const readCssWidth = (propertyName: string, fallback: number): number => {
  if (typeof window === "undefined") {
    return fallback;
  }

  const propertyValue = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim();
  const parsedValue = Number.parseFloat(propertyValue);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const clampSidebarWidth = (width: number): number =>
  Math.min(
    readCssWidth("--dx-doc-sidebar-max-width", maxSidebarWidth),
    Math.max(
      readCssWidth("--dx-doc-sidebar-min-width", minSidebarWidth),
      width,
    ),
  );

const applySidebarWidth = (width: number): number => {
  const nextWidth = clampSidebarWidth(width);
  document.documentElement.style.setProperty(
    "--doc-sidebar-width",
    `${nextWidth}px`,
  );

  return nextWidth;
};

export default function DocRootLayoutSidebar({
  hiddenSidebarContainer,
  setHiddenSidebarContainer,
  sidebar,
}: Props): ReactNode {
  const { pathname } = useLocation();
  const [hiddenSidebar, setHiddenSidebar] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);

  useEffect(() => {
    const nextWidth = applySidebarWidth(
      readCssWidth("--doc-sidebar-width", defaultSidebarWidth),
    );
    setSidebarWidth(nextWidth);

    return () => {
      delete document.body.dataset.sidebarResizing;
    };
  }, []);

  const updateSidebarWidth = useCallback((nextWidth: number) => {
    const appliedWidth = applySidebarWidth(nextWidth);
    setSidebarWidth(appliedWidth);

    return appliedWidth;
  }, []);

  const toggleSidebar = useCallback(() => {
    if (hiddenSidebar) {
      setHiddenSidebar(false);
    }

    if (!hiddenSidebar && prefersReducedMotion()) {
      setHiddenSidebar(true);
    }

    setHiddenSidebarContainer((value) => !value);
  }, [hiddenSidebar, setHiddenSidebarContainer]);

  const handleResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (hiddenSidebarContainer) {
        return;
      }

      event.preventDefault();

      const startX = event.clientX;
      const initialWidth = sidebarWidth;
      const resizeHandle = event.currentTarget;

      setIsResizing(true);
      document.body.dataset.sidebarResizing = "true";
      resizeHandle.setPointerCapture(event.pointerId);

      const stopResizing = () => {
        resizeHandle.removeEventListener("pointermove", onPointerMove);
        resizeHandle.removeEventListener("pointerup", stopResizing);
        resizeHandle.removeEventListener("pointercancel", stopResizing);
        resizeHandle.removeEventListener("lostpointercapture", stopResizing);

        if (resizeHandle.hasPointerCapture(event.pointerId)) {
          resizeHandle.releasePointerCapture(event.pointerId);
        }

        setIsResizing(false);
        delete document.body.dataset.sidebarResizing;
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        updateSidebarWidth(initialWidth + (moveEvent.clientX - startX));
      };

      resizeHandle.addEventListener("pointermove", onPointerMove);
      resizeHandle.addEventListener("pointerup", stopResizing);
      resizeHandle.addEventListener("pointercancel", stopResizing);
      resizeHandle.addEventListener("lostpointercapture", stopResizing);
    },
    [hiddenSidebarContainer, sidebarWidth, updateSidebarWidth],
  );

  const handleResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (hiddenSidebarContainer) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          updateSidebarWidth(sidebarWidth - keyboardResizeStep);
          break;
        case "ArrowRight":
          event.preventDefault();
          updateSidebarWidth(sidebarWidth + keyboardResizeStep);
          break;
        case "End":
          event.preventDefault();
          updateSidebarWidth(maxSidebarWidth);
          break;
        case "Home":
          event.preventDefault();
          updateSidebarWidth(minSidebarWidth);
          break;
        default:
          break;
      }
    },
    [hiddenSidebarContainer, sidebarWidth, updateSidebarWidth],
  );

  return (
    <aside
      className={classNames(
        ThemeClassNames.docs.docSidebarContainer,
        styles.docSidebarContainer,
        hiddenSidebarContainer && styles.docSidebarContainerHidden,
        isResizing && styles.docSidebarContainerResizing,
      )}
      onTransitionEnd={(event) => {
        if (
          !event.currentTarget.classList.contains(styles.docSidebarContainer)
        ) {
          return;
        }

        if (hiddenSidebarContainer) {
          setHiddenSidebar(true);
        }
      }}
    >
      <ResetOnSidebarChange>
        <div
          className={classNames(
            styles.sidebarViewport,
            hiddenSidebar && styles.sidebarViewportHidden,
          )}
        >
          <DocSidebar
            isHidden={hiddenSidebar}
            onCollapse={toggleSidebar}
            path={pathname}
            sidebar={sidebar}
          />
          {hiddenSidebar && <ExpandButton toggleSidebar={toggleSidebar} />}
        </div>
      </ResetOnSidebarChange>
      {!hiddenSidebarContainer && (
        <div
          aria-label="Resize documentation sidebar"
          aria-orientation="vertical"
          aria-valuemax={maxSidebarWidth}
          aria-valuemin={minSidebarWidth}
          aria-valuenow={Math.round(sidebarWidth)}
          className={styles.resizeHandle}
          onKeyDown={handleResizeKeyDown}
          onPointerDown={handleResizeStart}
          role="separator"
          tabIndex={0}
        />
      )}
    </aside>
  );
}

// Reset sidebar state when sidebar changes.
// Use React key to unmount/remount the children.
function ResetOnSidebarChange({ children }: { children: ReactNode }) {
  const sidebar = useDocsSidebar();

  return (
    <React.Fragment key={sidebar?.name ?? "noSidebar"}>
      {children}
    </React.Fragment>
  );
}
