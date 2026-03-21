/**
 * Toast notification utility — thin, typed wrapper around Sonner.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *
 *   toast.success("Status updated", "Moved to Interviewing");
 *   toast.error("Failed to save", { description: err.message });
 *   toast.promise(mutation, { loading: "Saving…", success: "Saved!", error: "Failed" });
 */

import { toast as sonner, type ExternalToast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastOptions = ExternalToast;

/** Second-arg overload: bare string = description shorthand, object = full options. */
type DescriptionOrOptions = string | ToastOptions | undefined;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toOptions(arg: DescriptionOrOptions): ToastOptions | undefined {
    if (typeof arg === "string") return { description: arg };
    return arg;
}

// ─── Toast utility ────────────────────────────────────────────────────────────

export const toast = {
    /** Green success toast. */
    success(message: string, descriptionOrOptions?: DescriptionOrOptions) {
        return sonner.success(message, toOptions(descriptionOrOptions));
    },

    /** Red error toast. */
    error(message: string, descriptionOrOptions?: DescriptionOrOptions) {
        return sonner.error(message, toOptions(descriptionOrOptions));
    },

    /** Blue informational toast. */
    info(message: string, descriptionOrOptions?: DescriptionOrOptions) {
        return sonner.info(message, toOptions(descriptionOrOptions));
    },

    /** Amber warning toast. */
    warning(message: string, descriptionOrOptions?: DescriptionOrOptions) {
        return sonner.warning(message, toOptions(descriptionOrOptions));
    },

    /**
     * Loading spinner toast. Returns a toast ID you can pass to toast.dismiss()
     * or use as the `id` option in a follow-up toast to replace it.
     */
    loading(message: string, options?: ToastOptions) {
        return sonner.loading(message, options);
    },

    /**
     * Tracks a Promise — shows loading, then success or error.
     *
     * @example
     * toast.promise(saveJob(), {
     *   loading: "Saving…",
     *   success: "Job saved!",
     *   error:   "Failed to save job",
     * });
     */
    promise<T>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((err: unknown) => string);
        },
        options?: ToastOptions
    ) {
        return sonner.promise(promise, { ...messages, ...options });
    },

    /** Dismiss a specific toast by ID, or all toasts if no ID given. */
    dismiss(id?: string | number) {
        return sonner.dismiss(id);
    },
} as const;

// ─── Pre-defined message catalogue ───────────────────────────────────────────
//
// Use these for consistent copy across the app.
// e.g.  toast.success(...toastMessages.application.added("SWE", "Stripe"))
//       toast.error(toastMessages.auth.invalidCredentials.message,
//                   toastMessages.auth.invalidCredentials.description)

export const toastMessages = {
    application: {
        added: (title: string, company: string) => ({
            message: `${title} at ${company} added`,
            description: "You can now track this application",
        }),
        statusUpdated: (status: string) => ({
            message: "Status updated",
            description: `Moved to ${status}`,
        }),
        deleted:      { message: "Application deleted" },
        deleteError:  { message: "Failed to delete application" },
        notesSaved:   { message: "Notes saved" },
        notesError:   { message: "Failed to save notes" },
        updateError:  { message: "Failed to update application" },
    },

    referral: {
        added: (contactName: string) => ({
            message: "Referral request added",
            description: `Tracking request to ${contactName}`,
        }),
        updated:      { message: "Referral status updated" },
        deleted:      { message: "Referral deleted" },
        saveError:    { message: "Failed to save referral" },
        deleteError:  { message: "Failed to delete referral" },
    },

    interview: {
        scheduled: (dateTime: string) => ({
            message: "Interview scheduled",
            description: dateTime,
        }),
        completed:    { message: "Interview marked as completed" },
        cancelled:    { message: "Interview cancelled" },
        saveError:    { message: "Failed to save interview" },
        updateError:  { message: "Failed to update interview" },
    },

    auth: {
        signedIn:     { message: "Welcome back!" },
        signedOut:    { message: "Signed out successfully" },
        signedUp: (name: string) => ({
            message: "Account created!",
            description: `Welcome to JobTrackr, ${name}!`,
        }),
        invalidCredentials: {
            message: "Invalid credentials",
            description: "Please check your email and password",
        },
        signOutError: { message: "Failed to sign out" },
    },
} as const;
