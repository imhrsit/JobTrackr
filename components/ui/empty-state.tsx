"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
    Briefcase,
    Calendar,
    Users,
    Search,
    Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface EmptyStateAction {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost";
}

export interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
    illustration?: ReactNode;
    className?: string;
}

// ============================================================================
// Base EmptyState
// ============================================================================

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    illustration,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center px-4 py-12 animate-in fade-in duration-500",
                "max-w-md mx-auto",
                className
            )}
        >
            {illustration ?? (
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                </div>
            )}

            <h3 className="text-lg font-semibold mt-2">{title}</h3>

            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
                {description}
            </p>

            {(action || secondaryAction) && (
                <div className="flex items-center gap-3 mt-5">
                    {action && (
                        <Button
                            variant={action.variant ?? "default"}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant={secondaryAction.variant ?? "outline"}
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Pre-configured Variants
// ============================================================================

type VariantProps = Partial<EmptyStateProps> & {
    onAction?: () => void;
};

export function NoApplicationsYet({ onAction, ...props }: VariantProps) {
    return (
        <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Start tracking your job applications by adding your first job"
            action={
                onAction
                    ? { label: "Add Your First Job", onClick: onAction }
                    : undefined
            }
            {...props}
        />
    );
}

export function NoInterviews({ onAction, ...props }: VariantProps) {
    return (
        <EmptyState
            icon={Calendar}
            title="No interviews scheduled"
            description="Your upcoming interviews will appear here"
            action={
                onAction
                    ? { label: "Schedule Interview", onClick: onAction }
                    : undefined
            }
            {...props}
        />
    );
}

export function NoReferrals({ onAction, ...props }: VariantProps) {
    return (
        <EmptyState
            icon={Users}
            title="No referrals requested"
            description="Track your referral requests to stay organized"
            action={
                onAction ? { label: "Add Referral", onClick: onAction } : undefined
            }
            {...props}
        />
    );
}

export function NoResults({ onAction, ...props }: VariantProps) {
    return (
        <EmptyState
            icon={Search}
            title="No results found"
            description="Try adjusting your filters or search terms"
            action={
                onAction
                    ? { label: "Clear Filters", onClick: onAction, variant: "outline" }
                    : undefined
            }
            {...props}
        />
    );
}

export function NoSkillsMatched({ onAction, ...props }: VariantProps) {
    return (
        <EmptyState
            icon={Target}
            title="Add your skills"
            description="Complete your skill profile to see match analysis"
            action={
                onAction ? { label: "Add Skills", onClick: onAction } : undefined
            }
            {...props}
        />
    );
}
