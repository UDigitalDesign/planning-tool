import React, { useState, useMemo, useRef } from "react";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Project, Client, WeeklyHour, ProjectStatus, Milestone } from "../../data/types";
import { cn } from "../../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const COL = 26;          // breedte van één weekkolom in px
const NAME_W = 250;      // breedte van de vaste linkerkolom
const WEEKS_BEFORE = 6;  // hoeveel weken terug de tijdlijn begint
const WEEKS_AHEAD = 32;  // en hoe ver hij vooruit loopt

const MONTHS_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** rgb-triplet per status, zodat de balk in dekking kan variëren naar drukte */
const STATUS_RGB: Record<string, string> = {
  "Active": "16,185,129",
  "Pipeline": "59,130,246",
  "On Hold": "245,158,11",
  "Completed": "148,163,184",
  "Archived": "100,116,139",
};

const STATUS_DOT: Record<string, string> = {
  "Active": "bg-emerald-500",
  "Pipeline": "bg-blue-500",
  "On Hold": "bg-amber-500",
  "Completed": "bg-slate-400",
  "Archived": "bg-slate-600",
};

/** Meer uren in een week = vollere kleur. */
const intensity = (hours: number) => {
  if (hours <= 0) return 0;
  if (hours < 2) return 0.28;
  if (hours < 8) return 0.5;
  if (hours < 16) return 0.72;
  return 1;
};

interface TimelineViewProps {
  currentDate: Date;
  projects: Project[];
  clients: Client[];
  weeklyHours: WeeklyHour[];
  milestones: Milestone[];
  selectedPersonId: string | "all";
  selectedStatuses: ProjectStatus[];
  searchQuery: string;
  onProjectClick: (project: Project) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  currentDate,
  projects,
  clients,
  weeklyHours,
  milestones,
  selectedPersonId,
  selectedStatuses,
  searchQuery,
  onProjectClick,
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  // --- weekas -------------------------------------------------------------
  const weeks = useMemo(() => {
    const start = subWeeks(startOfWeek(currentDate, { weekStartsOn: 1 }), WEEKS_BEFORE);
    return Array.from({ length: WEEKS_BEFORE + WEEKS_AHEAD }, (_, i) => addWeeks(start, i));
  }, [currentDate]);

  const weekKeys = useMemo(() => weeks.map(w => format(w, "yyyy-MM-dd")), [weeks]);
  const indexOfWeek = useMemo(
    () => Object.fromEntries(weekKeys.map((k, i) => [k, i])),
    [weekKeys]
  );
  const trackWidth = weeks.length * COL;

  /** Index van de kolom waar een datum in valt; -1 als hij buiten beeld ligt. */
  const columnFor = (dateKey?: string | null) => {
    if (!dateKey) return -1;
    if (dateKey < weekKeys[0]) return -1;
    for (let i = weekKeys.length - 1; i >= 0; i--) {
      if (dateKey >= weekKeys[i]) return i;
    }
    return -1;
  };

  const todayCol = columnFor(todayKey);

  // --- uren per project per week -----------------------------------------
  const hoursByProject = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const h of weeklyHours) {
      if (h.hours <= 0) continue;
      if (selectedPersonId !== "all" && h.userId !== selectedPersonId) continue;
      (map[h.projectId] ||= {});
      map[h.projectId][h.weekStartDate] = (map[h.projectId][h.weekStartDate] || 0) + h.hours;
    }
    return map;
  }, [weeklyHours, selectedPersonId]);

  // --- zichtbare projecten, gegroepeerd per klant -------------------------
  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const clientName = (id?: string) => clients.find(c => c.id === id)?.name || "Zonder klant";

    const visible = projects.filter(p => {
      if (!selectedStatuses.includes(p.status)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || clientName(p.clientId).toLowerCase().includes(q);
    });

    const byClient = new Map<string, Project[]>();
    for (const p of visible) {
      const name = clientName(p.clientId);
      if (!byClient.has(name)) byClient.set(name, []);
      byClient.get(name)!.push(p);
    }

    return [...byClient.entries()]
      .map(([name, ps]) => ({ name, projects: ps.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [projects, clients, selectedStatuses, searchQuery]);

  // --- balkbereik per project --------------------------------------------
  /**
   * Begin: de startdatum als die is ingevuld, anders de eerste week met uren.
   * Eind: de laatste deadline, anders de laatste week met uren.
   * Zo hoeft niemand een einddatum apart bij te houden.
   */
  const spanFor = (p: Project) => {
    const weeksWithHours = Object.keys(hoursByProject[p.id] || {}).sort();
    const projectMilestones = milestones.filter(m => m.projectId === p.id);

    const firstHour = weeksWithHours[0];
    const lastHour = weeksWithHours[weeksWithHours.length - 1];
    const lastDeadline = projectMilestones
      .map(m => m.endDate || m.dueDate)
      .sort()
      .pop();

    const startKey = p.startDate && (!firstHour || p.startDate < firstHour) ? p.startDate : firstHour;
    const endKey = lastDeadline && (!lastHour || lastDeadline > lastHour) ? lastDeadline : lastHour;
    if (!startKey || !endKey) return null;

    // Clamp op het zichtbare bereik, zodat een balk die eerder begon toch doorloopt.
    const rawStart = columnFor(startKey);
    const start = rawStart === -1 ? (startKey < weekKeys[0] ? 0 : -1) : rawStart;
    const end = columnFor(endKey);
    if (start === -1 || end === -1 || end < start) return null;

    return { start, end, plannedEnd: columnFor(lastHour) };
  };

  // eerste render: schuif naar vandaag in plaats van naar het verleden
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el || didScroll.current || todayCol < 0) return;
    el.scrollLeft = Math.max(0, todayCol * COL - el.clientWidth * 0.3);
    didScroll.current = true;
  }, [todayCol]);

  const toggleClient = (name: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  // --- maandkoppen --------------------------------------------------------
  const monthSpans = useMemo(() => {
    const out: { label: string; span: number }[] = [];
    let i = 0;
    while (i < weeks.length) {
      const m = weeks[i].getMonth();
      const y = weeks[i].getFullYear();
      let span = 0;
      while (i + span < weeks.length
        && weeks[i + span].getMonth() === m
        && weeks[i + span].getFullYear() === y) span++;
      out.push({ label: `${MONTHS_NL[m]} ${String(y).slice(2)}`, span });
      i += span;
    }
    return out;
  }, [weeks]);

  const TodayLine = () =>
    todayCol < 0 ? null : (
      <div
        className="absolute top-0 bottom-0 w-px bg-foreground/30 pointer-events-none z-[1]"
        style={{ left: todayCol * COL + COL / 2 }}
      />
    );

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div ref={scrollerRef} className="overflow-x-auto">
        <div className="min-w-max">

          {/* kop met maanden en weeknummers */}
          <div className="flex sticky top-0 z-[40] bg-muted/30 backdrop-blur border-b">
            <div
              className="flex-none border-r px-3 flex items-center text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30"
              style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
            >
              Klant / project
            </div>
            <div className="relative" style={{ width: trackWidth }}>
              <div className="flex h-6 items-center">
                {monthSpans.map((m, i) => (
                  <div
                    key={i}
                    className="flex-none h-full flex items-center pl-1.5 border-l text-[10px] uppercase tracking-wider text-muted-foreground"
                    style={{ width: m.span * COL }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="flex h-5">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="flex-none border-l border-border/40 flex items-center justify-center text-[9px] text-muted-foreground/70 tabular-nums"
                    style={{ width: COL }}
                  >
                    {format(w, "d")}
                  </div>
                ))}
              </div>
              {todayCol >= 0 && (
                <div
                  className="absolute top-1 -translate-x-1/2 text-[9px] uppercase tracking-wider px-1.5 rounded bg-foreground text-background z-[3]"
                  style={{ left: todayCol * COL + COL / 2 }}
                >
                  vandaag
                </div>
              )}
            </div>
          </div>

          {groups.length === 0 && (
            <p className="px-4 py-10 text-sm text-muted-foreground">
              Geen projecten die aan de filters voldoen.
            </p>
          )}

          {groups.map(group => {
            const isOpen = !collapsed.has(group.name);
            const groupHours = group.projects.reduce(
              (sum, p) => sum + Object.values(hoursByProject[p.id] || {}).reduce((a, b) => a + b, 0), 0);

            return (
              <div key={group.name}>
                {/* klantband */}
                <div className="flex border-b border-border/40 bg-muted/10">
                  <button
                    type="button"
                    onClick={() => toggleClient(group.name)}
                    className="flex-none border-r px-3 py-1.5 flex items-center gap-1.5 text-left hover:bg-muted/30 bg-muted/10"
                    style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
                  >
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-none" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-none" />}
                    <span className="text-xs font-medium truncate">{group.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums flex-none">
                      {Math.round(groupHours)}u
                    </span>
                  </button>
                  <div className="relative" style={{ width: trackWidth }}>
                    <TodayLine />
                  </div>
                </div>

                {isOpen && group.projects.map(p => {
                  const span = spanFor(p);
                  const rgb = STATUS_RGB[p.status] || STATUS_RGB.Active;
                  const projectMilestones = milestones.filter(m => m.projectId === p.id);

                  return (
                    <div key={p.id} className="flex border-b border-border/30 hover:bg-muted/20 group/row">
                      <button
                        type="button"
                        onClick={() => onProjectClick(p)}
                        className="flex-none border-r pl-6 pr-3 py-2 flex items-center gap-2 text-left bg-background group-hover/row:bg-muted/20"
                        style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
                      >
                        <span className={cn("w-1 h-1 rounded-full flex-none", STATUS_DOT[p.status])} />
                        <span className="text-xs truncate">{p.name}</span>
                        {p.budget ? (
                          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums flex-none">
                            {p.budget}u
                          </span>
                        ) : null}
                      </button>

                      <div
                        className="relative"
                        style={{
                          width: trackWidth,
                          backgroundImage:
                            `repeating-linear-gradient(to right, hsl(var(--border)/0.35) 0 1px, transparent 1px ${COL}px)`,
                        }}
                      >
                        {span && (
                          <div
                            className="absolute top-1.5 h-4 rounded-sm overflow-hidden flex"
                            style={{
                              left: span.start * COL + 2,
                              width: (span.end - span.start + 1) * COL - 4,
                            }}
                          >
                            {Array.from({ length: span.end - span.start + 1 }, (_, i) => {
                              const key = weekKeys[span.start + i];
                              const h = hoursByProject[p.id]?.[key] || 0;
                              return (
                                <div
                                  key={i}
                                  title={`${key} · ${h ? h + " uur" : "geen uren"}`}
                                  className={cn("flex-none", h === 0 && "bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.08)_0_3px,transparent_3px_6px)]")}
                                  style={{
                                    width: COL,
                                    background: h > 0 ? `rgba(${rgb},${intensity(h)})` : undefined,
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {projectMilestones.map(m => {
                          const col = columnFor(m.dueDate);
                          if (col < 0) return null;
                          const past = m.dueDate < todayKey;
                          return (
                            <Tooltip key={m.id} delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span
                                  className="absolute top-2 w-3.5 h-3.5 -ml-[7px] flex items-center justify-center z-[2]"
                                  style={{ left: col * COL + COL / 2 }}
                                >
                                  <span
                                    className={cn(
                                      "block w-2 h-2 rotate-45 box-border ring-1 ring-background",
                                      m.soft
                                        ? cn("bg-transparent border-[1.5px]",
                                            past ? "border-muted-foreground/60" : "border-emerald-400")
                                        : past ? "bg-muted-foreground/60" : "bg-emerald-400"
                                    )}
                                  />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="z-50">
                                <p className="text-xs">
                                  {m.dueDate.split("-").reverse().join("-")} — {m.title}
                                  {m.soft && <span className="text-muted-foreground"> · zacht</span>}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}

                        <TodayLine />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* legenda */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <i className="w-5 h-2 rounded-sm bg-emerald-500" /> Active
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-5 h-2 rounded-sm bg-blue-500" /> Pipeline
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-5 h-2 rounded-sm bg-amber-500" /> On Hold
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-5 h-2 rounded-sm bg-gradient-to-r from-emerald-500/25 to-emerald-500" />
              weinig → veel uren
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2 h-2 rotate-45 bg-emerald-400" /> harde deadline
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2 h-2 rotate-45 border-[1.5px] border-emerald-400 box-border" /> zachte deadline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
