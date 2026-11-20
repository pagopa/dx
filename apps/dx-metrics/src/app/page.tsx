import { redirect } from "next/navigation";

export default function Home() {
  // Land on the executive summary: it aggregates the most urgent insights
  // across every dashboard, which is the fastest useful view for a visitor.
  redirect("/dashboards/overview");
}
