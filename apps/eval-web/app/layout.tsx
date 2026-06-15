import type { ReactNode } from "react";
import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { AppToaster } from "@/components/layout/toaster";
import "./globals.css";

export const metadata = {
    title: "Model Eval",
    description:
        "Compare OpenAI models on image/text datasets with cost, latency, and scoring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
                    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-6">
                        <Link
                            href="/"
                            className="text-base font-semibold text-neutral-900 hover:no-underline"
                        >
                            Model Eval
                        </Link>
                        <NavLinks />
                    </div>
                </header>
                <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
                <AppToaster />
            </body>
        </html>
    );
}