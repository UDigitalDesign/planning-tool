import { supabase } from "./supabaseClient";
import { User } from "../data/mockData";

// teamService is nu grotendeels overbodig omdat planningApi.saveUsers
// de volledige user-lijst beheert. We houden het aan voor eventueel
// toekomstig gebruik met individuele CRUD-operaties.

export const teamService = {
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("name");

    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        console.warn("Supabase table 'users' not found. Using mock data.");
        return [];
      }
      console.error("Error fetching users:", error);
      throw error;
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      weeklyContractHours: row.weekly_contract_hours,
      color: row.color,
      initials: row.initials,
      costRate: row.cost_rate != null ? Number(row.cost_rate) : undefined,
    }));
  },

  async addUser(user: Omit<User, "id">): Promise<User> {
    const newId = Math.random().toString(36).substr(2, 9);
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id: newId,
          name: user.name,
          role: user.role,
          weekly_contract_hours: user.weeklyContractHours,
          color: user.color,
          initials: user.initials,
          cost_rate: user.costRate ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding user:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      weeklyContractHours: data.weekly_contract_hours,
      color: data.color,
      initials: data.initials,
      costRate: data.cost_rate != null ? Number(data.cost_rate) : undefined,
    };
  },

  async updateUser(user: User): Promise<User> {
    const { data, error } = await supabase
      .from("users")
      .update({
        name: user.name,
        role: user.role,
        weekly_contract_hours: user.weeklyContractHours,
        color: user.color,
        initials: user.initials,
        cost_rate: user.costRate ?? null,
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      weeklyContractHours: data.weekly_contract_hours,
      color: data.color,
      initials: data.initials,
      costRate: data.cost_rate != null ? Number(data.cost_rate) : undefined,
    };
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
};
