"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Search,
    Plus,
    Loader2,
    Target,
    TrendingUp,
    BookOpen,
    Sparkles,
    Filter,
    ChevronDown,
    Award,
    Zap,
    Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProficiencyLevel } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface Skill {
    id: string;
    name: string;
    category: string | null;
}

interface JobSkill {
    jobId: string;
    skillId: string;
    isRequired: boolean;
    skill: Skill;
}

interface UserSkill {
    id: string;
    proficiencyLevel: ProficiencyLevel;
    skill: Skill;
}

interface SkillsTabProps {
    applicationId: string;
    jobSkills: JobSkill[];
}

type SkillFilter = "all" | "matched" | "missing";

// ============================================================================
// Constants
// ============================================================================

const PROFICIENCY_CONFIG: Record<
    ProficiencyLevel,
    { label: string; color: string; bg: string; level: number }
> = {
    BEGINNER: {
        label: "Beginner",
        color: "text-slate-700",
        bg: "bg-slate-100",
        level: 1,
    },
    INTERMEDIATE: {
        label: "Intermediate",
        color: "text-blue-700",
        bg: "bg-blue-100",
        level: 2,
    },
    ADVANCED: {
        label: "Advanced",
        color: "text-purple-700",
        bg: "bg-purple-100",
        level: 3,
    },
    EXPERT: {
        label: "Expert",
        color: "text-amber-700",
        bg: "bg-amber-100",
        level: 4,
    },
};

const PROFICIENCY_LEVELS: ProficiencyLevel[] = [
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
];

// ============================================================================
// Main Component
// ============================================================================

export function SkillsTab({ applicationId, jobSkills }: SkillsTabProps) {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [jobFilter, setJobFilter] = useState<SkillFilter>("all");
    const [userFilter, setUserFilter] = useState<SkillFilter>("all");
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addSkillName, setAddSkillName] = useState("");
    const [addProficiency, setAddProficiency] =
        useState<ProficiencyLevel>("INTERMEDIATE");
    const [skillSearchResults, setSkillSearchResults] = useState<Skill[]>([]);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

    // ---- Fetch user skills ----
    const { data: userSkillsData, isLoading } = useQuery<{
        skills: UserSkill[];
    }>({
        queryKey: ["user-skills"],
        queryFn: async () => {
            const res = await fetch("/api/users/skills");
            if (!res.ok) throw new Error("Failed to fetch user skills");
            return res.json();
        },
    });

    const userSkills = userSkillsData?.skills ?? [];

    // ---- Match calculation ----
    const matchData = useMemo(() => {
        if (jobSkills.length === 0)
            return {
                matched: [],
                missing: [],
                percentage: 0,
                requiredMatched: 0,
                requiredTotal: 0,
            };

        const userSkillIds = new Set(userSkills.map((us) => us.id));
        const matched = jobSkills.filter((js) => userSkillIds.has(js.skillId));
        const missing = jobSkills.filter((js) => !userSkillIds.has(js.skillId));
        const requiredTotal = jobSkills.filter((js) => js.isRequired).length;
        const requiredMatched = matched.filter((js) => js.isRequired).length;
        const percentage = Math.round(
            (matched.length / jobSkills.length) * 100
        );

        return { matched, missing, percentage, requiredMatched, requiredTotal };
    }, [jobSkills, userSkills]);

    // ---- Filtered lists ----
    const filteredJobSkills = useMemo(() => {
        const userSkillIds = new Set(userSkills.map((us) => us.id));
        let filtered = jobSkills;

        if (jobFilter === "matched") {
            filtered = filtered.filter((js) => userSkillIds.has(js.skillId));
        } else if (jobFilter === "missing") {
            filtered = filtered.filter((js) => !userSkillIds.has(js.skillId));
        }

        if (search) {
            filtered = filtered.filter((js) =>
                js.skill.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        return filtered;
    }, [jobSkills, userSkills, jobFilter, search]);

    const filteredUserSkills = useMemo(() => {
        const jobSkillIds = new Set(jobSkills.map((js) => js.skillId));
        let filtered = userSkills;

        if (userFilter === "matched") {
            filtered = filtered.filter((us) => jobSkillIds.has(us.id));
        } else if (userFilter === "missing") {
            filtered = filtered.filter((us) => !jobSkillIds.has(us.id));
        }

        if (search) {
            filtered = filtered.filter((us) =>
                us.skill.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        return filtered;
    }, [userSkills, jobSkills, userFilter, search]);

    // ---- Mutations ----
    const addSkillMutation = useMutation({
        mutationFn: async (data: {
            skillId?: string;
            skillName?: string;
            proficiencyLevel: ProficiencyLevel;
        }) => {
            const res = await fetch("/api/users/skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to add skill");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Skill added to your profile");
            setAddDialogOpen(false);
            setAddSkillName("");
            setSelectedSkillId(null);
            queryClient.invalidateQueries({ queryKey: ["user-skills"] });
        },
        onError: () => toast.error("Failed to add skill"),
    });

    const updateProficiencyMutation = useMutation({
        mutationFn: async ({
            skillId,
            proficiencyLevel,
        }: {
            skillId: string;
            proficiencyLevel: ProficiencyLevel;
        }) => {
            const res = await fetch(`/api/users/skills/${skillId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proficiencyLevel }),
            });
            if (!res.ok) throw new Error("Failed to update");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Proficiency updated");
            queryClient.invalidateQueries({ queryKey: ["user-skills"] });
        },
        onError: () => toast.error("Failed to update proficiency"),
    });

    // ---- Skill search for dialog ----
    const handleSkillSearch = async (query: string) => {
        setAddSkillName(query);
        setSelectedSkillId(null);
        if (query.length < 2) {
            setSkillSearchResults([]);
            return;
        }
        try {
            const res = await fetch(
                `/api/skills?search=${encodeURIComponent(query)}`
            );
            const data = await res.json();
            setSkillSearchResults(data.skills ?? []);
        } catch {
            setSkillSearchResults([]);
        }
    };

    const handleAddSkill = () => {
        if (selectedSkillId) {
            addSkillMutation.mutate({
                skillId: selectedSkillId,
                proficiencyLevel: addProficiency,
            });
        } else if (addSkillName.trim()) {
            addSkillMutation.mutate({
                skillName: addSkillName.trim(),
                proficiencyLevel: addProficiency,
            });
        }
    };

    const handleQuickAdd = (skill: Skill) => {
        addSkillMutation.mutate({
            skillId: skill.id,
            proficiencyLevel: "INTERMEDIATE",
        });
    };

    // ---- Helpers ----
    const getMatchColor = (pct: number) => {
        if (pct >= 75) return "text-green-600";
        if (pct >= 50) return "text-amber-600";
        return "text-red-600";
    };

    const getProgressColor = (pct: number) => {
        if (pct >= 75) return "[&>div]:bg-green-500";
        if (pct >= 50) return "[&>div]:bg-amber-500";
        return "[&>div]:bg-red-500";
    };

    const getUserProficiency = (skillId: string) =>
        userSkills.find((us) => us.id === skillId);

    const jobSkillIds = new Set(jobSkills.map((js) => js.skillId));
    const userSkillIds = new Set(userSkills.map((us) => us.id));

    // ========================================================================
    // Render
    // ========================================================================

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="h-20 animate-pulse rounded-lg bg-muted" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (jobSkills.length === 0 && userSkills.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                    <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No skills data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Add skills to the job or your profile to see a match
                    analysis
                </p>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Skills to Profile
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ================================================================
                MATCH SCORE CARD
            ================================================================ */}
            {jobSkills.length > 0 && (
                <Card className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Big percentage */}
                            <div className="flex flex-col items-center">
                                <div
                                    className={`text-5xl font-bold tabular-nums ${getMatchColor(matchData.percentage)}`}
                                >
                                    {matchData.percentage}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Skills Match
                                </p>
                            </div>

                            {/* Details */}
                            <div className="flex-1 w-full space-y-3">
                                <Progress
                                    value={matchData.percentage}
                                    className={`h-3 ${getProgressColor(matchData.percentage)}`}
                                />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                        <span>
                                            <span className="font-semibold">
                                                {matchData.matched.length}
                                            </span>{" "}
                                            of {jobSkills.length} matched
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                        <span>
                                            <span className="font-semibold">
                                                {matchData.missing.length}
                                            </span>{" "}
                                            skills missing
                                        </span>
                                    </div>
                                    {matchData.requiredTotal > 0 && (
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span>
                                                <span className="font-semibold">
                                                    {
                                                        matchData.requiredMatched
                                                    }
                                                </span>
                                                /{matchData.requiredTotal}{" "}
                                                required
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ================================================================
                SEARCH + ADD SKILL
            ================================================================ */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search skills..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Skill
                </Button>
            </div>

            {/* ================================================================
                SKILLS COMPARISON — TWO COLUMNS
            ================================================================ */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* LEFT — Required Skills (Job) */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Target className="h-4 w-4 text-blue-600" />
                                Required Skills
                            </CardTitle>
                            <FilterDropdown
                                value={jobFilter}
                                onChange={setJobFilter}
                            />
                        </div>
                        <CardDescription>
                            {jobSkills.length} skills listed for this job
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredJobSkills.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6 italic">
                                {jobSkills.length === 0
                                    ? "No skills listed for this job"
                                    : "No skills match the current filter"}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {filteredJobSkills.map((js) => {
                                    const hasSkill = userSkillIds.has(
                                        js.skillId
                                    );
                                    const userProf = getUserProficiency(
                                        js.skillId
                                    );

                                    return (
                                        <div
                                            key={js.skillId}
                                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                                hasSkill
                                                    ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                                                    : "bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {hasSkill ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                                )}
                                                <span className="text-sm font-medium truncate">
                                                    {js.skill.name}
                                                </span>
                                                {js.isRequired && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-red-100 text-red-700 hover:bg-red-100 text-xs shrink-0"
                                                    >
                                                        Required
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {userProf && (
                                                    <ProficiencyBadge
                                                        level={
                                                            userProf.proficiencyLevel
                                                        }
                                                    />
                                                )}
                                                {!hasSkill && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() =>
                                                            handleQuickAdd(
                                                                js.skill
                                                            )
                                                        }
                                                        disabled={
                                                            addSkillMutation.isPending
                                                        }
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Add
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* RIGHT — Your Skills */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                Your Skills
                            </CardTitle>
                            <FilterDropdown
                                value={userFilter}
                                onChange={setUserFilter}
                            />
                        </div>
                        <CardDescription>
                            {userSkills.length} skills in your profile
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredUserSkills.length === 0 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground italic">
                                    {userSkills.length === 0
                                        ? "No skills in your profile yet"
                                        : "No skills match the current filter"}
                                </p>
                                {userSkills.length === 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
                                        onClick={() => setAddDialogOpen(true)}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Add Your First Skill
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredUserSkills.map((us) => {
                                    const isRelevant = jobSkillIds.has(
                                        us.id
                                    );

                                    return (
                                        <div
                                            key={us.id}
                                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                                isRelevant
                                                    ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                                                    : "bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isRelevant ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                                ) : (
                                                    <span className="h-4 w-4 shrink-0" />
                                                )}
                                                <span className="text-sm font-medium truncate">
                                                    {us.skill.name}
                                                </span>
                                                {us.skill.category && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs shrink-0"
                                                    >
                                                        {us.skill.category}
                                                    </Badge>
                                                )}
                                            </div>
                                            <ProficiencySelector
                                                level={us.proficiencyLevel}
                                                onChange={(newLevel) =>
                                                    updateProficiencyMutation.mutate(
                                                        {
                                                            skillId:
                                                                us.id,
                                                            proficiencyLevel:
                                                                newLevel,
                                                        }
                                                    )
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ================================================================
                SKILLS GAP — Missing Skills to Learn
            ================================================================ */}
            {matchData.missing.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-amber-600" />
                            Skills to Learn
                        </CardTitle>
                        <CardDescription>
                            {matchData.missing.length} skills from this job that
                            you don&apos;t have yet
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {matchData.missing
                                .sort(
                                    (a, b) =>
                                        (b.isRequired ? 1 : 0) -
                                        (a.isRequired ? 1 : 0)
                                )
                                .map((js) => (
                                    <div
                                        key={js.skillId}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                            <span className="text-sm font-medium truncate">
                                                {js.skill.name}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={`shrink-0 text-xs ${
                                                    js.isRequired
                                                        ? "bg-red-100 text-red-700 hover:bg-red-100"
                                                        : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                                }`}
                                            >
                                                {js.isRequired
                                                    ? "High Priority"
                                                    : "Medium"}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={() =>
                                                handleQuickAdd(js.skill)
                                            }
                                            disabled={
                                                addSkillMutation.isPending
                                            }
                                        >
                                            {addSkillMutation.isPending ? (
                                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                            ) : (
                                                <Plus className="h-3.5 w-3.5 mr-1" />
                                            )}
                                            Add to Profile
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ================================================================
                YOUR STRENGTHS — Matched required skills
            ================================================================ */}
            {matchData.matched.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Your Strengths
                        </CardTitle>
                        <CardDescription>
                            Highlight these skills in your application - you
                            already have them!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {matchData.matched.map((js) => {
                                const prof = getUserProficiency(js.skillId);
                                const config = prof
                                    ? PROFICIENCY_CONFIG[prof.proficiencyLevel]
                                    : null;
                                return (
                                    <TooltipProvider key={js.skillId}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge
                                                    variant="secondary"
                                                    className={`${config?.bg ?? "bg-green-100"} ${config?.color ?? "text-green-700"} hover:${config?.bg ?? "bg-green-100"} px-3 py-1 text-sm cursor-default`}
                                                >
                                                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                    {js.skill.name}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="text-xs">
                                                    {prof
                                                        ? `Your level: ${PROFICIENCY_CONFIG[prof.proficiencyLevel].label}`
                                                        : "Matched"}
                                                    {js.isRequired
                                                        ? " · Required skill"
                                                        : ""}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ================================================================
                ADD SKILL DIALOG
            ================================================================ */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Add Skill to Profile</DialogTitle>
                        <DialogDescription>
                            Search for a skill or create a new one
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-sm font-medium">
                                Skill Name
                            </Label>
                            <Input
                                placeholder="Search or enter a skill name..."
                                value={addSkillName}
                                onChange={(e) =>
                                    handleSkillSearch(e.target.value)
                                }
                                className="mt-1.5"
                            />
                            {/* Search suggestions */}
                            {skillSearchResults.length > 0 && (
                                <div className="mt-1 rounded-lg border bg-popover p-1 shadow-md max-h-40 overflow-y-auto">
                                    {skillSearchResults.map((skill) => (
                                        <button
                                            key={skill.id}
                                            className={`w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                                                selectedSkillId === skill.id
                                                    ? "bg-accent"
                                                    : ""
                                            }`}
                                            onClick={() => {
                                                setSelectedSkillId(skill.id);
                                                setAddSkillName(skill.name);
                                                setSkillSearchResults([]);
                                            }}
                                        >
                                            {skill.name}
                                            {skill.category && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    {skill.category}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-sm font-medium">
                                Proficiency Level
                            </Label>
                            <Select
                                value={addProficiency}
                                onValueChange={(v) =>
                                    setAddProficiency(v as ProficiencyLevel)
                                }
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROFICIENCY_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className={`inline-block h-2 w-2 rounded-full ${PROFICIENCY_CONFIG[level].bg}`}
                                                />
                                                {PROFICIENCY_CONFIG[level]
                                                    .label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setAddDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddSkill}
                            disabled={
                                (!selectedSkillId && !addSkillName.trim()) ||
                                addSkillMutation.isPending
                            }
                        >
                            {addSkillMutation.isPending && (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            )}
                            Add Skill
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ============================================================================
// Sub-components
// ============================================================================

function ProficiencyBadge({ level }: { level: ProficiencyLevel }) {
    const config = PROFICIENCY_CONFIG[level];
    return (
        <Badge
            variant="secondary"
            className={`${config.bg} ${config.color} hover:${config.bg} text-xs`}
        >
            {config.label}
        </Badge>
    );
}

function ProficiencySelector({
    level,
    onChange,
}: {
    level: ProficiencyLevel;
    onChange: (level: ProficiencyLevel) => void;
}) {
    const config = PROFICIENCY_CONFIG[level];
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs gap-1 ${config.color}`}
                >
                    {config.label}
                    <ChevronDown className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {PROFICIENCY_LEVELS.map((l) => (
                    <DropdownMenuItem
                        key={l}
                        disabled={l === level}
                        onClick={() => onChange(l)}
                    >
                        <span
                            className={`inline-block h-2 w-2 rounded-full mr-2 ${PROFICIENCY_CONFIG[l].bg}`}
                        />
                        {PROFICIENCY_CONFIG[l].label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function FilterDropdown({
    value,
    onChange,
}: {
    value: SkillFilter;
    onChange: (v: SkillFilter) => void;
}) {
    const labels: Record<SkillFilter, string> = {
        all: "All",
        matched: "Matched",
        missing: "Missing",
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    {labels[value]}
                    <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {(Object.keys(labels) as SkillFilter[]).map((f) => (
                    <DropdownMenuItem
                        key={f}
                        disabled={f === value}
                        onClick={() => onChange(f)}
                    >
                        {labels[f]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
