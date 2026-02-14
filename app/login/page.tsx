import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { NavigationFrame } from "@/components/hud/NavigationFrame";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <NavigationFrame title="SIGIL" modeLabel="authentication">
      <section className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-6">
        <AuthForm mode="login" nextPath={next || "/projects"} />
        <p className="text-sm text-[var(--dawn-50)]">
          Need an account?{" "}
          <Link href="/signup" className="text-[var(--gold)] underline-offset-2 hover:underline">
            Sign up
          </Link>
        </p>
      </section>
    </NavigationFrame>
  );
}
