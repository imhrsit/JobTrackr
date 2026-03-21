"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    GripVertical,
    Plus,
    X,
    Search,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ProficiencyLevel } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

interface SkillData {
    id: string;
    name: string;
    category: string | null;
}

interface UserSkillData {
    id: string;
    proficiencyLevel: ProficiencyLevel;
    skill: SkillData;
}

// ============================================================================
// Constants
// ============================================================================

const SKILL_CATEGORIES = [
    "Programming Languages",
    "Frameworks & Libraries",
    "Tools & Technologies",
    "Soft Skills",
    "Other",
];

const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string; color: string }[] = [
    { value: "BEGINNER", label: "Beginner", color: "bg-slate-100 text-slate-700" },
    { value: "INTERMEDIATE", label: "Intermediate", color: "bg-blue-100 text-blue-700" },
    { value: "ADVANCED", label: "Advanced", color: "bg-purple-100 text-purple-700" },
    { value: "EXPERT", label: "Expert", color: "bg-green-100 text-green-700" },
];

function proficiencyColor(level: ProficiencyLevel) {
    return PROFICIENCY_OPTIONS.find((o) => o.value === level)?.color ?? "";
}

function categoryColor(cat: string | null) {
    switch (cat) {
        case "Programming Languages": return "bg-amber-100 text-amber-800";
        case "Frameworks & Libraries": return "bg-blue-100 text-blue-800";
        case "Tools & Technologies": return "bg-violet-100 text-violet-800";
        case "Soft Skills": return "bg-rose-100 text-rose-800";
        default: return "bg-gray-100 text-gray-700";
    }
}

// ============================================================================
// Sortable Skill Row
// ============================================================================

interface SkillRowProps {
    userSkill: UserSkillData;
    onDelete: (skillId: string) => void;
    onUpdateProficiency: (skillId: string, level: ProficiencyLevel) => void;
}

function SortableSkillRow({ userSkill, onDelete, onUpdateProficiency }: SkillRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: userSkill.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm",
                isDragging && "opacity-60 shadow-lg z-50"
            )}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4" />
            </button>

            {/* Skill name */}
            <span className="flex-1 font-medium truncate">{userSkill.skill.name}</span>

            {/* Category badge */}
            <Badge
                variant="secondary"
                className={cn("text-xs hidden sm:inline-flex shrink-0", categoryColor(userSkill.skill.category))}
            >
                {userSkill.skill.category ?? "Other"}
            </Badge>

            {/* Proficiency selector */}
            <Select
                value={userSkill.proficiencyLevel}
                onValueChange={(v) => onUpdateProficiency(userSkill.id, v as ProficiencyLevel)}
            >
                <SelectTrigger className="h-7 w-[130px] text-xs shrink-0">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PROFICIENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            <span className={cn("px-1.5 py-0.5 rounded text-xs", opt.color)}>
                                {opt.label}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Remove */}
            <button
                onClick={() => onDelete(userSkill.id)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                aria-label="Remove skill"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ============================================================================
// Add Skill Panel
// ============================================================================

interface AddSkillProps {
    existingSkillIds: Set<string>;
    onAdd: (name: string, category: string, proficiency: ProficiencyLevel) => Promise<void>;
}

function AddSkillPanel({ existingSkillIds, onAdd }: AddSkillProps) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState(SKILL_CATEGORIES[0]);
    const [proficiency, setProficiency] = useState<ProficiencyLevel>("INTERMEDIATE");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [adding, setAdding] = useState(false);
    const [selected, setSelected] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { data: searchData } = useQuery<{ skills: SkillData[] }>({
        queryKey: ["skills-search", query],
        queryFn: async () => {
            const res = await fetch(`/api/skills?search=${encodeURIComponent(query)}`);
            return res.json();
        },
        enabled: query.length > 0,
        staleTime: 30_000,
    });

    const suggestions = (searchData?.skills ?? []).filter(
        (s) => !existingSkillIds.has(s.id)
    );
    const showCreate = query.trim().length > 1 && !suggestions.some(
        (s) => s.name.toLowerCase() === query.trim().toLowerCase()
    );

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (name: string, cat?: string | null) => {
        setSelected(name);
        setQuery(name);
        if (cat) setCategory(cat);
        setDropdownOpen(false);
    };

    const handleAdd = async () => {
        const name = selected || query.trim();
        if (!name) return;
        setAdding(true);
        try {
            await onAdd(name, category, proficiency);
            setQuery("");
            setSelected("");
            setProficiency("INTERMEDIATE");
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-sm font-medium">Add Skill</p>

            <div className="grid gap-3 sm:grid-cols-[1fr_160px_140px_auto]">
                {/* Search input with dropdown */}
                <div ref={wrapperRef} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelected("");
                            setDropdownOpen(true);
                        }}
                        onFocus={() => query.length > 0 && setDropdownOpen(true)}
                        placeholder="Search or add skill…"
                        className="pl-9 h-9"
                    />
                    {dropdownOpen && (suggestions.length > 0 || showCreate) && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-md overflow-hidden">
                            {suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onMouseDown={() => handleSelect(s.name, s.category)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted text-left"
                                >
                                    <span>{s.name}</span>
                                    {s.category && (
                                        <span className="text-xs text-muted-foreground">{s.category}</span>
                                    )}
                                </button>
                            ))}
                            {showCreate && (
                                <button
                                    type="button"
                                    onMouseDown={() => handleSelect(query.trim())}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-primary border-t"
                                >
                                    <Plus className="h-3 w-3" />
                                    Create &ldquo;{query.trim()}&rdquo;
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Category */}
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        {SKILL_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Proficiency */}
                <Select
                    value={proficiency}
                    onValueChange={(v) => setProficiency(v as ProficiencyLevel)}
                >
                    <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Proficiency" />
                    </SelectTrigger>
                    <SelectContent>
                        {PROFICIENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0"
                    disabled={!query.trim() || adding}
                    onClick={handleAdd}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export function SkillsTab() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<{ skills: UserSkillData[] }>({
        queryKey: ["user-skills"],
        queryFn: async () => {
            const res = await fetch("/api/users/skills");
            if (!res.ok) throw new Error("Failed to fetch skills");
            return res.json();
        },
        staleTime: 30_000,
    });

    const [localSkills, setLocalSkills] = useState<UserSkillData[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");

    useEffect(() => {
        if (data?.skills) setLocalSkills(data.skills);
    }, [data?.skills]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setLocalSkills((skills) => {
                const oldIdx = skills.findIndex((s) => s.id === active.id);
                const newIdx = skills.findIndex((s) => s.id === over.id);
                return arrayMove(skills, oldIdx, newIdx);
            });
        }
    };

    const handleAdd = async (name: string, category: string, proficiency: ProficiencyLevel) => {
        try {
            const res = await fetch("/api/users/skills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    skillName: name,
                    proficiencyLevel: proficiency,
                    category,
                }),
            });
            if (res.status === 409) {
                toast.info(`"${name}" is already in your profile`);
                return;
            }
            if (!res.ok) throw new Error("Failed to add skill");
            toast.success(`Added "${name}"`);
            queryClient.invalidateQueries({ queryKey: ["user-skills"] });
        } catch {
            toast.error("Failed to add skill");
        }
    };

    const handleDelete = async (skillId: string) => {
        const skill = localSkills.find((s) => s.id === skillId);
        setLocalSkills((prev) => prev.filter((s) => s.id !== skillId));
        try {
            const res = await fetch(`/api/users/skills/${skillId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success(`Removed "${skill?.skill.name ?? "skill"}"`);
            queryClient.invalidateQueries({ queryKey: ["user-skills"] });
        } catch {
            toast.error("Failed to remove skill");
            if (data?.skills) setLocalSkills(data.skills); // rollback
        }
    };

    const handleUpdateProficiency = async (skillId: string, level: ProficiencyLevel) => {
        setLocalSkills((prev) =>
            prev.map((s) => s.id === skillId ? { ...s, proficiencyLevel: level } : s)
        );
        try {
            const res = await fetch(`/api/users/skills/${skillId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ proficiencyLevel: level }),
            });
            if (!res.ok) throw new Error("Failed to update");
        } catch {
            toast.error("Failed to update proficiency");
            if (data?.skills) setLocalSkills(data.skills); // rollback
        }
    };

    const handleExport = () => {
        if (!localSkills.length) return;
        const rows = [
            ["Skill", "Category", "Proficiency"],
            ...localSkills.map((s) => [
                s.skill.name,
                s.skill.category ?? "Other",
                s.proficiencyLevel,
            ]),
        ];
        const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "skills.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const existingSkillIds = new Set(localSkills.map((s) => s.id));

    const filteredSkills =
        categoryFilter === "all"
            ? localSkills
            : localSkills.filter(
                  (s) => (s.skill.category ?? "Other") === categoryFilter
              );

    const allCategories = Array.from(
        new Set(localSkills.map((s) => s.skill.category ?? "Other"))
    ).sort();

    // ── Render ─────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Add Skill */}
            <AddSkillPanel existingSkillIds={existingSkillIds} onAdd={handleAdd} />

            {/* Toolbar */}
            {localSkills.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setCategoryFilter("all")}
                            className={cn(
                                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                categoryFilter === "all"
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border hover:bg-muted"
                            )}
                        >
                            All ({localSkills.length})
                        </button>
                        {allCategories.map((cat) => {
                            const count = localSkills.filter(
                                (s) => (s.skill.category ?? "Other") === cat
                            ).length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={cn(
                                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                                        categoryFilter === cat
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border hover:bg-muted"
                                    )}
                                >
                                    {cat} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <Button variant="ghost" size="sm" onClick={handleExport} className="text-xs gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>
                </div>
            )}

            <Separator />

            {/* Skill List */}
            {filteredSkills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">
                        {localSkills.length === 0
                            ? "No skills added yet. Add your first skill above."
                            : "No skills in this category."}
                    </p>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredSkills.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {filteredSkills.map((userSkill) => (
                                <SortableSkillRow
                                    key={userSkill.id}
                                    userSkill={userSkill}
                                    onDelete={handleDelete}
                                    onUpdateProficiency={handleUpdateProficiency}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {localSkills.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    Drag rows to reorder · {localSkills.length} skill{localSkills.length !== 1 ? "s" : ""}
                </p>
            )}
        </div>
    );
}
