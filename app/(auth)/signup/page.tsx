"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Briefcase, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
        message: "You must accept the terms and conditions",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 33, label: "Weak", color: "bg-destructive" };
    if (score <= 4) return { score: 66, label: "Medium", color: "bg-warning" };
    return { score: 100, label: "Strong", color: "bg-success" };
}

export default function SignupPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "", color: "" });

    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(signupSchema) as any,
        defaultValues: { acceptTerms: false as any },
    });

    const password = watch("password", "");
    const email = watch("email", "");

    useEffect(() => {
        if (password) {
            setPasswordStrength(getPasswordStrength(password));
        } else {
            setPasswordStrength({ score: 0, label: "", color: "" });
        }
    }, [password]);

    useEffect(() => {
        if (!email || !email.includes("@")) {
            setEmailAvailable(null);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setCheckingEmail(true);
            try {
                const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
                const data = await response.json();
                setEmailAvailable(data.available);
            } catch (error) {
                setEmailAvailable(null);
            } finally {
                setCheckingEmail(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [email]);

    const onSubmit = async (data: SignupFormData) => {
        if (!emailAvailable) {
            toast.error("Email not available", {
                description: "This email is already registered. Please use a different email or login.",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error("Signup failed", {
                    description: result.message || "Failed to create account. Please try again.",
                });
                return;
            }

            toast.success("Account created!", {
                description: "Signing you in...",
            });

            const signInResult = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (signInResult?.ok) {
                toast.success("Welcome to JobTrackr!", {
                    description: "Your account has been created successfully.",
                });
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("Something went wrong", {
                description: "An unexpected error occurred. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="hidden lg:flex flex-col justify-center px-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
                <div className="space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary">
                            <Briefcase className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">JobTrackr</h1>
                            <p className="text-muted-foreground">Track your job applications with ease</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold">Start your job search journey</h2>
                            <p className="text-muted-foreground">
                                Join thousands of job seekers who trust JobTrackr to organize their applications.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-medium">Create Your Account</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Sign up in seconds and start tracking your applications
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-medium">Add Your Jobs</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Import or manually add job applications you&apos;re tracking
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-medium">Land Your Dream Job</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Stay organized and never miss an opportunity
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8">
                <Card className="w-full max-w-md border-0 shadow-none lg:border lg:shadow-sm">
                    <CardHeader className="space-y-1">
                        <div className="flex lg:hidden items-center justify-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-primary">
                                <Briefcase className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <span className="text-2xl font-bold">JobTrackr</span>
                        </div>
                        <CardTitle className="text-2xl">Create an account</CardTitle>
                        <CardDescription>Enter your details to get started</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    autoComplete="name"
                                    disabled={isLoading}
                                    {...register("name")}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        disabled={isLoading}
                                        {...register("email")}
                                    />
                                    {checkingEmail && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                    {!checkingEmail && emailAvailable === true && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Check className="h-4 w-4 text-success" />
                                        </div>
                                    )}
                                    {!checkingEmail && emailAvailable === false && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <X className="h-4 w-4 text-destructive" />
                                        </div>
                                    )}
                                </div>
                                {errors.email && (
                                    <p className="text-sm text-destructive">{errors.email.message}</p>
                                )}
                                {!errors.email && emailAvailable === false && (
                                    <p className="text-sm text-destructive">This email is already registered</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        {...register("password")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-destructive">{errors.password.message}</p>
                                )}
                                {password && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-300",
                                                        passwordStrength.score <= 33 && "bg-destructive",
                                                        passwordStrength.score > 33 && passwordStrength.score <= 66 && "bg-warning",
                                                        passwordStrength.score > 66 && "bg-success"
                                                    )}
                                                    style={{ width: `${passwordStrength.score}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium min-w-[60px]">{passwordStrength.label}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div className={/[A-Z]/.test(password) ? "text-success" : ""}>
                                                {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                                            </div>
                                            <div className={/[a-z]/.test(password) ? "text-success" : ""}>
                                                {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                                            </div>
                                            <div className={/[0-9]/.test(password) ? "text-success" : ""}>
                                                {/[0-9]/.test(password) ? "✓" : "○"} One number
                                            </div>
                                            <div className={password.length >= 8 ? "text-success" : ""}>
                                                {password.length >= 8 ? "✓" : "○"} At least 8 characters
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                        {...register("confirmPassword")}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        disabled={isLoading}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                                )}
                            </div>

                            <div className="flex items-start space-x-2">
                                <Controller
                                    name="acceptTerms"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="acceptTerms"
                                            checked={field.value === true}
                                            onCheckedChange={field.onChange}
                                            disabled={isLoading}
                                        />
                                    )}
                                />
                                <Label htmlFor="acceptTerms" className="text-sm font-normal leading-relaxed cursor-pointer">
                                    I accept the{" "}
                                    <Link href="/terms" className="text-primary hover:underline">
                                        terms of service
                                    </Link>{" "}
                                    and{" "}
                                    <Link href="/privacy" className="text-primary hover:underline">
                                        privacy policy
                                    </Link>
                                </Label>
                            </div>
                            {errors.acceptTerms && (
                                <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading || isSubmitting || emailAvailable === false}
                            >
                                {isLoading || isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create account"
                                )}
                            </Button>

                            <p className="text-center text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="text-primary hover:underline font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
