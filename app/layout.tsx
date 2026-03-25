import type { Metadata } from "next";
import { IBM_Plex_Sans, PT_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { getInitialAuthUser } from "@/lib/auth/get-initial-auth-user";

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
