"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signOut } from "next-auth/react";
import { toast } from "@/lib/toast";
import {
    Eye,
    EyeOff,
    Loader2,
    Download,
    Trash2,
    ShieldCheck,
    FileJson,
    FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import type { UserProfile } from "../ProfileContent";

// ============================================================================
// Password strength
// ============================================================================

function getStrength(pwd: string): { score: number; label: string; color: string } {
    if (!pwd) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels = [
        { label: "Very Weak", color: "bg-red-500" },
        { label: "Weak", color: "bg-orange-500" },
        { label: "Fair", color: "bg-yellow-500" },
        { label: "Strong", color: "bg-blue-500" },
        { label: "Very Strong", color: "bg-green-500" },
        { label: "Excellent", color: "bg-emerald-500" },
    ];
    const level = levels[Math.min(score, levels.length - 1)];
    return { score, ...level };
}

// ============================================================================
// Password form
// ============================================================================

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, "Required"),
        newPassword: z
            .string()
            .min(8, "At least 8 characters")
            .regex(/[A-Z]/, "Must include an uppercase letter")
            .regex(/[0-9]/, "Must include a number"),
        confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type PasswordFormData = z.infer<typeof passwordSchema>;

function PasswordCard() {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const form = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const newPwd = form.watch("newPassword") ?? "";
    const strength = getStrength(newPwd);

    const onSubmit = async (data: PasswordFormData) => {
        setSaving(true);
        try {
            const res = await fetch("/api/users/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Failed to update password");
            }
            toast.success("Password updated successfully");
            form.reset();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update password");
        } finally {
            setSaving(false);
        }
    };

    const PasswordInput = ({
        field,
        show,
        toggle,
        placeholder,
    }: {
        field: React.ComponentProps<"input">;
        show: boolean;
        toggle: () => void;
        placeholder?: string;
    }) => (
        <div className="relative">
            <Input
                {...field}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                className="pr-10"
            />
            <button
                type="button"
                onClick={toggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Change Password
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            field={field}
                                            show={showCurrent}
                                            toggle={() => setShowCurrent(!showCurrent)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            field={field}
                                            show={showNew}
                                            toggle={() => setShowNew(!showNew)}
                                            placeholder="Min. 8 chars, 1 uppercase, 1 number"
                                        />
                                    </FormControl>

                                    {/* Strength meter */}
                                    {newPwd.length > 0 && (
                                        <div className="space-y-1">
                                            <Progress
                                                value={(strength.score / 5) * 100}
                                                className={`h-1.5 [&>div]:${strength.color}`}
                                            />
                                            <p className={`text-xs font-medium`}>
                                                {strength.label}
                                            </p>
                                        </div>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            field={field}
                                            show={showConfirm}
                                            toggle={() => setShowConfirm(!showConfirm)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Export Card
// ============================================================================

function ExportCard() {
    const [exporting, setExporting] = useState<"json" | "csv" | null>(null);

    const triggerDownload = async (format: "json" | "csv") => {
        setExporting(format);
        try {
            const res = await fetch(`/api/users/export?format=${format}`);
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const cd = res.headers.get("Content-Disposition") ?? "";
            const match = cd.match(/filename="(.+?)"/);
            a.download = match?.[1] ?? `export.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Export downloaded");
        } catch {
            toast.error("Export failed. Please try again.");
        } finally {
            setExporting(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Data
                </CardTitle>
                <CardDescription>
                    Download a copy of all your JobTrackr data.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button
                    variant="outline"
                    onClick={() => triggerDownload("json")}
                    disabled={exporting !== null}
                    className="gap-2"
                >
                    {exporting === "json"
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <FileJson className="h-4 w-4" />}
                    Export as JSON
                </Button>

                <Button
                    variant="outline"
                    onClick={() => triggerDownload("csv")}
                    disabled={exporting !== null}
                    className="gap-2"
                >
                    {exporting === "csv"
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <FileSpreadsheet className="h-4 w-4" />}
                    Export Applications as CSV
                </Button>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Delete Account Card
// ============================================================================

function DeleteAccountCard() {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const reset = () => {
        setConfirmText("");
        setPassword("");
        setShowPassword(false);
    };

    const canConfirm = confirmText === "DELETE" && password.length > 0;

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch("/api/users/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "DELETE", password }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Deletion failed");
            }
            toast.success("Account deleted. Signing out…");
            await signOut({ callbackUrl: "/login" });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete account");
            setDeleting(false);
        }
    };

    return (
        <Card className="border-destructive/40">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                </CardTitle>
                <CardDescription>
                    Permanently delete your account and all associated data. This action
                    cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete My Account
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-4 mt-1">
                                    <p className="text-sm">
                                        This will permanently delete your account along with{" "}
                                        <strong>all applications, jobs, interviews, referrals,
                                        and skills</strong>. There is no recovery.
                                    </p>

                                    {/* Confirmation text */}
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-medium text-foreground">
                                            Type{" "}
                                            <code className="bg-muted px-1 py-0.5 rounded text-destructive">
                                                DELETE
                                            </code>{" "}
                                            to confirm:
                                        </p>
                                        <Input
                                            value={confirmText}
                                            onChange={(e) => setConfirmText(e.target.value)}
                                            placeholder="DELETE"
                                            className="font-mono"
                                            autoComplete="off"
                                        />
                                    </div>

                                    {/* Password re-verification */}
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-medium text-foreground">
                                            Enter your password:
                                        </p>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Your current password"
                                                className="pr-10"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPassword
                                                    ? <EyeOff className="h-4 w-4" />
                                                    : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={reset}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={!canConfirm || deleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                            >
                                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Delete Account
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main
// ============================================================================

interface Props {
    user: UserProfile;
}

export function AccountTab({ user: _ }: Props) {
    return (
        <div className="space-y-6">
            <PasswordCard />
            <Separator />
            <ExportCard />
            <Separator />
            <DeleteAccountCard />
        </div>
    );
}
