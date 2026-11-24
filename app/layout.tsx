import type { Metadata } from "next";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"], display: "swap", variable: "--font-poppins" });
import "./globals.css";
import "./storefront-polish.css";
import "./admin/admin-tailwind.css";
import CustomerSupportChat from "@/components/customer-support-chat";
import StorefrontRuntime from "@/components/storefront-runtime";
import ToastProvider from "@/components/toast-provider";
import { NexoraCursor } from "@/components/nexora-interactions";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "NEXORA — Everyday, Elevated",
  description: "Discover modern essentials for every day.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={poppins.className}><ToastProvider/><StorefrontRuntime /><NexoraCursor />{children}<CustomerSupportChat /></body></html>;
}
