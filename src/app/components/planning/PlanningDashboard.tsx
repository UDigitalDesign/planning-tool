import React, { useState } from "react";
import {
  User, Project, Client, WeeklyHour, WeeklyNote, ProjectWeekNote, ProjectAssignment,
  Category, ProjectStatus
} from "../../data/types";
import { getWeeksForMonth, formatDateKey, generateGridColumns } from "../../utils/dateUtils";
import { Header } from "./Header";
import { CapacityOverview } from "./CapacityOverview";
import { PlanningGrid } from "./PlanningGrid";
import { addDays, startOfWeek, subWeeks, addWeeks, subMonths, addMonths } from "date-fns";

import { ProjectModal } from "./ProjectModal";
import { ClientModal } from "./ClientModal";
import { planningApi } from "../../services/planningApi";
import { toast } from "sonner";

import { UserManagementModal } from "./UserManagementModal";
import { PeriodOverviewModal } from "./PeriodOverviewModal";

export const PlanningDashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHour[]>([]);
  const [projectWeekNotes, setProjectWeekNotes] = useState<ProjectWeekNote[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstRender = React.useRef(true);

  // Load data from Supabase
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const data = await planningApi.getData();
        
        // The database is the source of truth — never seed from mock data,
        // its ids do not match the live rows and the inserts fail on foreign keys.
        setUsers(data.users ?? []);
        setProjects(data.projects ?? []);
        setClients(data.clients ?? []);
        setWeeklyHours(data.weeklyHours ?? []);
        setProjectAssignments(data.assignments ?? []);
        setProjectWeekNotes(data.projectWeekNotes ?? []);

      } catch (error) {
        console.error("Failed to load data", error);
        toast.error("Couldn't load data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Debounced save for weekly hours
  React.useEffect(() => {
    if (isLoading) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
       planningApi.saveHours(weeklyHours).catch(() => {
         toast.error("Couldn't save hours — please reload the page");
       });
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [weeklyHours, isLoading]);

  // Debounced save for assignments
  const isFirstAssignmentRender = React.useRef(true);
  React.useEffect(() => {
    if (isLoading) return;
    if (isFirstAssignmentRender.current) {
      isFirstAssignmentRender.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
       planningApi.saveAssignments(projectAssignments).catch(() => {
         toast.error("Couldn't save team assignments — please reload the page");
       });
    }, 1000);

    return () => clearTimeout(timer);
  }, [projectAssignments, isLoading]);

  // Debounced save for project week notes
  const isFirstNotesRender = React.useRef(true);
  React.useEffect(() => {
    if (isLoading) return;
    if (isFirstNotesRender.current) {
      isFirstNotesRender.current = false;
      return;
    }
    
    const timer = setTimeout(() => {
       planningApi.saveProjectWeekNotes(projectWeekNotes).catch(() => {
         toast.error("Couldn't save notes — please reload the page");
       });
    }, 2000);

    return () => clearTimeout(timer);
  }, [projectWeekNotes, isLoading]);
  
  // Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  
  // Filters State
  const [selectedPersonId, setSelectedPersonId] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>(["Pipeline", "Active", "On Hold"]);

  // Row density (comfortable for entry, compact for scanning). Remembered across reloads.
  const [density, setDensity] = useState<"compact" | "comfortable">(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("planning-density");
      if (stored === "compact" || stored === "comfortable") return stored;
    }
    return "comfortable";
  });
  React.useEffect(() => {
    try { window.localStorage.setItem("planning-density", density); } catch { /* ignore */ }
  }, [density]);

  // Measured height of the sticky capacity overview, so category/client headers
  // can pin just beneath it while scrolling.
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const [stickyOffset, setStickyOffset] = useState(0);
  React.useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const update = () => setStickyOffset(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  
  // Expand State
  const [expandState, setExpandState] = useState<{ id: number; expanded: boolean } | undefined>(undefined);

  // Computed
  const columns = generateGridColumns(currentDate);

  const handlePrev = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNext = () => setCurrentDate(prev => addMonths(prev, 1));
  const handleToday = () => setCurrentDate(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Optimistic persist with rollback: apply state immediately, save in the
  // background, and if the save fails revert to the snapshot + surface an error.
  const commitProjects = (next: Project[]) => {
    const prev = projects;
    setProjects(next);
    planningApi.saveProjects(next).catch(() => {
      setProjects(prev);
      toast.error("Couldn't save changes — reverted");
    });
  };

  const commitClients = (next: Client[]) => {
    const prev = clients;
    setClients(next);
    planningApi.saveClients(next).catch(() => {
      setClients(prev);
      toast.error("Couldn't save changes — reverted");
    });
  };

  const handleUpdateUsers = async (updatedUsers: User[]) => {
    try {
      setUsers(updatedUsers);
      await planningApi.saveUsers(updatedUsers);
      toast.success("Team updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update team members");
    }
  };

  const handleAddUser = async (user: Omit<User, "id">) => {
    try {
      const newUser: User = { ...user, id: Math.random().toString(36).substr(2, 9) } as User;
      const newUsers = [...users, newUser];
      setUsers(newUsers);
      await planningApi.saveUsers(newUsers);
      toast.success("Team member added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add team member");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const newUsers = users.filter(u => u.id !== userId);
      setUsers(newUsers);
      await planningApi.saveUsers(newUsers);
      toast.success("Team member removed");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove team member");
    }
  };

  const handleUpdateHours = (projectId: string, userId: string, weekStart: string, hours: number) => {
    // Auto-allocate: if logging hours > 0 and not yet assigned, add assignment
    if (hours > 0) {
      const isAssigned = projectAssignments.some(a => a.projectId === projectId && a.userId === userId);
      if (!isAssigned) {
        setProjectAssignments(prev => [...prev, { projectId, userId }]);
      }
    }

    setWeeklyHours(prev => {
      const existingIndex = prev.findIndex(h => h.projectId === projectId && h.userId === userId && h.weekStartDate === weekStart);
      let newHours = [...prev];
      
      if (existingIndex >= 0) {
        if (hours === 0) {
           newHours.splice(existingIndex, 1); // Remove if 0
        } else {
           newHours[existingIndex] = { ...newHours[existingIndex], hours };
        }
      } else {
        if (hours === 0) return prev;
        newHours = [...prev, { id: `${projectId}-${userId}-${weekStart}`, projectId, userId, weekStartDate: weekStart, hours }];
      }
      
      // planningApi.saveHours(newHours); // Removed: handled by useEffect debounce
      return newHours;
    });
  };

  const handleUpdateProjectNote = (projectId: string, weekStart: string, note: string, type: 'info' | 'warning' | 'important' = 'info') => {
      setProjectWeekNotes(prev => {
          const existingIndex = prev.findIndex(n => n.projectId === projectId && n.weekStartDate === weekStart);
          let newNotes = [...prev];

          if (existingIndex >= 0) {
              if (!note.trim()) {
                  newNotes.splice(existingIndex, 1);
              } else {
                  newNotes[existingIndex] = { ...newNotes[existingIndex], note, type };
              }
          } else {
              if (!note.trim()) return prev;
              newNotes = [...prev, { id: Math.random().toString(36).substr(2, 9), projectId, weekStartDate: weekStart, note, type }];
          }
          return newNotes;
      });
  };

  const handleSaveProject = (savedProject: Project, pendingTeamUserIds?: string[]) => {
    let newProjects: Project[] = [];
    let newProjectId = savedProject.id;

    if (savedProject.id) {
       // Update existing
       newProjects = projects.map(p => p.id === savedProject.id ? savedProject : p);
    } else {
       // Create new
       newProjectId = Math.random().toString(36).substr(2, 9);
       const newProject: Project = {
          ...savedProject,
          id: newProjectId,
       };
       newProjects = [...projects, newProject];
    }
    commitProjects(newProjects);

    // If there are pending team members (from new project creation), create assignments
    if (pendingTeamUserIds && pendingTeamUserIds.length > 0 && newProjectId) {
      setProjectAssignments(prev => [
        ...prev,
        ...pendingTeamUserIds.map(userId => ({ projectId: newProjectId, userId }))
      ]);
    }

    setEditingProject(null);
  };

  const handleAddClient = (name: string, defaultCategory?: Category) => {
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      status: "Active",
      defaultCategory
    };
    const newClients = [...clients, newClient];
    commitClients(newClients);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    const newClients = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    commitClients(newClients);
  };

  const handleReorderProjects = (orderedIds: string[]) => {
    const newProjects = [...projects];
    orderedIds.forEach((id, index) => {
      const project = newProjects.find(p => p.id === id);
      if (project) {
        project.order = index + 1;
      }
    });
    commitProjects(newProjects);
  };

  const handleReorderClients = (orderedIds: string[], category?: Category) => {
    const newClients = [...clients];
    orderedIds.forEach((id, index) => {
      const client = newClients.find(c => c.id === id);
      if (client) {
        if (category === "Billable projects") {
            client.billableOrder = index + 1;
        } else if (category === "Non-billable projects") {
            client.nonBillableOrder = index + 1;
        } else {
            client.order = index + 1;
        }
      }
    });
    commitClients(newClients);
  };

  const handleRenameClient = (id: string, name: string) => {
    const newClients = clients.map(c => c.id === id ? { ...c, name } : c);
    commitClients(newClients);
  };

  const handleAddClientReturnId = (name: string, defaultCategory?: Category): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const newClient: Client = { id, name, status: "Active", defaultCategory };
    const newClients = [...clients, newClient];
    commitClients(newClients);
    return id;
  };

  const handleArchiveClient = (id: string) => {
    const newClients = clients.map(c => c.id === id ? { ...c, status: "Inactive" as const } : c);
    commitClients(newClients);
    const name = clients.find(c => c.id === id)?.name ?? "Client";
    toast(`${name} archived`, {
      action: { label: "Undo", onClick: () => handleUnarchiveClient(id) },
    });
  };

  const handleUnarchiveClient = (id: string) => {
    const newClients = clients.map(c => c.id === id ? { ...c, status: "Active" as const } : c);
    commitClients(newClients);
  };

  // Internal Project Management Handlers
  const handleAddInternalProject = (name: string) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      category: "Internal",
      status: "Active",
      team: [],
      budget: 0,
      order: projects.filter(p => p.category === "Internal").length + 1
    };
    const newProjects = [...projects, newProject];
    commitProjects(newProjects);
  };

  const handleAddProjectDirect = (name: string, clientId: string) => {
      // Find client to determine category
      const client = clients.find(c => c.id === clientId);
      const category = client?.defaultCategory || "Billable projects";

      const newProject: Project = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          clientId,
          category,
          status: "Active",
          team: [],
          budget: 0,
          order: projects.filter(p => p.clientId === clientId).length + 1
      };

      const newProjects = [...projects, newProject];
      commitProjects(newProjects);
  };

  const handleRenameProject = (id: string, name: string) => {
    const newProjects = projects.map(p => p.id === id ? { ...p, name } : p);
    commitProjects(newProjects);
  };

  const handleUpdateProjectStatus = (id: string, status: ProjectStatus) => {
    const project = projects.find(p => p.id === id);
    const prevStatus = project?.status;
    const newProjects = projects.map(p => p.id === id ? { ...p, status } : p);
    commitProjects(newProjects);

    if (status === "Archived" && prevStatus && prevStatus !== "Archived") {
      toast(`${project?.name ?? "Project"} archived`, {
        action: { label: "Undo", onClick: () => handleUpdateProjectStatus(id, prevStatus) },
      });
    }
  };

  const handleArchiveProject = (id: string) => {
    handleUpdateProjectStatus(id, "Archived");
  };

  const handleUnarchiveProject = (id: string) => {
    const newProjects = projects.map(p => p.id === id ? { ...p, status: "Active" as ProjectStatus } : p);
    commitProjects(newProjects);
  };

  const handleDeleteProject = (id: string) => {
    const prevProjects = projects;
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    // Dedicated row delete (not a whole-array upsert) so we don't wipe rows a
    // concurrent user added. Roll back on failure.
    planningApi.deleteProject(id).catch(() => {
      setProjects(prevProjects);
      toast.error("Couldn't delete project — reverted");
    });
    // Also clean up related data (persisted by the debounced effects)
    setWeeklyHours(prev => prev.filter(h => h.projectId !== id));
    setProjectAssignments(prev => prev.filter(a => a.projectId !== id));
  };

  // Assignment handlers
  const handleUpdateAssignments = (projectId: string, userIds: string[]) => {
    setProjectAssignments(prev => {
      const withoutProject = prev.filter(a => a.projectId !== projectId);
      const newAssignments = [...withoutProject, ...userIds.map(userId => ({ projectId, userId }))];
      return newAssignments;
    });
  };

  const handleToggleAssignment = (projectId: string, userId: string, assigned: boolean) => {
    setProjectAssignments(prev => {
      if (assigned) {
        // Add assignment if not already present
        const exists = prev.some(a => a.projectId === projectId && a.userId === userId);
        if (exists) return prev;
        return [...prev, { projectId, userId }];
      } else {
        // Remove assignment
        return prev.filter(a => !(a.projectId === projectId && a.userId === userId));
      }
    });
  };
  
  const startNewProject = (clientId?: string, category?: Category) => {
     setEditingProject({
        id: "", // Empty ID signals new project
        clientId: clientId || "",
        name: "",
        status: "Active",
        team: [],
        budget: 0,
        projectManager: "",
        category: category || "Billable projects" // Default category
     } as Project);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Navigation & Filters */}
      <Header 
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        users={users}
        selectedPersonId={selectedPersonId}
        onPersonChange={setSelectedPersonId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatuses={selectedStatuses}
        onStatusChange={setSelectedStatuses}
        onEditUsers={() => setIsUserModalOpen(true)}
        onToggleExpand={(expanded) => setExpandState({ id: Date.now(), expanded })}
        onOpenOverview={() => setIsOverviewOpen(true)}
        density={density}
        onDensityChange={setDensity}
      />

      {/* Sticky Capacity Overview */}
      {/* Main Grid Scrollable Area — CapacityOverview is inside the same scroll container for column alignment */}
      <div className="flex-1 overflow-auto bg-background">
        <div ref={stickyRef} className="sticky top-0 z-20 border-b bg-background">
          <CapacityOverview
            columns={columns}
            users={users}
            weeklyHours={weeklyHours}
            selectedPersonId={selectedPersonId}
          />
        </div>

        <PlanningGrid 
          columns={columns}
          users={users}
          projects={projects}
          clients={clients}
          weeklyHours={weeklyHours}
          onUpdateHours={handleUpdateHours}
          projectWeekNotes={projectWeekNotes}
          onUpdateProjectNote={handleUpdateProjectNote}
          searchQuery={searchQuery}
          selectedPersonId={selectedPersonId}
          selectedStatuses={selectedStatuses}
          projectAssignments={projectAssignments}
          onProjectClick={setEditingProject}
          onAddProject={startNewProject}
          onAddProjectDirect={handleAddProjectDirect}
          onAddClient={() => setIsClientModalOpen(true)}
          onReorderProjects={handleReorderProjects}
          onReorderClients={handleReorderClients}
          onAddClientDirect={handleAddClient}
          onRenameClient={handleRenameClient}
          onArchiveClient={handleArchiveClient}
          onUnarchiveClient={handleUnarchiveClient}
          onAddInternalProject={handleAddInternalProject}
          onRenameProject={handleRenameProject}
          onArchiveProject={handleArchiveProject}
          onUnarchiveProject={handleUnarchiveProject}
          onUpdateProjectStatus={handleUpdateProjectStatus}
          onDeleteProject={handleDeleteProject}
          expandState={expandState}
          onToggleAssignment={handleToggleAssignment}
          density={density}
          stickyOffset={stickyOffset}
        />
      </div>

      <ProjectModal 
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveProject}
        clients={clients}
        users={users}
        projectAssignments={projectAssignments}
        weeklyHours={weeklyHours}
        onUpdateAssignments={handleUpdateAssignments}
        onCreateClient={handleAddClientReturnId}
      />

      <ClientModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clients={clients}
        onAddClient={handleAddClient}
        onUpdateClient={handleUpdateClient}
      />

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        onUpdateUsers={handleUpdateUsers}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
      />

      <PeriodOverviewModal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        users={users}
        projects={projects}
        clients={clients}
        weeklyHours={weeklyHours}
        currentDate={currentDate}
      />
    </div>
  );
};