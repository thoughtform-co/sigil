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
      <section className="flex min-h-[80vh] flex-col items-center justify-center gap-8">
        <AuthForm mode="login" nextPath={next || "/projects"} />
        <p
          className="animate-fade-in"
          style={{
            animationDelay: "0.3s",
            fontFamily: "var(--font-sans)",
            fontSize: "12px",
            color: "var(--dawn-40)",
          }}
        >
          Need an account?{" "}
          <Link
            href="/signup"
            style={{
              color: "var(--gold)",
              textDecoration: "none",
              borderBottom: "1px solid var(--gold-30)",
              paddingBottom: "1px",
              transition: "border-color var(--duration-fast) ease",
            }}
          >
            Sign up
          </Link>
        </p>
      </section>
    </NavigationFrame>
  );
}
