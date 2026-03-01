import { requireAuth } from "@/lib/auth";
import DashboardContent from "./DashboardContent";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userName = session.user.name || session.user.email || "there";

  return <DashboardContent userName={userName} />;
}
