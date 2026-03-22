"use client";

import { useRouter } from "next/navigation";

import React, { useState, useCallback, useRef } from "react";
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragCancelEvent,
    type Announcements,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
    KanbanColumn,
    KanbanSortableItem,
    STATUS_CONFIG,
} from "@/components/applications/KanbanColumn";
import { ApplicationCard } from "@/components/applications/ApplicationCard";
import type {
    ApplicationCard as ApplicationCardData,
    BoardData,
    ApplicationsResponse,
} from "@/types/application";
import { APPLICATION_STATUSES } from "@/types/application";
import type { ApplicationStatus } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface KanbanBoardProps {
    /** Applications grouped by status */
    board: BoardData;
    /** All applications flat (for lookups) */
    applications: ApplicationCardData[];
    /** Statuses to show (empty = all) */
    visibleStatuses?: ApplicationStatus[];
    /** React Query cache key used by the parent query */
    queryKey: unknown[];
}

// ============================================================================
// Helpers
// ============================================================================

function findCardById(
    applications: ApplicationCardData[],
    id: UniqueIdentifier
): ApplicationCardData | undefined {
    return applications.find((a) => a.id === id);
}

function findColumnForCard(
    board: BoardData,
    cardId: UniqueIdentifier
): ApplicationStatus | undefined {
    for (const status of APPLICATION_STATUSES) {
        if (board[status].some((c) => c.id === cardId)) {
            return status;
        }
    }
    return undefined;
}

// ============================================================================
// Accessibility Announcements
// ============================================================================

function buildAnnouncements(
    applications: ApplicationCardData[]
): Announcements {
    const getLabel = (id: UniqueIdentifier) => {
        const card = applications.find((a) => a.id === id);
        return card ? `${card.job.title} at ${card.job.company}` : String(id);
    };

    return {
        onDragStart({ active }) {
            return `Picked up ${getLabel(active.id)}. Use arrow keys to move between columns. Press space to drop.`;
        },
        onDragOver({ active, over }) {
            if (!over) return `${getLabel(active.id)} is no longer over a droppable area.`;
            const isColumn = APPLICATION_STATUSES.includes(over.id as ApplicationStatus);
            if (isColumn) {
                const config = STATUS_CONFIG[over.id as ApplicationStatus];
                return `${getLabel(active.id)} is over the ${config.label} column.`;
            }
            return `${getLabel(active.id)} is over another card.`;
        },
        onDragEnd({ active, over }) {
            if (!over) return `${getLabel(active.id)} was dropped outside a column. No changes made.`;
            const isColumn = APPLICATION_STATUSES.includes(over.id as ApplicationStatus);
            if (isColumn) {
                const config = STATUS_CONFIG[over.id as ApplicationStatus];
                return `${getLabel(active.id)} was moved to ${config.label}.`;
            }
            return `${getLabel(active.id)} was dropped.`;
        },
        onDragCancel({ active }) {
            return `Dragging of ${getLabel(active.id)} was cancelled. No changes made.`;
        },
    };
}

// ============================================================================
// Component
// ============================================================================

export const KanbanBoard = React.memo(function KanbanBoard({
    board,
    applications,
    visibleStatuses,
    queryKey,
}: KanbanBoardProps) {
    const queryClient = useQueryClient();
    const router = useRouter();

    // ---- Drag state ----
    const [activeCard, setActiveCard] = useState<ApplicationCardData | null>(null);
    const originalStatusRef = useRef<ApplicationStatus | null>(null);

    // ---- Sensors ----
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor)
    );

    // ---- Accessibility announcements ----
    const announcements = buildAnnouncements(applications);

    // ---- Status update mutation with optimistic updates ----
    const updateStatus = useMutation({
        mutationFn: async ({
            applicationId,
            status,
        }: {
            applicationId: string;
            status: ApplicationStatus;
        }) => {
            const res = await fetch(`/api/applications/${applicationId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            return res.json();
        },

        // Optimistic update: move card in cache immediately
        onMutate: async ({ applicationId, status }) => {
            await queryClient.cancelQueries({ queryKey });

            const prev = queryClient.getQueryData<ApplicationsResponse>(queryKey);

            if (prev) {
                queryClient.setQueryData<ApplicationsResponse>(queryKey, {
                    ...prev,
                    applications: prev.applications.map((a) =>
                        a.id === applicationId ? { ...a, status } : a
                    ),
                });
            }

            return { prev };
        },

        // Revert on error
        onError: (_err, _vars, context) => {
            if (context?.prev) {
                queryClient.setQueryData(queryKey, context.prev);
            }
            toast.error("Failed to update status. Change reverted.");
        },

        // Re-fetch to ensure consistency after settle
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
        },
    });

    // ---- Drag handlers ----

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const card = findCardById(applications, event.active.id);
            if (card) {
                setActiveCard(card);
                originalStatusRef.current = card.status;
            }
        },
        [applications]
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            setActiveCard(null);
            originalStatusRef.current = null;

            const { active, over } = event;
            if (!over) return;

            // Determine target column
            const overId = over.id as string;
            let newStatus: ApplicationStatus | undefined;

            // Dropped on column directly
            if (APPLICATION_STATUSES.includes(overId as ApplicationStatus)) {
                newStatus = overId as ApplicationStatus;
            } else {
                // Dropped on another card — find its column
                newStatus = findColumnForCard(board, overId);
            }

            if (!newStatus) return;

            const card = findCardById(applications, active.id);
            if (!card || card.status === newStatus) return;

            const config = STATUS_CONFIG[newStatus];
            toast.success(`Moved to ${config.label}`);
            updateStatus.mutate({ applicationId: card.id, status: newStatus });
        },
        [applications, board, updateStatus]
    );

    const handleDragCancel = useCallback(
        (_event: DragCancelEvent) => {
            // Reset — no API call, no state change
            if (activeCard) {
                setActiveCard(null);
                originalStatusRef.current = null;
            }
        },
        [activeCard]
    );

    // ---- Which statuses to render ----
    const statuses =
        visibleStatuses && visibleStatuses.length > 0
            ? APPLICATION_STATUSES.filter((s) => visibleStatuses.includes(s))
            : APPLICATION_STATUSES;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            accessibility={{ announcements }}
        >
            <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4"
                role="region"
                aria-label="Application Kanban board"
            >
                {statuses.map((status) => {
                    const cards = board[status];
                    return (
                        <KanbanColumn
                            key={status}
                            status={status}
                            cardIds={cards.map((c) => c.id)}
                        >
                            {cards.map((card) => (
                                <KanbanSortableItem key={card.id} id={card.id}>
                                    <ApplicationCard
                                        application={card}
                                        isDragging={activeCard?.id === card.id}
                                        onClick={() => router.push(`/jobs/${card.id}`)}
                                        onEdit={() => router.push(`/jobs/${card.id}`)}
                                    />
                                </KanbanSortableItem>
                            ))}
                        </KanbanColumn>
                    );
                })}
            </div>

            {/* Drag overlay — rendered outside column flow for smooth visuals */}
            <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                {activeCard && (
                    <ApplicationCard
                        application={activeCard}
                        isDragging
                        onClick={() => router.push(`/jobs/${activeCard.id}`)}
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
});
