import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { Providers } from "@/components/providers/Providers";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default async function Layout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <Providers>
      <DashboardLayout>{children}</DashboardLayout>
    </Providers>
  );
}
