import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureProfile, getAuthedUser } from "@/lib/auth/server";
import { claudeAccessFor } from "@/lib/oauth/claude-access";
import { oauthConfig } from "@/lib/oauth/config";
import { redirectHostLabel } from "@/lib/oauth/redirects";
import { verifyAuthRequest } from "@/lib/oauth/request";

export const dynamic = "force-dynamic";

/**
 * /connect — the consent page of the Claude sign-in.
 *
 * Reached from /api/mcp/oauth/authorize with a signed request (`areq`). The middleware sends a
 * signed-out visitor to /login first and brings them back. The page names who is asking (the host
 * the code goes back to, which is the part that cannot be faked), the app's own name and the
 * Sigil account, and says what the connection can do. The answer is a plain form post to
 * /api/mcp/oauth/decision. This page only reads.
 */

const mono: CSSProperties = { fontFamily: "var(--font-mono)" };
const bodyText: CSSProperties = {
  color: "var(--dawn-50)",
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  lineHeight: 1.6,
};
const secondaryButton: CSSProperties = {
  ...mono,
  flex: 1,
  padding: "12px 16px",
  fontSize: "13px",
  color: "var(--dawn-70)",
  background: "transparent",
  border: "1px solid var(--dawn-15)",
  cursor: "pointer",
};

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--void)", padding: "clamp(16px, 4vw, 32px)" }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "var(--surface-0)",
          border: "1px solid var(--dawn-15)",
          padding: "clamp(28px, 5vw, 40px)",
        }}
      >
        <p style={{ ...mono, color: "var(--gold)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "20px" }}>
          ᛭ SIGIL
        </p>
        <h1 style={{ ...mono, color: "var(--dawn)", fontSize: "17px", fontWeight: 600, lineHeight: 1.3, marginBottom: "12px" }}>
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}

/** The signed request of this sign-in, or null once it has expired or been altered. */
function readAuthRequest(areq: string, secret: string | null) {
  return verifyAuthRequest(areq, secret, Math.floor(Date.now() / 1000));
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ areq?: string | string[] }>;
}) {
  const params = await searchParams;
  const areq = typeof params.areq === "string" ? params.areq : "";
  const cfg = oauthConfig();
  const request = readAuthRequest(areq, cfg.secret);

  if (!cfg.enabled || !request) {
    return (
      <Shell title="This sign-in link has expired">
        <p style={bodyText}>
          A sign-in link lasts thirty minutes. Go back to Claude and click Connect on Sigil again.
        </p>
      </Shell>
    );
  }

  const user = await getAuthedUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/connect?areq=${areq}`)}`);
  }
  await ensureProfile(user);
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, isDisabled: true, mcpAccess: true },
  });
  const access = claudeAccessFor(profile);
  const who = redirectHostLabel(request.redirectUri);
  const account = user.email ?? "your Sigil account";

  if (access.state === "refused") {
    return (
      <Shell title="Claude access is turned off for you">
        <p style={{ ...bodyText, marginBottom: "24px" }}>
          You are signed in to Sigil as {account}. An admin has turned Claude access off for this
          account. Ask a Sigil admin if you need it.
        </p>
        <form method="post" action="/api/mcp/oauth/decision">
          <input type="hidden" name="areq" value={areq} />
          <button type="submit" name="decision" value="deny" style={{ ...secondaryButton, width: "100%" }}>
            Back to {who}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell title={`Connect ${who} to Sigil`}>
      <p style={{ ...bodyText, marginBottom: "16px" }}>
        The app calls itself &ldquo;{request.clientName}&rdquo;. It will act in Sigil as{" "}
        <span style={{ color: "var(--dawn)" }}>{account}</span>.
      </p>
      <p style={{ ...bodyText, color: "var(--dawn-70)", marginBottom: "8px" }}>It will be able to:</p>
      <ul style={{ ...bodyText, listStyle: "disc", paddingLeft: "20px", marginBottom: "16px" }}>
        <li>draw images and make videos with your Sigil account</li>
        <li>upload the reference pictures you give it</li>
      </ul>
      <p style={{ ...bodyText, fontSize: "12px", color: "var(--dawn-40)", marginBottom: "24px" }}>
        It never sees an API key: Sigil keeps those. What it makes is saved in your project
        &ldquo;Claude&rdquo; and counts against a daily allowance.
      </p>
      <form method="post" action="/api/mcp/oauth/decision" style={{ display: "flex", gap: "12px" }}>
        <input type="hidden" name="areq" value={areq} />
        <button type="submit" name="decision" value="deny" style={secondaryButton}>
          Cancel
        </button>
        <button
          type="submit"
          name="decision"
          value="allow"
          className="sigil-btn-primary py-3 text-[13px] font-medium tracking-wide normal-case"
          style={{ flex: 1 }}
        >
          Allow
        </button>
      </form>
    </Shell>
  );
}
