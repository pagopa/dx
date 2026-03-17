import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboards/pull-requests");
}
