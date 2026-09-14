import React from "react";
import { PlanningDashboard } from "./components/planning/PlanningDashboard";
import { PasswordGate } from "./components/auth/PasswordGate";
import { Toaster } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useKeepAlive } from "./utils/useKeepAlive";

// Alles wat de database aanraakt hoort achter de gate: zonder sessie blokkeert
// RLS elke query, inclusief de keepalive-ping.
const Planner: React.FC = () => {
  // Voorkomt dat Supabase free-tier pauzeert door inactiviteit
  useKeepAlive();

  return (
    <DndProvider backend={HTML5Backend}>
      <PlanningDashboard />
    </DndProvider>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans dark">
      <PasswordGate>{() => <Planner />}</PasswordGate>
      <Toaster />
    </div>
  );
}
