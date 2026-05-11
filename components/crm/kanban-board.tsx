"use client";

import { useRef, useState, useTransition } from "react";
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { motion, useScroll, useTransform } from "framer-motion";
import { Badge, bandTone } from "@/components/ui/badge";
import { moveLeadOnBoardAction } from "@/lib/crm/actions";
import { formatStatusLabel, MANUAL_BOARD_MOVE_STATUSES, WORKFLOW_OWNED_BOARD_STATUSES } from "@/lib/crm/status-contract";

type Column = { key: string; label: string };

function canDropTo(status: string) {
  return (MANUAL_BOARD_MOVE_STATUSES as readonly string[]).includes(status);
}

function isWorkflowOwnedStatus(status: string) {
  return (WORKFLOW_OWNED_BOARD_STATUSES as readonly string[]).includes(status);
}

function LeadCard({ row, index }: Readonly<{ row: any; index: number }>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.id,
    data: { leadId: row.id, fromStatus: row.status }
  });

  return (
    <motion.div
      ref={setNodeRef}
      className={`pipeline-board-card group relative overflow-hidden ${
        isDragging ? "opacity-60 z-20" : ""
      }`}
      style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985, cursor: "grabbing" }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <a href={`/pipeline/${row.id}`} className="block text-white/95 font-semibold leading-tight group-hover:text-brand transition-colors">
          {row.businessName}
        </a>
        <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
      </div>

      <div className="pipeline-row-meta">
        {[row.niche, row.country].filter(Boolean).join(" / ") || "No niche / geo"}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-xs text-white/65">Score {row.score ?? "--"}</span>
        {row.latestReplyIntent ? <Badge tone="warning">{row.latestReplyIntent}</Badge> : <Badge tone="muted">No reply</Badge>}
      </div>

      <div className="pipeline-board-card-footer">
        <span className="truncate">{row.campaignName ?? "No campaign"}</span>
        <span className="truncate">{row.status}</span>
      </div>
    </motion.div>
  );
}

function BoardColumn({
  column,
  cards,
  index,
  rotateY
}: Readonly<{
  column: Column;
  cards: any[];
  index: number;
  rotateY: any;
}>) {
  const droppable = canDropTo(column.key);
  const { isOver, setNodeRef } = useDroppable({
    id: column.key,
    data: { status: column.key }
  });

  return (
    <motion.div
      ref={setNodeRef}
      className={`pipeline-board-column shrink-0 snap-center ${
        isOver && droppable ? "border-brand/50 bg-brand/5" : ""
      }`}
      initial={{ opacity: 0, x: 50, rotateY: 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 25 }}
      style={{ rotateY, transformStyle: "preserve-3d" }}
    >
      <div className="pipeline-board-column-header">
        <div>
          <h3>{column.label}</h3>
          <p>
            {droppable ? "Manual move allowed" : "Workflow owned"}
          </p>
        </div>
        <Badge tone="muted">{cards.length}</Badge>
      </div>

      <div className="pipeline-board-column-body">
        {cards.map((row, cardIndex) => (
          <LeadCard key={row.id} row={row} index={cardIndex} />
        ))}
        {cards.length === 0 && (
          <div className="pipeline-board-empty">
            {droppable ? `Drop leads to mark ${formatStatusLabel(column.key).toLowerCase()}.` : "Updates arrive from workflow events."}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function KanbanBoard({ columns, leads }: Readonly<{ columns: Column[]; leads: any[] }>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [guardrailMessage, setGuardrailMessage] = useState<string | null>(null);

  const { scrollXProgress } = useScroll({ container: containerRef });
  const rotateY = useTransform(scrollXProgress, [0, 1], [3, -3]);

  const onDragEnd = (event: DragEndEvent) => {
    const leadId = String(event.active.id);
    const targetStatus = String(event.over?.id ?? "");
    const fromStatus = String(event.active.data.current?.fromStatus ?? "");
    if (!event.over) return;
    if (!canDropTo(targetStatus)) {
      if (isWorkflowOwnedStatus(targetStatus)) {
        setGuardrailMessage("Workflow-owned: cannot manually drop here.");
      }
      return;
    }
    if (targetStatus === fromStatus) return;

    setGuardrailMessage(null);
    startTransition(async () => {
      try {
        await moveLeadOnBoardAction(leadId, targetStatus as any);
      } catch (error) {
        setGuardrailMessage(error instanceof Error ? error.message : "Board move failed.");
      }
    });
  };

  return (
    <DndContext onDragEnd={onDragEnd}>
      {guardrailMessage ? (
        <div className="mb-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {guardrailMessage}
        </div>
      ) : null}
      <div className="pipeline-board-wrap">
        <div className="pipeline-board-rail">
          <div>
            <h2>Board view</h2>
            <p>Drag only where the workflow allows it. Workflow-owned stages stay protected automatically.</p>
          </div>
          <Badge tone="muted">{leads.length} leads</Badge>
        </div>
        <motion.section
        ref={containerRef}
        className={`flex gap-4 overflow-x-auto pb-8 pt-2 px-1 -mx-1 snap-x snap-mandatory ${isPending ? "opacity-80" : ""}`}
        style={{ perspective: 1200 }}
        >
          {columns.map((column, index) => {
            const cards = leads.filter((row) => row.status === column.key);
            return <BoardColumn key={column.key} column={column} cards={cards} index={index} rotateY={rotateY} />;
          })}
        </motion.section>
      </div>
    </DndContext>
  );
}
