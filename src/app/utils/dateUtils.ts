import { startOfWeek, addDays, format, getDaysInMonth, startOfMonth, endOfMonth, isSameMonth, isWithinInterval, addWeeks, subWeeks } from "date-fns";

export interface GridColumn {
  type: "week" | "month";
  date: Date;
  label: string;
}

export const generateGridColumns = (date: Date): GridColumn[] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  
  // Find the start of the week for the 1st of the month
  const start = startOfWeek(monthStart, { weekStartsOn: 1 });
  
  // Find the start of the week for the last day of the month
  // We iterate until we pass the month
  const columns: GridColumn[] = [];
  
  let current = start;
  // We include any week that overlaps with the month
  // A week overlaps if its start is before monthEnd
  // Actually simpler: loop while start of week <= end of month? 
  // No, because end of month might be Tuesday. Start of that week is Monday.
  // So we include weeks where the week-start is <= month-end.
  
  // Better loop: 
  // Start at first monday. 
  // While the week start is <= monthEnd (actually correct, because even if month ends on Sunday, the week started before)
  // Or rather: While the week has any overlap with the month.
  // Since we start at startOfWeek(monthStart), we definitely overlap.
  // We stop when the week start is AFTER the month end.
  
  while (current <= monthEnd) {
      columns.push({
          type: "week",
          date: current,
          label: `Week ${format(current, "w")}`
      });
      current = addDays(current, 7);
  }

  // Always add the Month Total column at the very end
  columns.push({
      type: "month",
      date: monthStart,
      label: format(monthStart, "MMMM")
  });

  return columns;
};

export const getWeeksForMonth = (date: Date) => {
  // Deprecated usage, but keeping for compatibility if needed elsewhere
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const weeks = [];
  for (let i = 0; i < 5; i++) {
    weeks.push(addDays(start, i * 7));
  }
  return weeks;
};

export const formatDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export const getWeekLabel = (date: Date) => {
  return `Week ${format(date, "w")}`;
};
