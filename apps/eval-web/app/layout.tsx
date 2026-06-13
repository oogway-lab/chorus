import type { ReactNode } from "react";

export const metadata = {
    title: "Model Eval",
    description: "Compare models on image/text datasets with cost, latency, and scoring.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
