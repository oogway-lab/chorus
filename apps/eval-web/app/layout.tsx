import type { ReactNode } from "react";
import Link from "next/link";
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
                <nav>
                    <span className="brand">Model Eval</span>
                    <Link href="/datasets">Datasets</Link>
                    <Link href="/prompts">Prompts</Link>
                    <Link href="/runs">Runs</Link>
                </nav>
                <main>{children}</main>
            </body>
        </html>
    );
}
