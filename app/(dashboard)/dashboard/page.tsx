import { requireAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to JobTrackr</h1>
      <p className="text-muted-foreground">
        Hello, {session.user.name || session.user.email}!
      </p>
      <p className="text-sm text-muted-foreground mt-2">Dashboard coming soon...</p>
    </div>
  );
}
