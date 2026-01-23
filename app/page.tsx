import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-utils";

export default async function Home() {
  const session = await getServerSession();

  // If user is logged in, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  // If not logged in, redirect to login page
  redirect("/login");
}
