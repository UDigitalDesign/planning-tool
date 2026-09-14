import { addDays, format, startOfWeek } from "date-fns";

export type Role = "Admin" | "Member" | "Read-only";
export type Category = "Billable projects" | "Non-billable projects" | "Internal";
export type ProjectStatus = "Pipeline" | "Active" | "Completed" | "On Hold" | "Archived";
export type ClientStatus = "Active" | "Inactive";

export interface User {
  id: string;
  name: string;
  role: Role;
  weeklyContractHours: number;
  color: string;
  initials: string;
  costRate?: number; // Internal cost per hour (€)
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  order?: number;
  billableOrder?: number;
  nonBillableOrder?: number;
  defaultCategory?: Category;
}

export interface Project {
  id: string;
  name: string;
  category: Category;
  clientId?: string;
  status: ProjectStatus;
  projectCode?: string;
  projectManager?: string;
  description?: string;
  expectancy?: string; // Free text for pipeline projects
  budget?: number; // Total sold hours
  order?: number;
}

export interface ProjectAssignment {
  projectId: string;
  userId: string;
}

export interface WeeklyHour {
  id: string;
  projectId: string;
  userId: string;
  weekStartDate: string; // ISO date string YYYY-MM-DD (Monday)
  hours: number;
}

export interface WeeklyNote {
  id: string;
  userId: string;
  weekStartDate: string;
  note: string;
}

export interface ProjectWeekNote {
  id: string;
  projectId: string;
  weekStartDate: string;
  note: string;
  type?: 'info' | 'warning' | 'important';
}

// Mock Data

export const users: User[] = [
  { id: "u1", name: "Rik", role: "Admin", weeklyContractHours: 36, color: "bg-purple-600", initials: "R", costRate: 75 },
  { id: "u2", name: "Pasca", role: "Member", weeklyContractHours: 40, color: "bg-cyan-500", initials: "PP", costRate: 65 },
  { id: "u3", name: "Chris", role: "Member", weeklyContractHours: 40, color: "bg-orange-500", initials: "CG", costRate: 65 },
  { id: "u4", name: "Fleur", role: "Member", weeklyContractHours: 32, color: "bg-blue-600", initials: "FB", costRate: 60 },
  { id: "u5", name: "Erik", role: "Member", weeklyContractHours: 40, color: "bg-slate-700", initials: "EW", costRate: 70 },
];

export const clients: Client[] = [];

export const projects: Project[] = [
  // Internal
  { id: "p8", name: "Team Meetings", category: "Internal", status: "Active", order: 1 },
  { id: "p9", name: "Professional Development", category: "Internal", status: "Active", order: 2 },
  { id: "p10", name: "Vacation / Leave", category: "Internal", status: "Active", order: 3 },
  { id: "p11", name: "Sick Leave", category: "Internal", status: "Active", order: 4 },
];

export const projectAssignments: ProjectAssignment[] = [
  { projectId: "p8", userId: "u1" },
  { projectId: "p8", userId: "u2" },
  { projectId: "p8", userId: "u3" },
  { projectId: "p8", userId: "u4" },
];

// Helper to generate some hours
const generateWeeklyHours = (): WeeklyHour[] => {
  const hours: WeeklyHour[] = [];
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  
  // Generate for current week and next 3 weeks
  for (let i = 0; i < 4; i++) {
    const weekStart = addDays(startOfCurrentWeek, i * 7);
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    // Random assignments
    projectAssignments.forEach(assignment => {
      // 50% chance of having hours
      if (Math.random() > 0.3) {
        hours.push({
          id: `${assignment.projectId}-${assignment.userId}-${weekStartStr}`,
          projectId: assignment.projectId,
          userId: assignment.userId,
          weekStartDate: weekStartStr,
          hours: Math.floor(Math.random() * 8) + 2, // Random hours between 2 and 10
        });
      }
    });
  }
  return hours;
};

export const weeklyHours: WeeklyHour[] = generateWeeklyHours();

export const weeklyNotes: WeeklyNote[] = [];

export const projectWeekNotes: ProjectWeekNote[] = [
    { id: "pn1", projectId: "p10", weekStartDate: "2026-02-09", note: "Team Vacation Week" }
];