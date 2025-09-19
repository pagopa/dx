import type { WrapperProps } from "@docusaurus/types";
import type NavbarType from "@theme/Navbar";

import { useLocation } from "@docusaurus/router";
import OriginalNavbar from "@theme-original/Navbar";
import React from "react";

import styles from "./index.module.css";

type Props = WrapperProps<typeof NavbarType>;

export default function NavbarWrapper(props: Props): JSX.Element {
  const location = useLocation();
  // Check if we're on the homepage (both root and with base path)
  const isHomePage =
    location.pathname === "/" ||
    location.pathname === "/dx/" ||
    location.pathname === "/dx";

  return (
    <div className={isHomePage ? styles.navbarNoSearch : ""}>
      <OriginalNavbar {...props} />
    </div>
  );
}
