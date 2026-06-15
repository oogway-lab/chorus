"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

const links = [
    { href: "/datasets", label: "Datasets" },
    { href: "/prompts", label: "Prompts" },
    { href: "/runs", label: "Runs" },
];

export function NavLinks() {
    const pathname = usePathname();

    return (
        <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
                {links.map((link) => {
                    const active =
                        pathname === link.href ||
                        pathname.startsWith(`${link.href}/`);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                active
                                    ? "bg-neutral-100 text-neutral-900"
                                    : "text-muted hover:bg-neutral-50 hover:text-neutral-900",
                            )}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
            <Button asChild size="sm">
                <Link href="/runs/new">+ New run</Link>
            </Button>
        </div>
    );
}