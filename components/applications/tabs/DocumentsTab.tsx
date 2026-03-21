"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
    FileText,
    FileEdit,
    Upload,
    Download,
    Eye,
    Save,
    Loader2,
    Link as LinkIcon,
    Github,
    Linkedin,
    Globe,
    Paperclip,
    Info,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    History,
    Sparkles,
    Type,
    Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================================================
// Types
// ============================================================================

interface ApplicationData {
    id: string;
    resumeVersion: string | null;
    coverLetter: string | null;
    notes: string | null;
    job: {
        title: string;
        company: string;
        jobUrl: string | null;
    };
}

interface AdditionalDocs {
    portfolioUrl?: string;
    githubUrl?: string;
    linkedinUrl?: string;
    otherLinks?: { label: string; url: string }[];
}

interface DocumentsTabProps {
    applicationId: string;
    application: ApplicationData;
}

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDERS: Record<string, string> = {
    "{{company}}": "company",
    "{{role}}": "title",
    "{{name}}": "name",
};

const AUTOSAVE_INTERVAL = 30_000; // 30 seconds

// ============================================================================
// Main Component
// ============================================================================

export function DocumentsTab({ applicationId, application }: DocumentsTabProps) {
    const queryClient = useQueryClient();

    // ---- Resume state ----
    const [resumeVersion, setResumeVersion] = useState(
        application.resumeVersion ?? ""
    );
    const [isResumeEditing, setIsResumeEditing] = useState(false);
    const [resumeHistoryOpen, setResumeHistoryOpen] = useState(false);

    // ---- Cover letter state ----
    const [hasCoverLetter, setHasCoverLetter] = useState(
        !!application.coverLetter
    );
    const [coverLetterText, setCoverLetterText] = useState(
        application.coverLetter ?? ""
    );
    const [isCoverLetterEditing, setIsCoverLetterEditing] = useState(false);
    const lastSavedCoverLetter = useRef(application.coverLetter ?? "");
    const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

    // ---- Additional docs state ----
    const [additionalDocs, setAdditionalDocs] = useState<AdditionalDocs>(() => {
        // For now stored in notes or we initialize empty
        return {
            portfolioUrl: "",
            githubUrl: "",
            linkedinUrl: "",
            otherLinks: [],
        };
    });
    const [isLinksEditing, setIsLinksEditing] = useState(false);

    // ---- Sync from props ----
    useEffect(() => {
        setResumeVersion(application.resumeVersion ?? "");
        setCoverLetterText(application.coverLetter ?? "");
        setHasCoverLetter(!!application.coverLetter);
        lastSavedCoverLetter.current = application.coverLetter ?? "";
    }, [application.resumeVersion, application.coverLetter]);

    // ---- PATCH mutation ----
    const updateMutation = useMutation({
        mutationFn: async (data: {
            resumeVersion?: string | null;
            coverLetter?: string | null;
        }) => {
            const res = await fetch(`/api/applications/${applicationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["application-detail", applicationId],
            });
            if (variables.resumeVersion !== undefined) {
                toast.success("Resume version updated");
            }
            if (variables.coverLetter !== undefined) {
                toast.success("Cover letter saved");
                lastSavedCoverLetter.current = variables.coverLetter ?? "";
            }
        },
        onError: () => toast.error("Failed to save changes"),
    });

    // ---- Resume handlers ----
    const handleResumeSave = () => {
        updateMutation.mutate({ resumeVersion: resumeVersion || null });
        setIsResumeEditing(false);
    };

    const handleResumeCancel = () => {
        setResumeVersion(application.resumeVersion ?? "");
        setIsResumeEditing(false);
    };

    // ---- Cover letter handlers ----
    const handleCoverLetterSave = useCallback(() => {
        const text = hasCoverLetter ? coverLetterText : null;
        updateMutation.mutate({ coverLetter: text });
        setIsCoverLetterEditing(false);
    }, [hasCoverLetter, coverLetterText, updateMutation]);

    const handleCoverLetterCancel = () => {
        setCoverLetterText(application.coverLetter ?? "");
        setHasCoverLetter(!!application.coverLetter);
        setIsCoverLetterEditing(false);
    };

    const handleToggleCoverLetter = (checked: boolean) => {
        setHasCoverLetter(checked);
        if (!checked) {
            updateMutation.mutate({ coverLetter: null });
        } else {
            setIsCoverLetterEditing(true);
        }
    };

    // ---- Placeholder replacement ----
    const replacePlaceholders = (text: string) => {
        let result = text;
        result = result.replace(
            /\{\{company\}\}/g,
            application.job.company
        );
        result = result.replace(
            /\{\{role\}\}/g,
            application.job.title
        );
        result = result.replace(/\{\{name\}\}/g, "Your Name");
        return result;
    };

    const insertPlaceholder = (placeholder: string) => {
        setCoverLetterText((prev) => prev + placeholder);
    };

    // ---- Autosave for cover letter ----
    useEffect(() => {
        if (!isCoverLetterEditing) {
            if (autosaveTimerRef.current) {
                clearInterval(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
            return;
        }

        autosaveTimerRef.current = setInterval(() => {
            if (coverLetterText !== lastSavedCoverLetter.current && coverLetterText.trim()) {
                updateMutation.mutate({ coverLetter: coverLetterText });
                lastSavedCoverLetter.current = coverLetterText;
                setLastAutoSaved(new Date());
            }
        }, AUTOSAVE_INTERVAL);

        return () => {
            if (autosaveTimerRef.current) {
                clearInterval(autosaveTimerRef.current);
            }
        };
    }, [isCoverLetterEditing, coverLetterText, updateMutation]);

    // ---- Character count ----
    const charCount = coverLetterText.length;
    const wordCount = coverLetterText.trim()
        ? coverLetterText.trim().split(/\s+/).length
        : 0;

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* ================================================================
                RESUME SECTION
            ================================================================ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-base">Resume</CardTitle>
                        </div>
                        {!isResumeEditing && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsResumeEditing(true)}
                            >
                                <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                                Update
                            </Button>
                        )}
                    </div>
                    <CardDescription>
                        Track which resume version you used for this application
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isResumeEditing ? (
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="resume-version" className="text-sm font-medium">
                                    Version Name
                                </Label>
                                <Input
                                    id="resume-version"
                                    placeholder='e.g., "Software Engineer - v2", "Data Analyst"'
                                    value={resumeVersion}
                                    onChange={(e) => setResumeVersion(e.target.value)}
                                    className="mt-1.5"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Give your resume a descriptive name to track versions
                                </p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResumeCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleResumeSave}
                                    disabled={updateMutation.isPending}
                                >
                                    {updateMutation.isPending && (
                                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                    )}
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resumeVersion ? (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {resumeVersion}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Current version for this application
                                        </p>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-700 hover:bg-blue-100"
                                    >
                                        Active
                                    </Badge>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No resume version set for this application
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                        Click &quot;Update&quot; to add a resume version name
                                    </p>
                                </div>
                            )}

                            {/* Version History (expandable, placeholder for now) */}
                            <Collapsible
                                open={resumeHistoryOpen}
                                onOpenChange={setResumeHistoryOpen}
                            >
                                <CollapsibleTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-between text-muted-foreground"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <History className="h-3.5 w-3.5" />
                                            Version History
                                        </span>
                                        {resumeHistoryOpen ? (
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="mt-2 rounded-lg border bg-muted/20 p-4">
                                        <p className="text-xs text-muted-foreground italic text-center">
                                            Version history will be available in a future update.
                                            <br />
                                            Currently tracking: {resumeVersion || "No version set"}
                                        </p>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================================================================
                COVER LETTER SECTION
            ================================================================ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileEdit className="h-5 w-5 text-amber-600" />
                            <CardTitle className="text-base">Cover Letter</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label
                                    htmlFor="cover-letter-toggle"
                                    className="text-xs text-muted-foreground"
                                >
                                    Used cover letter
                                </Label>
                                <Switch
                                    id="cover-letter-toggle"
                                    checked={hasCoverLetter}
                                    onCheckedChange={handleToggleCoverLetter}
                                />
                            </div>
                        </div>
                    </div>
                    <CardDescription>
                        Write and manage the cover letter for this application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {hasCoverLetter ? (
                        <div className="space-y-3">
                            {/* Placeholder buttons */}
                            {isCoverLetterEditing && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Sparkles className="h-3 w-3" />
                                                    Insert:
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">
                                                    Click to insert a placeholder that auto-fills
                                                    with job data
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    {Object.keys(PLACEHOLDERS).map((ph) => (
                                        <Button
                                            key={ph}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => insertPlaceholder(ph)}
                                        >
                                            {ph}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* Editor */}
                            {isCoverLetterEditing ? (
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder={`Dear Hiring Manager at {{company}},\n\nI am writing to express my interest in the {{role}} position...`}
                                        value={coverLetterText}
                                        onChange={(e) =>
                                            setCoverLetterText(e.target.value)
                                        }
                                        className="min-h-[250px] resize-y font-mono text-sm leading-relaxed"
                                    />
                                    {/* Stats row */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Type className="h-3 w-3" />
                                                {charCount} chars
                                            </span>
                                            <span>{wordCount} words</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {lastAutoSaved && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <Clock className="h-3 w-3" />
                                                    Auto-saved{" "}
                                                    {lastAutoSaved.toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground/60">
                                                Auto-saves every 30s
                                            </span>
                                        </div>
                                    </div>
                                    {/* Actions */}
                                    <div className="flex justify-end gap-2 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCoverLetterCancel}
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" />
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleCoverLetterSave}
                                            disabled={updateMutation.isPending}
                                        >
                                            {updateMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                            ) : (
                                                <Save className="h-3.5 w-3.5 mr-1.5" />
                                            )}
                                            Save
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {coverLetterText ? (
                                        <>
                                            <div className="rounded-lg border bg-muted/20 p-4">
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                    {replacePlaceholders(
                                                        coverLetterText
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {charCount} characters ·{" "}
                                                    {wordCount} words
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setIsCoverLetterEditing(
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <FileEdit className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                No cover letter written yet
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-3"
                                                onClick={() =>
                                                    setIsCoverLetterEditing(true)
                                                }
                                            >
                                                <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                                                Write Cover Letter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                            <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-sm text-muted-foreground">
                                No cover letter for this application
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                                Toggle &quot;Used cover letter&quot; to add one
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================================================================
                ADDITIONAL DOCUMENTS / LINKS SECTION
            ================================================================ */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5 text-green-600" />
                            <CardTitle className="text-base">
                                Additional Links & Documents
                            </CardTitle>
                        </div>
                        {!isLinksEditing && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsLinksEditing(true)}
                            >
                                <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                                Edit
                            </Button>
                        )}
                    </div>
                    <CardDescription>
                        Portfolio, GitHub, LinkedIn, and other relevant links for
                        this application
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLinksEditing ? (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <Globe className="h-3.5 w-3.5 text-blue-600" />
                                        Portfolio URL
                                    </Label>
                                    <Input
                                        placeholder="https://yourportfolio.com"
                                        value={additionalDocs.portfolioUrl ?? ""}
                                        onChange={(e) =>
                                            setAdditionalDocs((prev) => ({
                                                ...prev,
                                                portfolioUrl: e.target.value,
                                            }))
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <Github className="h-3.5 w-3.5" />
                                        GitHub URL
                                    </Label>
                                    <Input
                                        placeholder="https://github.com/username"
                                        value={additionalDocs.githubUrl ?? ""}
                                        onChange={(e) =>
                                            setAdditionalDocs((prev) => ({
                                                ...prev,
                                                githubUrl: e.target.value,
                                            }))
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium flex items-center gap-1.5">
                                        <Linkedin className="h-3.5 w-3.5 text-blue-700" />
                                        LinkedIn URL
                                    </Label>
                                    <Input
                                        placeholder="https://linkedin.com/in/username"
                                        value={additionalDocs.linkedinUrl ?? ""}
                                        onChange={(e) =>
                                            setAdditionalDocs((prev) => ({
                                                ...prev,
                                                linkedinUrl: e.target.value,
                                            }))
                                        }
                                        className="mt-1.5"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsLinksEditing(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        // Future: save these to a JSON field
                                        toast.success("Links saved locally");
                                        setIsLinksEditing(false);
                                    }}
                                >
                                    <Save className="h-3.5 w-3.5 mr-1.5" />
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {additionalDocs.portfolioUrl ||
                            additionalDocs.githubUrl ||
                            additionalDocs.linkedinUrl ? (
                                <div className="space-y-2">
                                    {additionalDocs.portfolioUrl && (
                                        <LinkRow
                                            icon={
                                                <Globe className="h-4 w-4 text-blue-600" />
                                            }
                                            label="Portfolio"
                                            url={additionalDocs.portfolioUrl}
                                        />
                                    )}
                                    {additionalDocs.githubUrl && (
                                        <LinkRow
                                            icon={
                                                <Github className="h-4 w-4" />
                                            }
                                            label="GitHub"
                                            url={additionalDocs.githubUrl}
                                        />
                                    )}
                                    {additionalDocs.linkedinUrl && (
                                        <LinkRow
                                            icon={
                                                <Linkedin className="h-4 w-4 text-blue-700" />
                                            }
                                            label="LinkedIn"
                                            url={additionalDocs.linkedinUrl}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <LinkIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        No additional links added
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                        Add your portfolio, GitHub, or LinkedIn
                                        links
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================================================================
                FUTURE FEATURES NOTE
            ================================================================ */}
            <div className="rounded-lg border border-dashed p-4 bg-muted/20">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Coming Soon
                        </p>
                        <ul className="text-xs text-muted-foreground/80 mt-1 space-y-0.5">
                            <li>• File uploads (resume PDF, cover letter files)</li>
                            <li>• PDF preview and version comparison</li>
                            <li>• Cover letter templates by job type</li>
                            <li>• AI-powered cover letter suggestions</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

function LinkRow({
    icon,
    label,
    url,
}: {
    icon: React.ReactNode;
    label: string;
    url: string;
}) {
    return (
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
            {icon}
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate block"
                >
                    {url}
                </a>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" />
                </a>
            </Button>
        </div>
    );
}
