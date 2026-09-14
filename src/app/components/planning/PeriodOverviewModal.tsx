import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isBefore, getISOWeek, startOfISOWeekYear, addWeeks } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { User, Project, Client, WeeklyHour } from "../../data/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const BILLING_RATE = 116; // Standard billing rate €/h

type PeriodMode = "month" | "weeks";

interface WeekOption {
  weekStartDate: string; // "yyyy-MM-dd"
  weekNumber: number;
  label: string; // "W5 · 27 jan"
  date: Date;
}

interface PeriodOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  projects: Project[];
  clients: Client[];
  weeklyHours: WeeklyHour[];
  currentDate: Date;
}

interface ProjectOverviewRow {
  project: Project;
  clientName: string;
  periodHours: number;
  totalHours: number;
  budget: number;
  remaining: number;
  periodCost: number;
  revenue: number;
  margin: number;
  marginPct: number;
  userBreakdown: {
    user: User;
    periodHours: number;
    totalHours: number;
    periodCost: number;
  }[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};

export const PeriodOverviewModal: React.FC<PeriodOverviewModalProps> = ({
  isOpen,
  onClose,
  users,
  projects,
  clients,
  weeklyHours,
  currentDate,
}) => {
  const [viewDate, setViewDate] = useState(currentDate);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");

  // Generate all available week options for the year (W1 – W52/53)
  const allWeekOptions: WeekOption[] = useMemo(() => {
    const year = viewDate.getFullYear();
    const options: WeekOption[] = [];
    // Start from ISO week 1 of the year
    const isoYearStart = startOfISOWeekYear(new Date(year, 0, 4)); // Jan 4 is always in ISO week 1
    const firstMonday = startOfWeek(isoYearStart, { weekStartsOn: 1 });
    for (let i = 0; i < 53; i++) {
      const weekDate = addWeeks(firstMonday, i);
      const wn = getISOWeek(weekDate);
      // Stop if we've looped into a new year's week 1 again (for years with 52 weeks)
      if (i > 0 && wn === 1) break;
      options.push({
        weekStartDate: format(weekDate, "yyyy-MM-dd"),
        weekNumber: wn,
        label: `W${wn} · ${format(weekDate, "d MMM")}`,
        date: weekDate,
      });
    }
    return options;
  }, [viewDate]);

  // Custom week range state – default to current month's first/last week
  const defaultStartWeek = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monday = startOfWeek(monthStart, { weekStartsOn: 1 });
    return format(monday, "yyyy-MM-dd");
  }, [currentDate]);

  const defaultEndWeek = useMemo(() => {
    const monthEnd = endOfMonth(currentDate);
    const monday = startOfWeek(monthEnd, { weekStartsOn: 1 });
    return format(monday, "yyyy-MM-dd");
  }, [currentDate]);

  const [customStartWeek, setCustomStartWeek] = useState(defaultStartWeek);
  const [customEndWeek, setCustomEndWeek] = useState(defaultEndWeek);

  // Compute the week start dates for the selected period
  const periodWeeks = useMemo(() => {
    if (periodMode === "month") {
      const monthStart = startOfMonth(viewDate);
      const monthEnd = endOfMonth(viewDate);
      const weeks: string[] = [];
      let current = startOfWeek(monthStart, { weekStartsOn: 1 });
      while (isBefore(current, monthEnd) || format(current, "yyyy-MM-dd") === format(monthEnd, "yyyy-MM-dd")) {
        weeks.push(format(current, "yyyy-MM-dd"));
        current = addDays(current, 7);
      }
      return weeks;
    } else {
      // Custom week range
      const weeks: string[] = [];
      const startIdx = allWeekOptions.findIndex(w => w.weekStartDate === customStartWeek);
      const endIdx = allWeekOptions.findIndex(w => w.weekStartDate === customEndWeek);
      if (startIdx >= 0 && endIdx >= 0) {
        const from = Math.min(startIdx, endIdx);
        const to = Math.max(startIdx, endIdx);
        for (let i = from; i <= to; i++) {
          weeks.push(allWeekOptions[i].weekStartDate);
        }
      }
      return weeks;
    }
  }, [periodMode, viewDate, customStartWeek, customEndWeek, allWeekOptions]);

  const numWeeks = periodWeeks.length;

  // Build project overview data
  const projectRows: ProjectOverviewRow[] = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== "Archived");

    return activeProjects
      .map((project) => {
        const clientName = project.clientId
          ? clients.find((c) => c.id === project.clientId)?.name || "-"
          : project.category === "Internal" ? "Internal" : "-";

        const projectHours = weeklyHours.filter((h) => h.projectId === project.id);
        const periodProjectHours = projectHours.filter((h) => periodWeeks.includes(h.weekStartDate));

        const periodHours = periodProjectHours.reduce((sum, h) => sum + h.hours, 0);
        const totalHours = projectHours.reduce((sum, h) => sum + h.hours, 0);
        const budget = project.budget || 0;
        const remaining = budget - totalHours;

        // Cost calculation: sum of (user hours × user cost rate) for this period
        let periodCost = 0;
        const userBreakdown = users
          .map((user) => {
            const userPeriod = periodProjectHours
              .filter((h) => h.userId === user.id)
              .reduce((sum, h) => sum + h.hours, 0);
            const userTotal = projectHours
              .filter((h) => h.userId === user.id)
              .reduce((sum, h) => sum + h.hours, 0);
            const userCost = userPeriod * (user.costRate || 0);
            periodCost += userCost;
            return {
              user,
              periodHours: userPeriod,
              totalHours: userTotal,
              periodCost: userCost,
            };
          })
          .filter((u) => u.periodHours > 0 || u.totalHours > 0);

        const revenue = budget * BILLING_RATE;
        const totalCost = projectHours.reduce((sum, h) => {
          const user = users.find((u) => u.id === h.userId);
          return sum + h.hours * (user?.costRate || 0);
        }, 0);
        const margin = revenue - totalCost;
        const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;

        return {
          project,
          clientName,
          periodHours,
          totalHours,
          budget,
          remaining,
          periodCost,
          revenue,
          margin,
          marginPct,
          userBreakdown,
        };
      })
      .filter((row) => row.periodHours > 0 || row.totalHours > 0 || row.budget > 0);
  }, [projects, clients, weeklyHours, users, periodWeeks]);

  // Filter to billable only for the project table
  const billableRows = projectRows.filter(r => r.project.category === "Billable projects");

  // User capacity data for pie charts
  const userCapacityData = useMemo(() => {
    return users.map((user) => {
      const totalCapacity = user.weeklyContractHours * numWeeks;
      const userHours = weeklyHours.filter(
        (h) => h.userId === user.id && periodWeeks.includes(h.weekStartDate)
      );

      let billable = 0;
      let nonBillable = 0;
      let internal = 0;

      userHours.forEach((h) => {
        const project = projects.find((p) => p.id === h.projectId);
        if (!project) return;
        if (project.category === "Billable projects") billable += h.hours;
        else if (project.category === "Non-billable projects") nonBillable += h.hours;
        else if (project.category === "Internal") internal += h.hours;
      });

      const totalBooked = billable + nonBillable + internal;
      const available = Math.max(0, totalCapacity - totalBooked);
      const utilizationPct = totalCapacity > 0 ? (billable / totalCapacity) * 100 : 0;

      return {
        user,
        totalCapacity,
        billable,
        nonBillable,
        internal,
        available,
        totalBooked,
        utilizationPct,
      };
    });
  }, [users, weeklyHours, projects, periodWeeks, numWeeks]);

  // Summary totals
  const totals = useMemo(() => {
    const totalPeriodHours = projectRows.reduce((s, r) => s + r.periodHours, 0);
    const totalPeriodCost = projectRows.reduce((s, r) => s + r.periodCost, 0);
    const totalBudget = billableRows.reduce((s, r) => s + r.budget, 0);
    const totalRevenue = billableRows.reduce((s, r) => s + r.revenue, 0);
    const totalMargin = billableRows.reduce((s, r) => s + r.margin, 0);
    const billableHours = billableRows.reduce((s, r) => s + r.periodHours, 0);
    return { totalPeriodHours, totalPeriodCost, totalBudget, totalRevenue, totalMargin, billableHours };
  }, [projectRows, billableRows]);

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#6b7280", "#27272a"];

  const renderProjectTable = (rows: ProjectOverviewRow[], title: string, showFinancials: boolean) => {
    if (rows.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{title}</h3>
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900/60 text-zinc-400">
                <th className="text-left py-2 px-3 font-medium w-[200px]">Project</th>
                <th className="text-left py-2 px-3 font-medium w-[100px]">Client</th>
                <th className="text-right py-2 px-3 font-medium w-[70px]">Period</th>
                <th className="text-right py-2 px-3 font-medium w-[70px]">Total</th>
                {showFinancials && <th className="text-right py-2 px-3 font-medium w-[70px]">Budget</th>}
                {showFinancials && <th className="text-right py-2 px-3 font-medium w-[70px]">Remaining</th>}
                {showFinancials && <th className="text-right py-2 px-3 font-medium w-[85px]">Cost</th>}
                {showFinancials && <th className="text-right py-2 px-3 font-medium w-[85px]">Revenue</th>}
                {showFinancials && <th className="text-right py-2 px-3 font-medium w-[70px]">Margin</th>}
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((row) => {
                const isExpanded = expandedProjects.has(row.project.id);
                const isOverBudget = row.budget > 0 && row.remaining < 0;
                const result: React.ReactNode[] = [
                  <tr
                    key={row.project.id}
                    className="border-t border-zinc-800/50 hover:bg-zinc-900/30 cursor-pointer transition-colors"
                    onClick={() => toggleProject(row.project.id)}
                  >
                    <td className="py-2 px-3 font-medium text-zinc-200">
                      <div className="flex items-center gap-1.5">
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-zinc-500 flex-none" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-zinc-500 flex-none" />
                        )}
                        <span className="truncate">{row.project.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-zinc-400 truncate">{row.clientName}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-zinc-200">{row.periodHours}h</td>
                    <td className="py-2 px-3 text-right tabular-nums text-zinc-400">{row.totalHours}h</td>
                    {showFinancials && (
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                        {row.budget > 0 ? `${row.budget}h` : "-"}
                      </td>
                    )}
                    {showFinancials && (
                      <td className={cn(
                        "py-2 px-3 text-right tabular-nums",
                        row.budget === 0 ? "text-zinc-600" : isOverBudget ? "text-orange-400" : "text-zinc-300"
                      )}>
                        {row.budget > 0 ? `${row.remaining}h` : "-"}
                      </td>
                    )}
                    {showFinancials && (
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                        {formatCurrency(row.periodCost)}
                      </td>
                    )}
                    {showFinancials && (
                      <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                        {row.revenue > 0 ? formatCurrency(row.revenue) : "-"}
                      </td>
                    )}
                    {showFinancials && (
                      <td className={cn(
                        "py-2 px-3 text-right tabular-nums",
                        row.revenue === 0 ? "text-zinc-600" : row.margin >= 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {row.revenue > 0 ? `${Math.round(row.marginPct)}%` : "-"}
                      </td>
                    )}
                  </tr>,
                ];
                if (isExpanded) {
                  row.userBreakdown.forEach((ub) => {
                    result.push(
                      <tr
                        key={`${row.project.id}-${ub.user.id}`}
                        className="border-t border-zinc-800/30 bg-zinc-900/20"
                      >
                        <td className="py-1.5 px-3 pl-8" colSpan={2}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium text-white flex-none", ub.user.color)}>
                              {ub.user.initials}
                            </div>
                            <span className="text-zinc-400">{ub.user.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-zinc-400">{ub.periodHours}h</td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-zinc-500">{ub.totalHours}h</td>
                        {showFinancials && <td className="py-1.5 px-3"></td>}
                        {showFinancials && <td className="py-1.5 px-3"></td>}
                        {showFinancials && (
                          <td className="py-1.5 px-3 text-right tabular-nums text-zinc-500">
                            {formatCurrency(ub.periodCost)}
                          </td>
                        )}
                        {showFinancials && <td className="py-1.5 px-3"></td>}
                        {showFinancials && <td className="py-1.5 px-3"></td>}
                      </tr>
                    );
                  });
                }
                return result;
              })}
              {/* Subtotal */}
              <tr className="border-t border-zinc-700 bg-zinc-900/40">
                <td className="py-2 px-3 font-medium text-zinc-300" colSpan={2}>Subtotal</td>
                <td className="py-2 px-3 text-right tabular-nums font-medium text-zinc-200">
                  {rows.reduce((s, r) => s + r.periodHours, 0)}h
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                  {rows.reduce((s, r) => s + r.totalHours, 0)}h
                </td>
                {showFinancials && (
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                    {rows.reduce((s, r) => s + r.budget, 0)}h
                  </td>
                )}
                {showFinancials && <td className="py-2 px-3"></td>}
                {showFinancials && (
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                    {formatCurrency(rows.reduce((s, r) => s + r.periodCost, 0))}
                  </td>
                )}
                {showFinancials && (
                  <td className="py-2 px-3 text-right tabular-nums text-zinc-400">
                    {formatCurrency(rows.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                )}
                {showFinancials && <td className="py-2 px-3"></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs shadow-lg">
          <span className="text-zinc-300">{payload[0].name}: </span>
          <span className="text-zinc-100 font-medium">{payload[0].value}h</span>
        </div>
      );
    }
    return null;
  };

  // Period label for the sub-text on summary cards
  const periodLabel = useMemo(() => {
    if (periodMode === "month") {
      return format(viewDate, "MMMM yyyy");
    }
    const startOpt = allWeekOptions.find(w => w.weekStartDate === customStartWeek);
    const endOpt = allWeekOptions.find(w => w.weekStartDate === customEndWeek);
    if (startOpt && endOpt) {
      return `W${startOpt.weekNumber} – W${endOpt.weekNumber}`;
    }
    return "";
  }, [periodMode, viewDate, customStartWeek, customEndWeek, allWeekOptions]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col bg-zinc-950 border-zinc-800 text-zinc-50 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-800 flex-none">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Period Overview</DialogTitle>
            <div className="flex items-center gap-3">
              {/* Mode toggle */}
              <div className="flex items-center bg-zinc-900 rounded-md p-0.5 text-[11px]">
                <button
                  className={cn(
                    "px-2.5 py-1 rounded transition-colors",
                    periodMode === "month"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  onClick={() => setPeriodMode("month")}
                >
                  Month
                </button>
                <button
                  className={cn(
                    "px-2.5 py-1 rounded transition-colors flex items-center gap-1",
                    periodMode === "weeks"
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  onClick={() => setPeriodMode("weeks")}
                >
                  <Calendar className="h-3 w-3" />
                  Weeks
                </button>
              </div>

              {/* Month navigator or Week range selectors */}
              {periodMode === "month" ? (
                <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    onClick={() => setViewDate((prev) => startOfMonth(addDays(startOfMonth(prev), -1)))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-36 text-center text-zinc-200">
                    {format(viewDate, "MMMM yyyy")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    onClick={() => setViewDate((prev) => startOfMonth(addDays(endOfMonth(prev), 1)))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={customStartWeek}
                    onChange={(e) => setCustomStartWeek(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 appearance-none cursor-pointer"
                  >
                    {allWeekOptions.map((w) => (
                      <option key={w.weekStartDate} value={w.weekStartDate}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-zinc-500 text-xs">to</span>
                  <select
                    value={customEndWeek}
                    onChange={(e) => setCustomEndWeek(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 appearance-none cursor-pointer"
                  >
                    {allWeekOptions.map((w) => (
                      <option key={w.weekStartDate} value={w.weekStartDate}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">Overview of hours, costs, and capacity for the selected period.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-3">
            <SummaryCard label="Period Hours" value={`${totals.totalPeriodHours}h`} sub={`${numWeeks} weeks · ${periodLabel}`} />
            <SummaryCard label="Billable Hours" value={`${totals.billableHours}h`} sub={`of ${totals.totalPeriodHours}h total`} />
            <SummaryCard label="Period Cost" value={formatCurrency(totals.totalPeriodCost)} sub="team cost" />
            <SummaryCard label="Revenue (budget)" value={formatCurrency(totals.totalRevenue)} sub={`${totals.totalBudget}h × €${BILLING_RATE}`} />
            <SummaryCard
              label="Margin"
              value={formatCurrency(totals.totalMargin)}
              sub={totals.totalRevenue > 0 ? `${Math.round((totals.totalMargin / totals.totalRevenue) * 100)}%` : "-"}
              accent={totals.totalMargin >= 0 ? "green" : "red"}
            />
          </div>

          {/* Project Tables */}
          {renderProjectTable(billableRows, "Billable Projects", true)}

          {/* Team Capacity */}
          <div>
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Team Capacity</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {userCapacityData.map((ud) => {
                const pieData = [
                  { name: "Billable", value: ud.billable },
                  { name: "Non-billable", value: ud.nonBillable },
                  { name: "Internal", value: ud.internal },
                  { name: "Available", value: ud.available },
                ].filter(d => d.value > 0);

                // If no data at all, show full "Available"
                if (pieData.length === 0) {
                  pieData.push({ name: "Available", value: ud.totalCapacity });
                }

                return (
                  <div key={ud.user.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2 self-start">
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-none", ud.user.color)}>
                        {ud.user.initials}
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{ud.user.name}</span>
                    </div>

                    <div className="w-[100px] h-[100px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={42}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {pieData.map((entry, index) => {
                              const colorMap: Record<string, string> = {
                                "Billable": "#3b82f6",
                                "Non-billable": "#8b5cf6",
                                "Internal": "#6b7280",
                                "Available": "#27272a",
                              };
                              return <Cell key={entry.name} fill={colorMap[entry.name] || PIE_COLORS[index % PIE_COLORS.length]} />;
                            })}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-2 w-full space-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-blue-400">Billable</span>
                        <span className="text-zinc-300 tabular-nums">{ud.billable}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-400">Non-billable</span>
                        <span className="text-zinc-300 tabular-nums">{ud.nonBillable}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Internal</span>
                        <span className="text-zinc-300 tabular-nums">{ud.internal}h</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-800 pt-0.5 mt-1">
                        <span className="text-zinc-400">Capacity</span>
                        <span className="text-zinc-300 tabular-nums">{ud.totalBooked}h / {ud.totalCapacity}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Utilization</span>
                        <span className={cn("tabular-nums", ud.utilizationPct >= 60 ? "text-emerald-400" : "text-zinc-400")}>
                          {Math.round(ud.utilizationPct)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Billable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Non-billable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Internal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-800" />
                <span>Available</span>
              </div>
              <span className="ml-auto">Utilization = billable / capacity</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; sub: string; accent?: "green" | "red" }> = ({
  label,
  value,
  sub,
  accent,
}) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2.5">
    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={cn(
      "text-lg tabular-nums font-medium",
      accent === "green" ? "text-emerald-400" : accent === "red" ? "text-red-400" : "text-zinc-100"
    )}>
      {value}
    </div>
    <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>
  </div>
);