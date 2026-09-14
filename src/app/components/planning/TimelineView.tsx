import React, { useState, useMemo, useRef } from "react";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Project, Client, WeeklyHour, ProjectStatus, Milestone, Category, ProjectAssignment } from "../../data/types";
import { cn } from "../../../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useDensity } from "./DensityContext";

const COL = 26;          // width of one week column in px
const NAME_W = 384;      // w-96, same frozen left column as the hours grid
const WEEKS_BEFORE = 6;  // how far back the timeline starts
const WEEKS_AHEAD = 32;  // and how far ahead it runs



/** rgb triplet per status, so a bar can vary in opacity with how busy the week is */
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

/** More hours in a week means a fuller colour. */
const intensity = (hours: number) => {
  if (hours <= 0) return 0;
  if (hours < 2) return 0.28;
  if (hours < 8) return 0.5;
  if (hours < 16) return 0.72;
  return 1;
};

/** Same order as the hours grid. */
const CATEGORY_ORDER: Category[] = ["Billable projects", "Non-billable projects", "Internal"];

interface TimelineViewProps {
  currentDate: Date;
  projects: Project[];
  clients: Client[];
  weeklyHours: WeeklyHour[];
  milestones: Milestone[];
  projectAssignments: ProjectAssignment[];
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
  projectAssignments,
  selectedPersonId,
  selectedStatuses,
  searchQuery,
  onProjectClick,
}) => {
  const density = useDensity();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollerRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  // --- week axis ----------------------------------------------------------
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

  /** Index of the column a date falls in; -1 when it sits outside the view. */
  const columnFor = (dateKey?: string | null) => {
    if (!dateKey) return -1;
    if (dateKey < weekKeys[0]) return -1;
    for (let i = weekKeys.length - 1; i >= 0; i--) {
      if (dateKey >= weekKeys[i]) return i;
    }
    return -1;
  };

  const todayCol = columnFor(todayKey);

  // --- hours per project per week -----------------------------------------
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

  /**
   * Projects the filtered person is tied to: assigned to them, or carrying hours
   * of theirs. The second catches projects someone works on without ever having
   * been formally assigned.
   */
  const projectsOfPerson = useMemo(() => {
    if (selectedPersonId === "all") return null;
    const ids = new Set<string>();
    for (const a of projectAssignments) {
      if (a.userId === selectedPersonId) ids.add(a.projectId);
    }
    for (const h of weeklyHours) {
      if (h.userId === selectedPersonId && h.hours > 0) ids.add(h.projectId);
    }
    return ids;
  }, [projectAssignments, weeklyHours, selectedPersonId]);

  // --- visible projects: category > client > project -----------------------
  const sections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const clientName = (id?: string) => clients.find(c => c.id === id)?.name || "";

    const visible = projects.filter(p => {
      if (!selectedStatuses.includes(p.status)) return false;
      // Filtering on one person: drop the clients they have nothing to do with.
      if (projectsOfPerson && !projectsOfPerson.has(p.id)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || clientName(p.clientId).toLowerCase().includes(q);
    });

    return CATEGORY_ORDER.map(category => {
      const inCategory = visible.filter(p => p.category === category);

      const byClient = new Map<string, Project[]>();
      const loose: Project[] = []; // projects without a client, mostly internal

      for (const p of inCategory) {
        const name = clientName(p.clientId);
        if (!name) { loose.push(p); continue; }
        if (!byClient.has(name)) byClient.set(name, []);
        byClient.get(name)!.push(p);
      }

      const byName = (a: Project, b: Project) => a.name.localeCompare(b.name);

      return {
        category,
        clients: [...byClient.entries()]
          .map(([name, ps]) => ({ name, projects: ps.sort(byName) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        loose: loose.sort(byName),
        count: inCategory.length,
      };
    }).filter(s => s.count > 0);
  }, [projects, clients, selectedStatuses, searchQuery, projectsOfPerson]);

  // --- bar span per project -----------------------------------------------
  /**
   * Start: the start date when set, otherwise the first week carrying hours.
   * End: the last deadline, otherwise the last week carrying hours. That way
   * nobody has to keep a separate end date in sync.
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

    // Clamp to the visible range so a bar that started earlier still runs in.
    const rawStart = columnFor(startKey);
    const start = rawStart === -1 ? (startKey < weekKeys[0] ? 0 : -1) : rawStart;
    const end = columnFor(endKey);
    if (start === -1 || end === -1 || end < start) return null;

    return { start, end, plannedEnd: columnFor(lastHour) };
  };

  // First render: scroll to today rather than into the past
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el || didScroll.current || todayCol < 0) return;
    el.scrollLeft = Math.max(0, todayCol * COL - el.clientWidth * 0.3);
    didScroll.current = true;
  }, [todayCol]);

  const toggleRow = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /** Hours for the person being filtered on, or the whole team when none is. */
  const totalHours = (p: Project) =>
    Object.values(hoursByProject[p.id] || {}).reduce((a, b) => a + b, 0);

  /** Always the whole team, so the planned / sold badge reads the same as the grid. */
  const teamHours = (p: Project) =>
    weeklyHours.reduce((sum, h) => (h.projectId === p.id ? sum + h.hours : sum), 0);

  // --- month headers -------------------------------------------------------
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
      out.push({ label: format(weeks[i], "MMM yy"), span });
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

  const renderProject = (p: Project, indented: boolean) => {
    const span = spanFor(p);
    const rgb = STATUS_RGB[p.status] || STATUS_RGB.Active;
    const projectMilestones = milestones.filter(m => m.projectId === p.id);

    return (
      <div key={p.id} className="flex border-b hover:bg-muted/5 transition-colors group">
        {/* Same sidebar as the hours grid: tree line, name, planned / sold badge */}
        <div
          className="flex-none flex p-0 border-r bg-background"
          style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
        >
          <div className={cn("flex-none relative flex justify-center items-center", indented ? "w-10" : "w-2")}>
            {indented && <div className="w-px h-full bg-border/30" />}
          </div>

          <div className={cn(
            "flex-1 pr-3 pl-2 flex items-center justify-between min-w-0 gap-2",
            density === "compact" ? "py-0.5" : "py-1.5"
          )}>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={cn("w-1 h-1 rounded-full flex-none", STATUS_DOT[p.status])} />
              <button
                type="button"
                onClick={() => onProjectClick(p)}
                className="font-normal text-sm truncate pr-2 text-left hover:text-primary hover:underline"
                title={p.name}
              >
                {p.name}
              </button>
            </div>

            {/* Planned vs. sold, matching the hours grid. Internal projects run
                all year, so a lifetime total there is noise. */}
            {p.category !== "Internal" && (
              <div className={cn(
                "flex items-center gap-1 text-[11px] tabular-nums leading-none text-zinc-400 bg-zinc-800/60 px-2 rounded border border-zinc-700/30 whitespace-nowrap flex-none",
                density === "compact" ? "py-0.5" : "py-1"
              )}>
                {selectedPersonId !== "all" && totalHours(p) > 0 && (
                  <span className="text-zinc-200 mr-0.5">({Math.round(totalHours(p))})</span>
                )}
                <span className={cn(
                  teamHours(p) > (p.budget || 0) && (p.budget || 0) > 0 ? "text-orange-400" : "text-zinc-300"
                )}>
                  {Math.round(teamHours(p))}
                </span>
                <span className="text-zinc-600 mx-0.5">/</span>
                <span className="text-zinc-400">{p.budget ? p.budget : "-"}</span>
              </div>
            )}
          </div>
        </div>

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
              className="absolute top-1/2 -translate-y-1/2 h-4 rounded-sm overflow-hidden flex"
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
                    title={`${key} · ${h ? h + " hours" : "no hours"}`}
                    className={cn(
                      "flex-none",
                      h === 0 && "bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.08)_0_3px,transparent_3px_6px)]"
                    )}
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
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 -ml-[7px] flex items-center justify-center z-[2]"
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
                    {format(new Date(m.dueDate), "d MMM yyyy")} — {m.title}
                    {m.soft && <span className="text-muted-foreground"> · soft</span>}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <TodayLine />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div ref={scrollerRef} className="overflow-x-auto">
        <div className="min-w-max">

          {/* header with months and day-of-month numbers */}
          <div className="flex sticky top-0 z-[40] bg-muted/30 backdrop-blur border-b">
            <div
              className="flex-none border-r px-4 flex items-center text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30"
              style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
            >
              Client / project
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
                  today
                </div>
              )}
            </div>
          </div>
          {sections.length === 0 && (
            <p className="px-4 py-10 text-sm text-muted-foreground">
              No projects match the current filters.
            </p>
          )}

          {sections.map(section => {
            const sectionOpen = !collapsed.has(section.category);
            const sectionHours = [
              ...section.clients.flatMap(c => c.projects),
              ...section.loose,
            ].reduce((sum, p) => sum + totalHours(p), 0);

            return (
              <div key={section.category} className="mb-10">
                {/* Category band — the one level that carries real weight, as in the grid */}
                <div className="flex bg-secondary text-secondary-foreground border-y shadow-sm">
                  <button
                    type="button"
                    onClick={() => toggleRow(section.category)}
                    className={cn(
                      "flex-none border-r px-4 flex items-center text-left bg-secondary hover:bg-secondary/90 transition-colors",
                      density === "compact" ? "py-1.5" : "py-2"
                    )}
                    style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
                  >
                    {sectionOpen
                      ? <ChevronDown className="h-4 w-4 mr-2 flex-none" />
                      : <ChevronRight className="h-4 w-4 mr-2 flex-none" />}
                    <span className="font-bold text-xs uppercase tracking-wider truncate">{section.category}</span>
                    <span className="ml-auto text-[11px] opacity-70 tabular-nums flex-none">
                      {Math.round(sectionHours)}h
                    </span>
                  </button>
                  <div className="relative" style={{ width: trackWidth }}>
                    <TodayLine />
                  </div>
                </div>

                {sectionOpen && (
                  <>
                    {section.clients.map(group => {
                      const key = section.category + "/" + group.name;
                      const isOpen = !collapsed.has(key);
                      const groupHours = group.projects.reduce((sum, p) => sum + totalHours(p), 0);

                      return (
                        <div key={key}>
                          <div className="flex bg-background hover:bg-muted/20 transition-colors border-b border-border/40">
                            <button
                              type="button"
                              onClick={() => toggleRow(key)}
                              className={cn(
                                "flex-none border-r pr-4 pl-2 flex items-center gap-1 text-left",
                                density === "compact" ? "py-1" : "py-1.5"
                              )}
                              style={{ width: NAME_W, position: "sticky", left: 0, zIndex: 2 }}
                            >
                              {isOpen
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-none" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />}
                              <span className="font-medium text-sm truncate">{group.name}</span>
                              <span className="ml-auto text-[11px] text-muted-foreground tabular-nums flex-none">
                                {Math.round(groupHours)}h
                              </span>
                            </button>
                            <div className="relative" style={{ width: trackWidth }}>
                              <TodayLine />
                            </div>
                          </div>

                          {isOpen && group.projects.map(p => renderProject(p, true))}
                        </div>
                      );
                    })}

                    {/* Projects without a client sit straight under the category */}
                    {section.loose.map(p => renderProject(p, false))}
                  </>
                )}
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
              fewer → more hours
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2 h-2 rotate-45 bg-emerald-400" /> hard deadline
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2 h-2 rotate-45 border-[1.5px] border-emerald-400 box-border" /> soft deadline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
