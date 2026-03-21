"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
    Camera,
    Trash2,
    Linkedin,
    Github,
    Globe,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import type { UserProfile } from "../ProfileContent";

// ============================================================================
// Validation
// ============================================================================

const urlField = z
    .string()
    .refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), {
        message: "Enter a valid URL (starting with https://)",
    })
    .optional();

const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().optional(),
    location: z.string().optional(),
    linkedinUrl: urlField,
    githubUrl: urlField,
    portfolioUrl: urlField,
    bio: z
        .string()
        .max(500, "Bio must be under 500 characters")
        .optional(),
});

type FormData = z.infer<typeof schema>;

// ============================================================================
// Avatar helpers
// ============================================================================

async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            const MAX = 256;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.onerror = reject;
        img.src = blobUrl;
    });
}

function getInitials(name?: string | null) {
    if (!name) return "?";
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");
}

// ============================================================================
// Component
// ============================================================================

interface Props {
    user: UserProfile;
    onUpdate: () => void;
}

export function ProfileTab({ user, onUpdate }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image);
    const [avatarChanged, setAvatarChanged] = useState(false);
    const [saving, setSaving] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: user.name ?? "",
            phone: user.phone ?? "",
            location: user.location ?? "",
            linkedinUrl: user.linkedinUrl ?? "",
            githubUrl: user.githubUrl ?? "",
            portfolioUrl: user.portfolioUrl ?? "",
            bio: user.bio ?? "",
        },
    });

    const bioValue = form.watch("bio") ?? "";

    // ── Avatar ─────────────────────────────────────────────────────────────

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Image must be under 2 MB");
            return;
        }
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            toast.error("Only JPG, PNG, or WebP images are supported");
            return;
        }

        try {
            const compressed = await compressImage(file);
            setAvatarPreview(compressed);
            setAvatarChanged(true);
        } catch {
            toast.error("Failed to process image");
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarPreview(null);
        setAvatarChanged(true);
        if (fileRef.current) fileRef.current.value = "";
    };

    // ── Submit ─────────────────────────────────────────────────────────────

    const onSubmit = async (data: FormData) => {
        setSaving(true);
        try {
            const body: Record<string, unknown> = { ...data };
            if (avatarChanged) body.image = avatarPreview; // null = remove

            const res = await fetch("/api/users/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? "Failed to save");
            }

            toast.success("Profile updated successfully");
            setAvatarChanged(false);
            onUpdate();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* ── Avatar ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Profile Photo</CardTitle>
                        <CardDescription>
                            JPG, PNG, or WebP · max 2 MB · displayed at 256 × 256 px
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6">
                            <Avatar className="h-20 w-20 border-2 border-border">
                                <AvatarImage src={avatarPreview ?? undefined} />
                                <AvatarFallback className="text-lg font-semibold bg-primary/10">
                                    {getInitials(form.watch("name") || user.name)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex flex-col gap-2">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileRef.current?.click()}
                                >
                                    <Camera className="h-3.5 w-3.5 mr-2" />
                                    Upload photo
                                </Button>
                                {avatarPreview && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={handleRemoveAvatar}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Basic Info ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Email — read-only */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input value={user.email} disabled className="bg-muted/50 cursor-not-allowed" />
                            <p className="text-xs text-muted-foreground">
                                Email cannot be changed.
                            </p>
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Jane Smith" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 (555) 000-0000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl>
                                            <Input placeholder="San Francisco, CA" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="A short bio about yourself…"
                                            rows={3}
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-right tabular-nums">
                                        {bioValue.length} / 500
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {/* ── Links ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Linkedin className="h-3.5 w-3.5 text-blue-600" />
                                        LinkedIn
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://linkedin.com/in/yourname" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="githubUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Github className="h-3.5 w-3.5" />
                                        GitHub
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://github.com/yourname" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="portfolioUrl"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5" />
                                        Portfolio / Website
                                    </FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://yoursite.dev" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
}
