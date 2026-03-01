import type { ReactNode } from "react";
import { Providers } from "@/components/providers/Providers";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <DashboardLayout>{children}</DashboardLayout>
    </Providers>
  );
}
