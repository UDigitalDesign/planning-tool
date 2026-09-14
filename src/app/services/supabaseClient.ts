import { createClient } from "@supabase/supabase-js";

// Handmatige configuratie — jouw Supabase project
const SUPABASE_URL = "https://rknrwbrnsvyxtcolvihl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbnJ3YnJuc3Z5eHRjb2x2aWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTg1MjIsImV4cCI6MjA4NzI3NDUyMn0.CDi2WautelLdZBXTK_YAuYLmAD7ucg_RK56DC5Dmu6M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
