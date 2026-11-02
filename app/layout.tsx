import type { Metadata } from "next";
import "./globals.css";
import CustomerSupportChat from "@/components/customer-support-chat";
import StorefrontRuntime from "@/components/storefront-runtime";

export const metadata: Metadata = {
  title: "NEXORA — Everyday, Elevated",
  description: "Discover modern essentials for every day.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><StorefrontRuntime />{children}<CustomerSupportChat /></body></html>;
}
