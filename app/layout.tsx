import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: { default: "SG Clima · Gestione preventivi", template: "%s · SG Clima" },
  description: "Gestionale locale SG Clima per clienti, prodotti e preventivi",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body><AppShell>{children}</AppShell></body></html>; }
