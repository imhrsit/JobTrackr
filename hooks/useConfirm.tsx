"use client";

import { useState, useCallback, useRef } from "react";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options passed to the imperative `confirm()` call.
 * `onConfirm` is optional — you can also act on the resolved Promise value.
 */
export type ConfirmOptions = Omit<ConfirmDialogProps, "open" | "onOpenChange"> & {
    onConfirm?: () => void | Promise<void>;
};

type DialogState = Omit<ConfirmDialogProps, "open" | "onOpenChange">;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Imperative confirm dialog — call `confirm(options)` anywhere in a component
 * and await the result instead of wiring up open/onConfirm state manually.
 *
 * **Setup:** render `ConfirmDialogNode` once inside the component (or a parent):
 *
 * ```tsx
 * const { confirm, ConfirmDialogNode } = useConfirm();
 *
 * return (
 *   <>
 *     {ConfirmDialogNode}
 *     <Button
 *       onClick={async () => {
 *         const ok = await confirm({
 *           title: "Delete application?",
 *           description: "This cannot be undone.",
 *           confirmText: "Delete",
 *           variant: "destructive",
 *         });
 *         if (ok) await deleteApplication(id);
 *       }}
 *     >
 *       Delete
 *     </Button>
 *   </>
 * );
 * ```
 *
 * **Promise semantics:**
 * - Resolves `true`  — user confirmed (and `onConfirm`, if provided, succeeded)
 * - Resolves `false` — user cancelled or dismissed
 * - Never rejects    — errors from `onConfirm` are caught, shown as a toast, and
 *                      the dialog stays open so the user can retry or cancel.
 */
export function useConfirm() {
    const resolveRef = useRef<((value: boolean) => void) | null>(null);
    const [open, setOpen] = useState(false);
    const [dialogState, setDialogState] = useState<DialogState>({
        title: "",
        description: "",
        onConfirm: () => {},
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;

            // Separate caller's onConfirm from the rest of the options so we
            // can wrap it with the Promise resolver.
            const { onConfirm: callerOnConfirm, ...rest } = options;

            setDialogState({
                // Default required field when caller doesn't pass onConfirm.
                onConfirm: async () => {
                    await callerOnConfirm?.();
                    // Only reached if callerOnConfirm didn't throw.
                    // Errors propagate to ConfirmDialog's catch → toast + dialog stays open.
                    resolveRef.current?.(true);
                    resolveRef.current = null;
                },
                ...rest,
            });

            setOpen(true);
        });
    }, []);

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        // User cancelled (closed without confirming).
        if (!nextOpen && resolveRef.current) {
            resolveRef.current(false);
            resolveRef.current = null;
        }
        setOpen(nextOpen);
    }, []);

    const ConfirmDialogNode = (
        <ConfirmDialog
            {...dialogState}
            open={open}
            onOpenChange={handleOpenChange}
        />
    );

    return { confirm, ConfirmDialogNode } as const;
}
