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
      className={`crm-state-card p-4 cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/[0.04] transition-colors group relative overflow-hidden ${
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
      <a href={`/pipeline/${row.id}`} className="block text-white/90 font-medium mb-1 group-hover:text-brand transition-colors">
        {row.businessName}
      </a>
      <div className="text-sm text-white/45 mb-4">{row.niche ?? "No niche"}</div>

      <div className="flex items-center gap-2 mb-3">
        <Badge tone={bandTone(row.effectiveBand)}>{row.effectiveBand ?? "NA"}</Badge>
        <span className="font-mono text-xs text-white/60">{row.score ?? "--"}</span>
      </div>

      <div className="text-xs text-white/35 truncate border-t border-white/5 pt-2 mt-2">
        {row.campaignName ?? "No campaign"}
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
      className={`crm-state-card min-w-[304px] max-w-[304px] flex flex-col gap-3 p-4 shrink-0 snap-center ${
        isOver && droppable ? "border-brand/50 bg-brand/5" : ""
      }`}
      initial={{ opacity: 0, x: 50, rotateY: 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay: index * 0.1, type: "spring", stiffness: 200, damping: 25 }}
      style={{ rotateY, transformStyle: "preserve-3d" }}
    >
      <div className="flex justify-between items-start border-b border-white/5 pb-3 gap-3">
        <div>
          <h3 className="font-medium text-white/85">{column.label}</h3>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
            {droppable ? "Manual move allowed" : "Workflow owned"}
          </div>
        </div>
        <Badge tone="muted">{cards.length}</Badge>
      </div>

      <div className="flex flex-col gap-3 min-h-[60vh] pb-10">
        {cards.map((row, cardIndex) => (
          <LeadCard key={row.id} row={row} index={cardIndex} />
        ))}
        {cards.length === 0 && (
          <div className="h-24 rounded-xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center text-white/25 text-sm text-center px-4">
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
        <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {guardrailMessage}
        </div>
      ) : null}
      <motion.section
        ref={containerRef}
        className={`flex gap-6 overflow-x-auto pb-8 pt-4 px-4 -mx-4 snap-x snap-mandatory ${isPending ? "opacity-80" : ""}`}
        style={{ perspective: 1200 }}
      >
        {columns.map((column, index) => {
          const cards = leads.filter((row) => row.status === column.key);
          return <BoardColumn key={column.key} column={column} cards={cards} index={index} rotateY={rotateY} />;
        })}
      </motion.section>
    </DndContext>
  );
}
