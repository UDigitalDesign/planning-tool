import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-df7b7803/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all planning data
app.get("/make-server-df7b7803/planning", async (c) => {
  try {
    const [projects, clients, weeklyHours] = await Promise.all([
      kv.get("projects"),
      kv.get("clients"),
      kv.get("weekly_hours")
    ]);
    return c.json({ 
      projects: projects || null, 
      clients: clients || null, 
      weeklyHours: weeklyHours || null 
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Save projects
app.post("/make-server-df7b7803/planning/projects", async (c) => {
  try {
    const { projects } = await c.req.json();
    await kv.set("projects", projects);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Save clients
app.post("/make-server-df7b7803/planning/clients", async (c) => {
  try {
    const { clients } = await c.req.json();
    await kv.set("clients", clients);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

// Save weekly hours
app.post("/make-server-df7b7803/planning/hours", async (c) => {
  try {
    const { weeklyHours } = await c.req.json();
    await kv.set("weekly_hours", weeklyHours);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});

Deno.serve(app.fetch);