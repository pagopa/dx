import Layout from "@theme/Layout";
import React from "react";

import TechRadarPage from "../../components/TechRadar/TechRadarPage";

export default function RadarPage(): React.JSX.Element {
  return (
    <Layout
      description="Technologies, tools, and practices we use, evaluate, or avoid."
      title="Technology Radar"
    >
      <TechRadarPage />
    </Layout>
  );
}
