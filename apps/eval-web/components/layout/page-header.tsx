import Link from "next/link";

export function PageHeader({
    title,
    description,
    breadcrumbs,
    action,
}: {
    title: string;
    description?: string;
    breadcrumbs?: { label: string; href?: string }[];
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="mb-2 flex items-center gap-1 text-sm text-muted">
                        {breadcrumbs.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && (
                                    <span className="text-muted" aria-hidden>
                                        /
                                    </span>
                                )}
                                {crumb.href ? (
                                    <Link
                                        href={crumb.href}
                                        className="hover:text-primary hover:underline"
                                    >
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-neutral-700">{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-muted">{description}</p>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}