import React from "react";
import { format, endOfWeek } from "date-fns";
import { User, WeeklyHour } from "../../data/types";
import { cn } from "../../../lib/utils";
import { GridColumn } from "../../utils/dateUtils";

interface CapacityOverviewProps {
  columns: GridColumn[];
  users: User[];
  weeklyHours: WeeklyHour[];
  selectedPersonId: string | "all";
}

export const CapacityOverview: React.FC<CapacityOverviewProps> = ({
  columns,
  users,
  weeklyHours,
  selectedPersonId,
}) => {
  // Calculate capacity
  const getCapacity = (column: GridColumn) => {
    if (column.type === "week") {
      const dateKey = format(column.date, "yyyy-MM-dd");
      
      if (selectedPersonId === "all") {
        // Sum for all
        const totalPlanned = weeklyHours
          .filter(h => h.weekStartDate === dateKey)
          .reduce((sum, h) => sum + h.hours, 0);
        const totalContract = users.reduce((sum, u) => sum + u.weeklyContractHours, 0);
        return { planned: totalPlanned, contract: totalContract };
      } else {
        const user = users.find(u => u.id === selectedPersonId);
        if (!user) return { planned: 0, contract: 0 };
        
        const totalPlanned = weeklyHours
          .filter(h => h.weekStartDate === dateKey && h.userId === selectedPersonId)
          .reduce((sum, h) => sum + h.hours, 0);
        return { planned: totalPlanned, contract: user.weeklyContractHours };
      }
    } else {
      // Month Total
      const weekColumns = columns.filter(c => c.type === "week");
      const weekDates = weekColumns.map(c => format(c.date, "yyyy-MM-dd"));
      
      if (selectedPersonId === "all") {
        const totalPlanned = weeklyHours
          .filter(h => weekDates.includes(h.weekStartDate))
          .reduce((sum, h) => sum + h.hours, 0);
        return { planned: totalPlanned, contract: 0 }; 
      } else {
        const user = users.find(u => u.id === selectedPersonId);
        if (!user) return { planned: 0, contract: 0 };
        
        const totalPlanned = weeklyHours
          .filter(h => h.userId === selectedPersonId && weekDates.includes(h.weekStartDate))
          .reduce((sum, h) => sum + h.hours, 0);
          
        const totalContract = user.weeklyContractHours * weekColumns.length;
        return { planned: totalPlanned, contract: totalContract };
      }
    }
  };

  const getHeatmapColor = (planned: number, contract: number) => {
      // Default neutral style for all normal states (including 0)
      const neutral = "bg-zinc-800/40 text-zinc-300 border border-zinc-700/30";

      if (contract === 0) return neutral;

      // Only highlight overcapacity in orange
      if (planned > contract) {
          return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      }

      // Everything at or under capacity: same neutral look
      return neutral;
  };

  return (
    <div className="flex">
      {/* Sidebar Header Placeholder */}
      <div className="w-96 flex-none p-4 font-semibold text-muted-foreground border-r flex flex-col justify-center bg-muted/20">
        <div className="flex items-center gap-2">
            <span>Team Capacity</span>
            {selectedPersonId !== "all" && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Selected User</span>}
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-1">
        {columns.map((col, i) => {
          const { planned, contract } = getCapacity(col);
          const isMonth = col.type === "month";
          const isAll = selectedPersonId === "all";
          const showContract = !isAll && contract > 0;
          
          const heatmapClass = !isAll ? getHeatmapColor(planned, contract) : "";

          return (
            <div key={i} className={cn(
              "flex-1 min-w-[60px] p-2 flex flex-col items-center justify-end group border-b-4 border-transparent hover:border-muted-foreground/20 transition-all",
              isMonth && "min-w-[100px]"
            )}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium">
                {isMonth ? (
                  <span className="text-foreground font-bold">{col.label}</span>
                ) : (
                  <>
                    {format(col.date, "MMM d")}
                  </>
                )}
              </div>

              {/* Capacity Pill */}
              <div className={cn(
                  "flex items-center justify-center gap-1 text-[11px] tabular-nums px-2 py-1 rounded-md min-w-[3rem] transition-colors",
                  heatmapClass
              )}>
                <span className={cn(isAll && "text-zinc-200")}>
                  {planned}
                </span>
                {showContract && (
                    <>
                        <span className="opacity-60">/</span>
                        <span className="opacity-80">{contract}</span>
                    </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};