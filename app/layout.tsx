import type { Metadata } from "next";
import { IBM_Plex_Sans, PT_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider, type InitialAuthUser } from "@/context/AuthContext";
import { getAuthedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ptMono = PT_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Sigil",
  description: "Thoughtform Atlas-branded image and video generation platform",
};

async function getInitialAuthUser(): Promise<InitialAuthUser | null> {
  try {
    const user = await getAuthedUser();
    if (!user) return null;
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    return {
      id: user.id,
      email: user.email,
      role: (profile?.role as "admin" | "user") ?? "user",
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialUser = await getInitialAuthUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://hrgxfbyrumeyftqrlehv.supabase.co" />
        <link rel="preconnect" href="https://replicate.delivery" />
        <link rel="dns-prefetch" href="https://hrgxfbyrumeyftqrlehv.supabase.co" />
        <link rel="dns-prefetch" href="https://replicate.delivery" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem('sigil-theme') === 'light') document.documentElement.classList.add('light'); } catch(e) {}`,
          }}
        />
      </head>
      <body className={`${ibmPlexSans.variable} ${ptMono.variable} antialiased`}>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </body>
    </html>
  );
}
