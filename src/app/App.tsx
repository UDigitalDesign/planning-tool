import React from "react";
import { PlanningDashboard } from "./components/planning/PlanningDashboard";
import { Toaster } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useKeepAlive } from "./utils/useKeepAlive";

export default function App() {
  // Voorkomt dat Supabase free-tier pauzeert door inactiviteit
  useKeepAlive();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans dark">
      <DndProvider backend={HTML5Backend}>
        <PlanningDashboard />
      </DndProvider>
      <Toaster />
    </div>
  );
}