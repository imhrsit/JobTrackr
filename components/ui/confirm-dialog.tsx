"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    /** "destructive" tints the confirm button red and adds a warning icon. */
    variant?: "default" | "destructive";
    onConfirm: () => void | Promise<void>;
    /** When true, the user must type `confirmationWord` before confirming. */
    requiresTyping?: boolean;
    /** The exact word the user must type. Defaults to "DELETE". */
    confirmationWord?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
    onConfirm,
    requiresTyping = false,
    confirmationWord = "DELETE",
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [typedWord, setTypedWord] = useState("");

    // Reset the typed word whenever the dialog closes.
    useEffect(() => {
        if (!open) setTypedWord("");
    }, [open]);

    const canConfirm = !requiresTyping || typedWord === confirmationWord;
    const typedMismatch = requiresTyping && typedWord.length > 0 && typedWord !== confirmationWord;

    const handleConfirm = async () => {
        if (!canConfirm || isLoading) return;

        setIsLoading(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            toast.error(
                "Action failed",
                error instanceof Error ? error.message : "Please try again"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                // Block dismiss while an async action is running.
                if (!next && isLoading) return;
                onOpenChange(next);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {variant === "destructive" && (
                            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                        )}
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>

                {/* Typing confirmation gate */}
                {requiresTyping && (
                    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
                        <p className="text-sm text-foreground">
                            Type{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-destructive">
                                {confirmationWord}
                            </code>{" "}
                            to confirm:
                        </p>
                        <Input
                            value={typedWord}
                            onChange={(e) => setTypedWord(e.target.value)}
                            placeholder={confirmationWord}
                            autoComplete="off"
                            disabled={isLoading}
                            className={cn(
                                "font-mono",
                                typedMismatch &&
                                    "border-destructive focus-visible:ring-destructive"
                            )}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && canConfirm && !isLoading) {
                                    handleConfirm();
                                }
                            }}
                        />
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        {cancelText}
                    </AlertDialogCancel>

                    {/*
                     * Use Button (not AlertDialogAction) so we control when the
                     * dialog closes — AlertDialogAction always closes on click,
                     * which would interrupt async confirmation.
                     */}
                    <Button
                        variant={variant}
                        onClick={handleConfirm}
                        disabled={isLoading || !canConfirm}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading…
                            </>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
