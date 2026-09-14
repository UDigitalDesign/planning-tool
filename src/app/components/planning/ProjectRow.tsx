import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { format, addDays } from "date-fns";
import { User, Project, WeeklyHour, ProjectWeekNote, ProjectStatus, Milestone } from "../../data/types";
import { Archive, Check, GripVertical, Diamond } from "lucide-react";
import { Input } from "../ui/input";
import { cn } from "../../../lib/utils";
import { GridColumn } from "../../utils/dateUtils";
import { useDensity } from "./DensityContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

/** Figma-native comment icon – outline only */
const FigmaCommentIcon = ({ className }: { className?: string }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M4 21V9a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v2a7 7 0 0 1-7 7h-2.5L4 21Z" />
    </svg>
);

interface ProjectRowProps {
  project: Project;
  columns: GridColumn[];
  users: User[];
  weeklyHours: WeeklyHour[];
  onUpdateHours: (projectId: string, userId: string, weekStart: string, hours: number) => void;
  selectedPersonId: string | "all";
  onProjectClick: (project: Project) => void;
  onCellClick?: (projectId: string, column: GridColumn) => void;
  projectWeekNotes?: ProjectWeekNote[];
  milestones?: Milestone[];
  onUpdateProjectNote?: (projectId: string, weekStart: string, note: string, type: 'info' | 'warning' | 'important') => void;
  onUpdateProjectStatus?: (id: string, status: ProjectStatus) => void;
  // Drag-to-reorder (on the board)
  dragIndex?: number;
  dragType?: string;
  moveRow?: (from: number, to: number) => void;
  onDropCommit?: () => void;
  /** Extra inspringing wanneer deze rij een werkstroom onder een opdracht is. */
  indent?: boolean;
}

const STATUS_ORDER: ProjectStatus[] = ["Pipeline", "Active", "On Hold", "Completed", "Archived"];

/** Click-to-change status. Hover shows the current status via tooltip; click opens the picker. */
const StatusDot = ({
  status,
  color,
  onChange,
}: {
  status: ProjectStatus;
  color: string;
  onChange?: (status: ProjectStatus) => void;
}) => {
  const [open, setOpen] = useState(false);

  const dot = <div className={cn("w-1 h-1 rounded-full flex-none", color)} />;

  if (!onChange) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent side="bottom" className="z-50"><p>{status}</p></TooltipContent>
      </Tooltip>
    );
  }

  const getColor = (s: ProjectStatus) => {
    switch (s) {
      case "Active": return "bg-emerald-500";
      case "Pipeline": return "bg-blue-500";
      case "Completed": return "bg-slate-400";
      case "On Hold": return "bg-amber-500";
      case "Archived": return "bg-slate-600";
      default: return "bg-slate-300";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex-none -m-1.5 p-1.5 rounded hover:bg-muted/60 transition-colors outline-none"
              aria-label="Change status"
            >
              {dot}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="z-50"><p>{status} · click to change</p></TooltipContent>
      </Tooltip>
      <PopoverContent align="start" side="bottom" className="w-44 p-1" onClick={(e) => e.stopPropagation()}>
        {STATUS_ORDER.filter(s => s !== "Archived").map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { onChange(s); setOpen(false); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs hover:bg-muted transition-colors text-left"
          >
            <span className={cn("w-1.5 h-1.5 rounded-full flex-none", getColor(s))} />
            <span className="flex-1">{s}</span>
            {s === status && <Check className="h-3 w-3 text-muted-foreground" />}
          </button>
        ))}
        <div className="h-px bg-border my-1" />
        <button
          type="button"
          onClick={() => { onChange("Archived"); setOpen(false); }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs hover:bg-muted transition-colors text-left text-muted-foreground"
        >
          <Archive className="h-3 w-3 flex-none" />
          <span className="flex-1">Archive</span>
        </button>
      </PopoverContent>
    </Popover>
  );
};

const NoteEditor = ({ 
    initialNote, 
    initialType = 'info',
    onSave, 
    onClose 
}: { 
    initialNote: string, 
    initialType?: 'info' | 'warning' | 'important',
    onSave: (note: string, type: 'info' | 'warning' | 'important') => void, 
    onClose: () => void 
}) => {
    const [note, setNote] = useState(initialNote);
    const [type, setType] = useState<'info' | 'warning' | 'important'>(initialType);

    return (
        <div className="flex flex-col gap-3 p-3 w-72">
            <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm leading-none">Weekly Note</h4>
                <div className="flex gap-1 bg-muted/50 p-0.5 rounded-md">
                    {/* Type Toggles */}
                    <button 
                        onClick={() => setType('info')}
                        className={cn("p-1 rounded w-6 h-6 flex items-center justify-center transition-colors", type === 'info' ? "bg-white shadow-sm" : "hover:bg-white/50")}
                        title="Info"
                    >
                        <FigmaCommentIcon className={cn("w-4 h-4", type === 'info' ? "text-slate-500" : "text-slate-400")} />
                    </button>
                    <button 
                         onClick={() => setType('warning')}
                         className={cn("p-1 rounded w-6 h-6 flex items-center justify-center transition-colors", type === 'warning' ? "bg-white shadow-sm" : "hover:bg-white/50")}
                         title="Warning"
                    >
                        <FigmaCommentIcon className={cn("w-4 h-4", type === 'warning' ? "text-amber-500" : "text-amber-500/50")} />
                    </button>
                </div>
            </div>
            <Textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                placeholder="Add a note..."
                className="h-24 resize-none text-sm"
                autoFocus
            />
            <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs">Cancel</Button>
                <Button size="sm" onClick={() => { onSave(note, type); onClose(); }} className="h-7 text-xs">Save</Button>
            </div>
        </div>
    );
};

const CellNote = ({ 
    noteObject, 
    onSave,
    hasValue
}: { 
    noteObject: ProjectWeekNote | undefined, 
    onSave: (note: string, type: 'info' | 'warning' | 'important') => void,
    hasValue: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const hasNote = !!noteObject?.note;
    const type = noteObject?.type || 'info';

    const getIconStyles = () => {
        if (!hasNote) return "text-slate-400/30 hover:text-slate-400 opacity-0 group-hover/cell:opacity-100";
        
        switch (type) {
            case 'warning': return "text-amber-500 opacity-100";
            case 'important': return "text-amber-500 opacity-100";
            default: return "text-slate-400 opacity-100 hover:text-slate-500"; 
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <span 
                        className="absolute z-20 h-4 w-4 top-1/2 left-1/2 -translate-y-1/2 ml-3 flex items-center justify-center cursor-pointer outline-none"
                    >
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                    "h-full w-full rounded-full p-0 transition-all duration-200 flex items-center justify-center hover:bg-transparent"
                                )}
                                onClick={(e) => e.stopPropagation()} 
                            >
                                <FigmaCommentIcon className={cn("h-3.5 w-3.5 transition-all", getIconStyles())} />
                            </Button>
                        </PopoverTrigger>
                    </span>
                </TooltipTrigger>
                {hasNote && <TooltipContent side="top" className="z-50"><p className="max-w-xs">{noteObject.note}</p></TooltipContent>}
            </Tooltip>
            <PopoverContent align="center" side="top" className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                <NoteEditor 
                    initialNote={noteObject?.note || ""}
                    initialType={type}
                    onSave={onSave}
                    onClose={() => setIsOpen(false)}
                />
            </PopoverContent>
        </Popover>
    );
};

/** Ruitje linksboven in de weekcel voor elke milestone die in die week valt. */
const CellMilestones = ({ items }: { items: Milestone[] }) => {
    if (items.length === 0) return null;

    const today = format(new Date(), "yyyy-MM-dd");
    const worst = items.some(m => !m.done && m.dueDate < today)
        ? "overdue"
        : items.every(m => m.done)
            ? "done"
            : "open";

    const color = worst === "overdue"
        ? "text-red-500 fill-red-500"
        : worst === "done"
            ? "text-emerald-500 fill-emerald-500"
            : "text-violet-400 fill-violet-400";

    return (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <span className="absolute z-20 top-0.5 left-1 flex items-center gap-0.5 pointer-events-auto">
                    <Diamond className={cn("h-2.5 w-2.5", color)} />
                    {items.length > 1 && (
                        <span className="text-[9px] leading-none text-muted-foreground">{items.length}</span>
                    )}
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-50">
                <div className="space-y-0.5">
                    {items.map(m => (
                        <p key={m.id} className={cn("text-xs", m.done && "line-through opacity-60")}>
                            {m.dueDate.split("-").reverse().join("-")} — {m.title}
                        </p>
                    ))}
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

export const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  columns,
  users,
  weeklyHours,
  onUpdateHours,
  selectedPersonId,
  onProjectClick,
  onCellClick,
  projectWeekNotes = [],
  milestones = [],
  indent = false,
  onUpdateProjectNote,
  onUpdateProjectStatus,
  dragIndex,
  dragType,
  moveRow,
  onDropCommit,
}) => {
  const isAll = selectedPersonId === "all";
  const density = useDensity();

  // --- Drag-to-reorder ---
  const rowRef = useRef<HTMLDivElement>(null);
  const canReorder = !!moveRow && dragIndex !== undefined && !!dragType;

  const [, drop] = useDrop({
    accept: dragType || "__project_none__",
    hover(item: { index: number }) {
      if (!canReorder) return;
      if (item.index === dragIndex) return;
      moveRow!(item.index, dragIndex!);
      item.index = dragIndex!;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: dragType || "__project_none__",
    item: () => ({ index: dragIndex }),
    canDrag: canReorder,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropCommit?.(),
  });

  if (canReorder) drop(rowRef);

  // Helper to get value
  const getValue = (column: GridColumn) => {
    if (column.type === "week") {
      const dateKey = format(column.date, "yyyy-MM-dd");
      if (isAll) {
        // Sum all users
        return weeklyHours
          .filter(h => h.projectId === project.id && h.weekStartDate === dateKey)
          .reduce((sum, h) => sum + h.hours, 0);
      } else {
        const h = weeklyHours.find(h => h.projectId === project.id && h.userId === selectedPersonId && h.weekStartDate === dateKey);
        return h ? h.hours : "";
      }
    } else {
      // Month Total: Sum of displayed weeks
      const weekColumns = columns.filter(c => c.type === "week");
      const weekDates = weekColumns.map(c => format(c.date, "yyyy-MM-dd"));

      const total = weeklyHours
          .filter(h => h.projectId === project.id)
          .filter(h => weekDates.includes(h.weekStartDate))
          .filter(h => isAll || h.userId === selectedPersonId)
          .reduce((sum, h) => sum + h.hours, 0);

      return total;
    }
  };

  const handleChange = (weekStart: Date, val: string) => {
    if (isAll) return; // Read only
    const num = parseInt(val, 10);
    const dateKey = format(weekStart, "yyyy-MM-dd");
    if (!isNaN(num)) {
      onUpdateHours(project.id, selectedPersonId, dateKey, num);
    } else if (val === "") {
        onUpdateHours(project.id, selectedPersonId, dateKey, 0);
    }
  };

  // Calculate hours totals
  const totalPlannedTeam = weeklyHours
    .filter(h => h.projectId === project.id)
    .reduce((sum, h) => sum + h.hours, 0);

  const totalPlannedUser = isAll ? 0 : weeklyHours
    .filter(h => h.projectId === project.id && h.userId === selectedPersonId)
    .reduce((sum, h) => sum + h.hours, 0);

  const totalSold = project.budget || 0;

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Active': return "bg-emerald-500";
          case 'Pipeline': return "bg-blue-500";
          case 'Completed': return "bg-slate-400";
          case 'On Hold': return "bg-amber-500";
          case 'Archived': return "bg-slate-600";
          default: return "bg-slate-300";
      }
  };

  return (
    <div
      ref={rowRef}
      className={cn("flex border-b hover:bg-muted/5 transition-colors group", isDragging && "opacity-40")}
    >
      {/* Sidebar / Project Info */}
      <div className="w-96 flex-none flex p-0 border-r relative bg-transparent">
         {indent && <div className="w-6 flex-none" />}
         {/* Indent Spacer with vertical line / drag handle */}
         <div className="w-10 flex-none relative flex justify-center items-center">
            {/* Tree line */}
            <div className="w-px h-full bg-border/30"></div>
            {canReorder && (
              <button
                ref={(node) => { drag(node); }}
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity bg-background/60"
                title="Drag to reorder"
                aria-label="Reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </button>
            )}
         </div>

         {/* Content */}
         <div className={cn("flex-1 pr-3 pl-2 flex flex-col justify-center min-w-0", density === "compact" ? "py-0.5" : "py-1.5")}>
            <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2 overflow-hidden">
                {/* Status Dot — click to change status */}
                <StatusDot
                    status={project.status}
                    color={getStatusColor(project.status)}
                    onChange={onUpdateProjectStatus ? (s) => onUpdateProjectStatus(project.id, s) : undefined}
                />
                
                <span 
                    className="font-normal text-sm truncate pr-2 cursor-pointer hover:text-primary hover:underline" 
                    title={project.name}
                    onClick={() => onProjectClick(project)}
                >
                    {project.name}
                </span>
            </div>
            
            {/* Hours display — planned vs. sold. Hidden for Internal projects,
                where a lifetime total (e.g. all-year meeting hours) is just noise. */}
            {project.category !== "Internal" && (
              <div className={cn("flex items-center gap-1 text-[11px] tabular-nums leading-none text-zinc-400 bg-zinc-800/60 px-2 rounded border border-zinc-700/30 whitespace-nowrap ml-2", density === "compact" ? "py-0.5" : "py-1")}>
                {!isAll && totalPlannedUser > 0 && (
                     <span className="text-zinc-200 mr-0.5">({totalPlannedUser})</span>
                )}
                <span className={cn(totalPlannedTeam > totalSold && totalSold > 0 ? "text-orange-400" : "text-zinc-300")}>
                    {totalPlannedTeam}
                </span>
                <span className="text-zinc-600 mx-0.5">/</span>
                <span className="text-zinc-400">{totalSold > 0 ? totalSold : "-"}</span>
              </div>
            )}

            </div>
            {project.status === "Pipeline" && project.expectancy && (
                <div className="text-[10px] text-blue-600/80 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                    Exp: {project.expectancy}
                </div>
            )}
        </div>
      </div>

      {/* Grid Cells */}
      <div className="flex flex-1">
        {columns.map((col, i) => {
          const isMonth = col.type === "month";
          const val = getValue(col);
          const hasValue = val !== "" && val !== 0 && val !== "-";
          
          // Note Logic
          const dateKey = col.type === "week" ? format(col.date, "yyyy-MM-dd") : "";
          const noteObject = !isMonth && projectWeekNotes
            ? projectWeekNotes.find(n => n.projectId === project.id && n.weekStartDate === dateKey)
            : undefined;

          // Milestones die binnen deze week (maandag t/m zondag) vallen
          const weekEndKey = !isMonth ? format(addDays(col.date, 6), "yyyy-MM-dd") : "";
          const cellMilestones = !isMonth
            ? milestones.filter(m =>
                m.projectId === project.id && m.dueDate >= dateKey && m.dueDate <= weekEndKey)
            : [];

          return (
          <div key={i} className={cn(
            "flex-1 min-w-[60px] p-0 border-r border-dashed border-border/40 flex items-center justify-center relative group/cell",
            isMonth && "min-w-[100px] border-solid bg-muted/5"
          )}>
            
            <CellMilestones items={cellMilestones} />

            {/* Note Button (Centered Vertical, Right of Number) */}
            {!isMonth && onUpdateProjectNote && (
                <CellNote 
                    noteObject={noteObject}
                    onSave={(newNote, newType) => onUpdateProjectNote(project.id, dateKey, newNote, newType)}
                    hasValue={hasValue}
                />
            )}

            {isAll || isMonth ? (
               <div 
                 className={cn(
                     "w-full h-full flex items-center justify-center cursor-pointer transition-colors text-sm relative z-10",
                     hasValue ? "font-semibold text-primary" : "text-muted-foreground/50",
                     isMonth && "font-bold text-foreground"
                 )}
                 onClick={() => onCellClick?.(project.id, col)}
               >
                 {val || (isMonth ? "0" : "-")}
               </div>
            ) : (
              <Input 
                className={cn(
                    "h-full w-full text-center rounded-none shadow-none border-0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary px-0 transition-colors bg-transparent relative z-10",
                    hasValue ? "font-medium text-foreground" : "text-muted-foreground"
                )}
                value={val}
                onChange={(e) => handleChange(col.date, e.target.value)}
                placeholder="-"
              />
            )}
          </div>
        )})}
      </div>
    </div>
  );
};