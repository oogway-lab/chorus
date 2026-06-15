import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-neutral-100 text-neutral-800",
                success:
                    "border-transparent bg-success-muted text-success",
                warning:
                    "border-transparent bg-ref-muted text-ref",
                danger: "border-transparent bg-danger-muted text-danger",
                outline: "border-border text-neutral-700",
                ref: "border-transparent bg-ref-muted text-ref font-semibold",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}