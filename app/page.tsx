import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  LayoutDashboard,
  Calendar,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Briefcase className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">JobTrackr</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center space-y-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Track your job search in one place
            </h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              Stop losing track of applications. JobTrackr helps you manage every
              opportunity—from first apply to final offer.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base" asChild>
                <Link href="/signup">
                  Create free account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-24">
          <div className="container">
            <h2 className="text-2xl font-semibold text-center mb-12">
              Everything you need for your job hunt
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Pipeline view</h3>
                <p className="text-sm text-muted-foreground">
                  See all your applications in one place. Move them through
                  stages from saved to offered.
                </p>
              </div>
              <div className="rounded-xl border bg-background p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Interviews & reminders</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule interviews and set follow-ups so you never miss a
                  deadline or callback.
                </p>
              </div>
              <div className="rounded-xl border bg-background p-6 shadow-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Simple insights</h3>
                <p className="text-sm text-muted-foreground">
                  Understand how your search is going with a clear view of
                  application and interview stats.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-24">
          <div className="mx-auto max-w-2xl text-center space-y-6">
            <h2 className="text-2xl font-semibold">Ready to get organized?</h2>
            <p className="text-muted-foreground">
              Join JobTrackr and take control of your job search today.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">
                Get started for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} JobTrackr</span>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
