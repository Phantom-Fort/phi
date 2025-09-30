import type { Metadata } from "next";
import './globals.css";
import Navbar from "@/app/components/NavBar";

export const metadata: Metadata = {
  title: "PHI Scanner",
  description: "Healthcare PHI Data Exposure Scanner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
