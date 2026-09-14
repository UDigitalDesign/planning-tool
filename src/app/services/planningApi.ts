import { supabase } from "./supabaseClient";
import {
  Project,
  Client,
  WeeklyHour,
  User,
  ProjectAssignment,
  ProjectWeekNote,
  WeeklyNote,
  Milestone,
} from "../data/types";

// ============================================================
// Mapping helpers: DB (snake_case) <-> App (camelCase)
// ============================================================

const mapMilestoneFromDb = (row: any): Milestone => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  dueDate: row.due_date,
  endDate: row.end_date ?? null,
  done: !!row.done,
});

const mapMilestoneToDb = (m: Milestone) => ({
  id: m.id,
  project_id: m.projectId,
  title: m.title,
  due_date: m.dueDate,
  end_date: m.endDate || null,
  done: m.done,
});

const mapUserFromDb = (row: any): User => ({
  id: row.id,
  name: row.name,
  role: row.role,
  weeklyContractHours: row.weekly_contract_hours,
  color: row.color,
  initials: row.initials,
  costRate: row.cost_rate != null ? Number(row.cost_rate) : undefined,
});

const mapUserToDb = (u: User) => ({
  id: u.id,
  name: u.name,
  role: u.role,
  weekly_contract_hours: u.weeklyContractHours,
  color: u.color,
  initials: u.initials,
  cost_rate: u.costRate ?? null,
});

const mapClientFromDb = (row: any): Client => ({
  id: row.id,
  name: row.name,
  status: row.status,
  order: row.order ?? undefined,
  billableOrder: row.billable_order ?? undefined,
  nonBillableOrder: row.non_billable_order ?? undefined,
  defaultCategory: row.default_category ?? undefined,
});

const mapClientToDb = (c: Client) => ({
  id: c.id,
  name: c.name,
  status: c.status,
  order: c.order ?? null,
  billable_order: c.billableOrder ?? null,
  non_billable_order: c.nonBillableOrder ?? null,
  default_category: c.defaultCategory ?? null,
});

const mapProjectFromDb = (row: any): Project => ({
  id: row.id,
  name: row.name,
  category: row.category,
  clientId: row.client_id ?? undefined,
  status: row.status,
  projectCode: row.project_code ?? undefined,
  projectManager: row.project_manager ?? undefined,
  description: row.description ?? undefined,
  expectancy: row.expectancy ?? undefined,
  budget: row.budget != null ? Number(row.budget) : undefined,
  order: row.order ?? undefined,
});

const mapProjectToDb = (p: Project) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  client_id: p.clientId || null,
  status: p.status,
  project_code: p.projectCode ?? null,
  project_manager: p.projectManager ?? null,
  description: p.description ?? null,
  expectancy: p.expectancy ?? null,
  budget: p.budget ?? null,
  order: p.order ?? null,
});

const mapHourFromDb = (row: any): WeeklyHour => ({
  id: row.id,
  projectId: row.project_id,
  userId: row.user_id,
  weekStartDate: row.week_start_date,
  hours: Number(row.hours),
});

const mapHourToDb = (h: WeeklyHour) => ({
  id: h.id,
  project_id: h.projectId,
  user_id: h.userId,
  week_start_date: h.weekStartDate,
  hours: h.hours,
});

const mapProjectNoteFromDb = (row: any): ProjectWeekNote => ({
  id: row.id,
  projectId: row.project_id,
  weekStartDate: row.week_start_date,
  note: row.note,
  type: row.type ?? "info",
});

const mapProjectNoteToDb = (n: ProjectWeekNote) => ({
  id: n.id,
  project_id: n.projectId,
  week_start_date: n.weekStartDate,
  note: n.note,
  type: n.type ?? "info",
});

const mapUserNoteFromDb = (row: any): WeeklyNote => ({
  id: row.id,
  userId: row.user_id,
  weekStartDate: row.week_start_date,
  note: row.note,
});

// ============================================================
// API — alle operaties via directe Supabase client calls
// ============================================================

export const planningApi = {
  // ---- GET ALL DATA ----
  getData: async () => {
    try {
      const [usersRes, clientsRes, projectsRes, hoursRes, assignmentsRes, projectNotesRes, userNotesRes, milestonesRes] =
        await Promise.all([
          supabase.from("users").select("*").order("name"),
          supabase.from("clients").select("*"),
          supabase.from("projects").select("*"),
          supabase.from("weekly_hours").select("*"),
          supabase.from("assignments").select("*"),
          supabase.from("project_week_notes").select("*"),
          supabase.from("user_week_notes").select("*"),
          supabase.from("project_milestones").select("*").order("due_date"),
        ]);

      return {
        users: usersRes.data ? usersRes.data.map(mapUserFromDb) : null,
        clients: clientsRes.data ? clientsRes.data.map(mapClientFromDb) : null,
        projects: projectsRes.data ? projectsRes.data.map(mapProjectFromDb) : null,
        weeklyHours: hoursRes.data ? hoursRes.data.map(mapHourFromDb) : null,
        assignments: assignmentsRes.data
          ? assignmentsRes.data.map((r: any) => ({
              projectId: r.project_id,
              userId: r.user_id,
            }))
          : null,
        projectWeekNotes: projectNotesRes.data ? projectNotesRes.data.map(mapProjectNoteFromDb) : null,
        userWeekNotes: userNotesRes.data ? userNotesRes.data.map(mapUserNoteFromDb) : null,
        milestones: milestonesRes.data ? milestonesRes.data.map(mapMilestoneFromDb) : null,
      };
    } catch (error) {
      console.error("API getData Error:", error);
      return {
        users: null,
        clients: null,
        projects: null,
        weeklyHours: null,
        assignments: null,
        projectWeekNotes: null,
        userWeekNotes: null,
        milestones: null,
      };
    }
  },

  // ---- USERS ----
  saveUsers: async (users: User[]) => {
    try {
      const rows = users.map(mapUserToDb);
      const { error } = await supabase.from("users").upsert(rows, { onConflict: "id" });
      if (error) throw error;

      // Delete users that are no longer in the list
      const ids = users.map((u) => u.id);
      if (ids.length > 0) {
        const { error: delError } = await supabase
          .from("users")
          .delete()
          .not("id", "in", `(${ids.join(",")})`);
        if (delError) console.warn("Delete stale users error:", delError);
      }
    } catch (error) {
      console.error("saveUsers Error:", error);
      throw error;
    }
  },

  // ---- CLIENTS ----
  saveClients: async (clients: Client[]) => {
    try {
      const rows = clients.map(mapClientToDb);
      const { error } = await supabase.from("clients").upsert(rows, { onConflict: "id" });
      if (error) throw error;

      // Note: no destructive "delete rows not in list" here. Clients are only ever
      // archived (status change), never removed from the array — so a stale-delete
      // would only risk clobbering rows another user just added.
    } catch (error) {
      console.error("saveClients Error:", error);
      throw error;
    }
  },

  // ---- PROJECTS ----
  // Upsert-only: safe to call on every reorder/status/add without wiping rows a
  // concurrent user added. Permanent removal goes through deleteProject().
  saveProjects: async (projects: Project[]) => {
    try {
      const rows = projects.map(mapProjectToDb);
      const { error } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    } catch (error) {
      console.error("saveProjects Error:", error);
      throw error;
    }
  },

  deleteProject: async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("deleteProject Error:", error);
      throw error;
    }
  },

  // ---- WEEKLY HOURS ----
  saveHours: async (weeklyHours: WeeklyHour[]) => {
    try {
      if (weeklyHours.length === 0) {
        // If empty, delete all hours
        const { error } = await supabase.from("weekly_hours").delete().neq("id", "___none___");
        if (error) console.warn("Delete all hours error:", error);
        return;
      }

      const rows = weeklyHours.map(mapHourToDb);
      const { error } = await supabase
        .from("weekly_hours")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;

      // Delete hours that are no longer in the list
      const ids = weeklyHours.map((h) => h.id);
      if (ids.length > 0) {
        const { error: delError } = await supabase
          .from("weekly_hours")
          .delete()
          .not("id", "in", `(${ids.join(",")})`);
        if (delError) console.warn("Delete stale hours error:", delError);
      }
    } catch (error) {
      console.error("saveHours Error:", error);
      throw error;
    }
  },

  // ---- ASSIGNMENTS ----
  saveAssignments: async (assignments: ProjectAssignment[]) => {
    try {
      // Assignments use composite PK (project_id, user_id), so we replace all
      // Step 1: Delete all existing assignments
      const { error: delError } = await supabase
        .from("assignments")
        .delete()
        .neq("project_id", "___none___"); // Trick to delete all rows
      if (delError) throw delError;

      // Step 2: Insert all current assignments
      if (assignments.length > 0) {
        const rows = assignments.map((a) => ({
          project_id: a.projectId,
          user_id: a.userId,
        }));
        const { error } = await supabase.from("assignments").insert(rows);
        if (error) throw error;
      }
    } catch (error) {
      console.error("saveAssignments Error:", error);
      throw error;
    }
  },

  // ---- PROJECT WEEK NOTES ----
  saveProjectWeekNotes: async (notes: ProjectWeekNote[]) => {
    try {
      if (notes.length === 0) {
        const { error } = await supabase.from("project_week_notes").delete().neq("id", "___none___");
        if (error) console.warn("Delete all project notes error:", error);
        return;
      }

      const rows = notes.map(mapProjectNoteToDb);
      const { error } = await supabase
        .from("project_week_notes")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;

      const ids = notes.map((n) => n.id);
      if (ids.length > 0) {
        const { error: delError } = await supabase
          .from("project_week_notes")
          .delete()
          .not("id", "in", `(${ids.join(",")})`);
        if (delError) console.warn("Delete stale project notes error:", delError);
      }
    } catch (error) {
      console.error("saveProjectWeekNotes Error:", error);
      throw error;
    }
  },

  // ---- MILESTONES ----
  saveMilestones: async (milestones: Milestone[]) => {
    try {
      if (milestones.length === 0) {
        const { error } = await supabase.from("project_milestones").delete().neq("id", "___none___");
        if (error) console.warn("Delete all milestones error:", error);
        return;
      }

      const rows = milestones.map(mapMilestoneToDb);
      const { error } = await supabase
        .from("project_milestones")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;

      const ids = milestones.map((m) => m.id);
      const { error: delError } = await supabase
        .from("project_milestones")
        .delete()
        .not("id", "in", `(${ids.join(",")})`);
      if (delError) console.warn("Delete stale milestones error:", delError);
    } catch (error) {
      console.error("saveMilestones Error:", error);
      throw error;
    }
  },

  // ---- USER WEEK NOTES ----
  saveUserWeekNotes: async (notes: WeeklyNote[]) => {
    try {
      if (notes.length === 0) {
        const { error } = await supabase.from("user_week_notes").delete().neq("id", "___none___");
        if (error) console.warn("Delete all user notes error:", error);
        return;
      }

      const rows = notes.map((n) => ({
        id: n.id,
        user_id: n.userId,
        week_start_date: n.weekStartDate,
        note: n.note,
      }));
      const { error } = await supabase
        .from("user_week_notes")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;

      const ids = notes.map((n) => n.id);
      if (ids.length > 0) {
        const { error: delError } = await supabase
          .from("user_week_notes")
          .delete()
          .not("id", "in", `(${ids.join(",")})`);
        if (delError) console.warn("Delete stale user notes error:", delError);
      }
    } catch (error) {
      console.error("saveUserWeekNotes Error:", error);
    }
  },
};
