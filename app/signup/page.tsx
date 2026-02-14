import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { NavigationFrame } from "@/components/hud/NavigationFrame";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { next } = await searchParams;

  return (
    <NavigationFrame title="SIGIL" modeLabel="authentication">
      <section className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-6">
        <AuthForm mode="signup" nextPath={next || "/projects"} />
        <p className="text-sm text-[var(--dawn-50)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--gold)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </NavigationFrame>
  );
}
