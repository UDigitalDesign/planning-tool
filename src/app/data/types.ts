// Gedeelde types voor de planningstool. De data komt uit Supabase.

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
