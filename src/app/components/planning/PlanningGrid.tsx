import React, { useState, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Pencil, ChevronsDown, ChevronsUp, Archive, GripVertical } from "lucide-react";
import { Project, Client, User, WeeklyHour, Category, ProjectStatus, ProjectWeekNote, ProjectAssignment } from "../../data/mockData";
import { ProjectRow } from "./ProjectRow";
import { DensityContext, useDensity, Density } from "./DensityContext";
import { cn } from "../../../lib/utils";
import { format } from "date-fns";
import { BreakdownModal } from "./BreakdownModal";
import { GridColumn } from "../../utils/dateUtils";
import { ReorderModal } from "./ReorderModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface PlanningGridProps {
  columns: GridColumn[];
  users: User[];
  projects: Project[];
  clients: Client[];
  weeklyHours: WeeklyHour[];
  onUpdateHours: (projectId: string, userId: string, weekStart: string, hours: number) => void;
  searchQuery: string;
  selectedPersonId: string | "all";
  selectedStatuses: ProjectStatus[];
  projectAssignments: ProjectAssignment[];
  onProjectClick: (project: Project) => void;
  onAddProject: (clientId?: string, category?: Category) => void;
  onAddProjectDirect: (name: string, clientId: string) => void;
  onAddClient: () => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onReorderClients: (orderedIds: string[], category?: Category) => void;
  onAddClientDirect: (name: string, category?: Category) => void;
  onRenameClient: (id: string, name: string) => void;
  onArchiveClient: (id: string) => void;
  onUnarchiveClient: (id: string) => void;
  onAddInternalProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onArchiveProject: (id: string) => void;
  onUnarchiveProject: (id: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectStatus) => void;
  onDeleteProject?: (id: string) => void;
  expandState?: { id: number; expanded: boolean };
  projectWeekNotes?: ProjectWeekNote[];
  onUpdateProjectNote?: (projectId: string, weekStart: string, note: string, type: 'info' | 'warning' | 'important') => void;
  onToggleAssignment?: (projectId: string, userId: string, assigned: boolean) => void;
  density?: Density;
  stickyOffset?: number;
}

export const PlanningGrid: React.FC<PlanningGridProps> = ({
  columns,
  users,
  projects,
  clients,
  weeklyHours,
  onUpdateHours,
  searchQuery,
  selectedPersonId,
  selectedStatuses,
  projectAssignments,
  onProjectClick,
  onAddProject,
  onAddProjectDirect,
  onAddClient,
  onReorderProjects,
  onReorderClients,
  onAddClientDirect,
  onRenameClient,
  onArchiveClient,
  onUnarchiveClient,
  onAddInternalProject,
  onRenameProject,
  onArchiveProject,
  onUnarchiveProject,
  onUpdateProjectStatus,
  onDeleteProject,
  expandState, // Kept for interface compatibility but functionality moved to Category level
  projectWeekNotes = [],
  onUpdateProjectNote,
  onToggleAssignment,
  density = "comfortable",
  stickyOffset = 0,
}) => {
  const [breakdownState, setBreakdownState] = useState<{ projectId: string; column: GridColumn } | null>(null);
  const [reorderState, setReorderState] = useState<{ 
    isOpen: boolean; 
    category?: Category; 
    type: "projects" | "clients";
    clientId?: string;
  }>({ isOpen: false, type: "projects" });

  const [renameClientState, setRenameClientState] = useState<{ isOpen: boolean; clientId: string; name: string } | null>(null);

  // Derived Reorder Items
  const getReorderItems = () => {
    if (!reorderState.isOpen) return { items: [], archivedItems: [] };
    
    if (reorderState.category === "Internal" && reorderState.type === "projects") {
         const activeProjects = projects.filter(p => p.category === "Internal" && p.status !== "Archived");
         const archivedProjects = projects.filter(p => p.category === "Internal" && p.status === "Archived");
         
         activeProjects.sort((a, b) => (a.order || 9999) - (b.order || 9999));
         archivedProjects.sort((a, b) => a.name.localeCompare(b.name));

         return {
             items: activeProjects.map(p => ({ id: p.id, label: p.name, originalOrder: p.order || 9999 })),
             archivedItems: archivedProjects.map(p => ({ id: p.id, label: p.name, originalOrder: p.order || 0 }))
         };
    } else if (reorderState.clientId && reorderState.type === "projects") {
         const clientProjects = projects.filter(p => p.clientId === reorderState.clientId);
         const activeProjects = clientProjects.filter(p => p.status !== "Archived");
         const archivedProjects = clientProjects.filter(p => p.status === "Archived");

         activeProjects.sort((a, b) => (a.order || 9999) - (b.order || 9999));
         archivedProjects.sort((a, b) => a.name.localeCompare(b.name));

         return {
             items: activeProjects.map(p => ({ id: p.id, label: p.name, originalOrder: p.order || 9999 })),
             archivedItems: archivedProjects.map(p => ({ id: p.id, label: p.name, originalOrder: p.order || 0 }))
         };
    } else if (reorderState.type === "clients") {
         const activeClients = clients.filter(c => c.status === "Active" || !c.status);
         const archivedClients = clients.filter(c => c.status === "Inactive");

         // Filter clients based on category membership
         const belongsToCategory = (client: Client) => {
             const clientProjects = projects.filter(p => p.clientId === client.id);
             
             // If client has projects, categorize by projects
             // If client has NO projects, use defaultCategory if available, otherwise fallback to Billable
             
             if (clientProjects.length > 0) {
                if (reorderState.category === "Billable projects") {
                    return clientProjects.some(p => p.category === "Billable projects");
                } else if (reorderState.category === "Non-billable projects") {
                    return clientProjects.some(p => p.category === "Non-billable projects");
                }
                return false;
             } else {
                 // No projects - use default category logic
                 if (client.defaultCategory) {
                     return client.defaultCategory === reorderState.category;
                 }
                 // Fallback if no default category: show in Billable
                 return reorderState.category === "Billable projects";
             }
         };

         const categoryActiveClients = activeClients.filter(belongsToCategory);
         const categoryArchivedClients = archivedClients.filter(belongsToCategory);

         // Sort based on category specific order if available, fallback to global order
         categoryActiveClients.sort((a, b) => {
             const orderA = (reorderState.category === "Billable projects" ? a.billableOrder : 
                             reorderState.category === "Non-billable projects" ? a.nonBillableOrder : undefined) ?? a.order ?? 9999;
             const orderB = (reorderState.category === "Billable projects" ? b.billableOrder : 
                             reorderState.category === "Non-billable projects" ? b.nonBillableOrder : undefined) ?? b.order ?? 9999;
             return orderA - orderB;
         });
         
         categoryArchivedClients.sort((a, b) => a.name.localeCompare(b.name));
         
         return {
             items: categoryActiveClients.map(c => {
                 const currentOrder = (reorderState.category === "Billable projects" ? c.billableOrder : 
                                     reorderState.category === "Non-billable projects" ? c.nonBillableOrder : undefined) ?? c.order ?? 9999;
                 return { id: c.id, label: c.name, originalOrder: currentOrder };
             }),
             archivedItems: categoryArchivedClients.map(c => ({ id: c.id, label: c.name, originalOrder: c.order || 0 }))
         };
    }
    return { items: [], archivedItems: [] };
  };

  const { items: reorderItems, archivedItems: reorderArchivedItems } = getReorderItems();

  // Filter Projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.projectCode && p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatuses.includes(p.status);
    
    // When a specific person is selected, only show projects they're allocated to
    const matchesAllocation = selectedPersonId === "all" || 
      projectAssignments.some(a => a.projectId === p.id && a.userId === selectedPersonId);
    
    return matchesSearch && matchesStatus && matchesAllocation;
  });

  const categories: Category[] = ["Billable projects", "Non-billable projects", "Internal"];

  const getClient = (id?: string) => clients.find(c => c.id === id);

  const breakdownProject = breakdownState ? projects.find(p => p.id === breakdownState.projectId) : null;
  
  // Show ALL users in breakdown — assigned users are highlighted, others grayed out
  const breakdownAssignedUserIds = breakdownState
    ? projectAssignments
        .filter(a => a.projectId === breakdownState.projectId)
        .map(a => a.userId)
    : [];

  const breakdownEntries = breakdownState
    ? users.map(u => {
          let hours = 0;

          if (breakdownState.column.type === "week") {
              const dateKey = format(breakdownState.column.date, "yyyy-MM-dd");
              const h = weeklyHours.find(wh => 
                  wh.projectId === breakdownState.projectId && 
                  wh.userId === u.id && 
                  wh.weekStartDate === dateKey
              );
              hours = h ? h.hours : 0;
          } else {
               // Month summary: Sum of displayed weeks
               const weekColumns = columns.filter(c => c.type === "week");
               const weekDates = weekColumns.map(c => format(c.date, "yyyy-MM-dd"));

               hours = weeklyHours
                  .filter(wh => wh.projectId === breakdownState.projectId && wh.userId === u.id)
                  .filter(wh => weekDates.includes(wh.weekStartDate))
                  .reduce((sum, wh) => sum + wh.hours, 0);
          }

          return { user: u, hours };
        })
    : [];

  const breakdownIsEditable = breakdownState?.column.type === "week";

  const handleCellClick = (projectId: string, column: GridColumn) => {
    setBreakdownState({ projectId, column });
  };

  const handleManageClientProjects = (clientId: string) => {
    setReorderState({
      isOpen: true,
      type: "projects",
      clientId
    });
  };

  const handleSaveReorder = (newOrderIds: string[]) => {
    if (reorderState.type === "projects") {
      onReorderProjects(newOrderIds);
    } else {
      onReorderClients(newOrderIds, reorderState.category);
    }
  };

  const handleManageCategory = (category: Category) => {
    if (category === "Internal") {
      setReorderState({
        isOpen: true,
        category,
        type: "projects"
      });
    } else {
      setReorderState({
        isOpen: true,
        category,
        type: "clients"
      });
    }
  };

  const handleRenameClientSubmit = () => {
    if (renameClientState && renameClientState.name.trim()) {
      onRenameClient(renameClientState.clientId, renameClientState.name.trim());
      setRenameClientState(null);
    }
  };

  return (
    <DensityContext.Provider value={density}>
    <div className="flex flex-col min-w-fit pb-20">
      {categories.map(category => {
        const categoryProjects = filteredProjects.filter(p => p.category === category);

        return (
          <CategoryGroup
            key={category}
            stickyOffset={stickyOffset}
            category={category}
            categoryProjects={categoryProjects}
            allProjects={projects}
            clients={clients}
            columns={columns}
            users={users}
            weeklyHours={weeklyHours}
            onUpdateHours={onUpdateHours}
            selectedPersonId={selectedPersonId}
            onProjectClick={onProjectClick}
            getClient={getClient}
            onCellClick={handleCellClick}
            onAddProject={onAddProject}
            onAddClient={onAddClient}
            onManageCategory={() => handleManageCategory(category)}
            onManageClientProjects={handleManageClientProjects}
            onOpenRenameClient={(clientId, name) => setRenameClientState({ isOpen: true, clientId, name })}
            onArchiveClient={onArchiveClient}
            onReorderClients={onReorderClients}
            onReorderProjects={onReorderProjects}
            onAddClientDirect={onAddClientDirect}
            onAddProjectDirect={onAddProjectDirect}
            onAddInternalProject={onAddInternalProject}
            searchQuery={searchQuery}
            projectWeekNotes={projectWeekNotes}
            onUpdateProjectNote={onUpdateProjectNote}
            onUpdateProjectStatus={onUpdateProjectStatus}
          />
        );
      })}

      {/* Rename Client Modal */}
      {renameClientState && (
        <Dialog open={renameClientState.isOpen} onOpenChange={(open) => !open && setRenameClientState(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Client</DialogTitle>
              <DialogDescription>
                Enter a new name for this client.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input 
                value={renameClientState.name} 
                onChange={(e) => setRenameClientState({ ...renameClientState, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameClientSubmit()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameClientState(null)}>Cancel</Button>
              <Button onClick={handleRenameClientSubmit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {breakdownState && breakdownProject && (
        <BreakdownModal
          isOpen={!!breakdownState}
          onClose={() => setBreakdownState(null)}
          title={breakdownProject.name}
          subtitle={
              breakdownState.column.type === "week" 
              ? `Week of ${format(breakdownState.column.date, "MMMM d, yyyy")}`
              : `Total for ${breakdownState.column.label}`
          }
          entries={breakdownEntries}
          editable={breakdownIsEditable}
          assignedUserIds={breakdownAssignedUserIds}
          onToggleAssignment={breakdownIsEditable && onToggleAssignment && breakdownState
            ? (userId: string, assigned: boolean) => {
                onToggleAssignment(breakdownState.projectId, userId, assigned);
              }
            : undefined
          }
          onUpdateHours={breakdownIsEditable && breakdownState.column.type === "week"
            ? (userId: string, hours: number) => {
                const dateKey = format(breakdownState.column.date, "yyyy-MM-dd");
                onUpdateHours(breakdownState.projectId, userId, dateKey, hours);
              }
            : undefined
          }
        />
      )}

      {reorderState.isOpen && (
        <ReorderModal 
          isOpen={reorderState.isOpen}
          onClose={() => setReorderState(prev => ({ ...prev, isOpen: false }))}
          title={`Manage ${reorderState.clientId ? 'Projects' : reorderState.category}`}
          items={reorderItems}
          archivedItems={reorderArchivedItems}
          onSave={handleSaveReorder}
          onAdd={(name) => {
              if (reorderState.type === "clients") {
                  onAddClientDirect(name, reorderState.category);
              } else if (reorderState.category === "Internal") {
                  onAddInternalProject(name);
              } else if (reorderState.clientId) {
                  onAddProjectDirect(name, reorderState.clientId);
              }
          }}
          onRename={reorderState.type === "clients" ? onRenameClient : onRenameProject}
          onArchive={reorderState.type === "clients" ? onArchiveClient : onArchiveProject}
          onUnarchive={reorderState.type === "clients" ? onUnarchiveClient : onUnarchiveProject}
          onDelete={reorderState.type === "projects" ? onDeleteProject : undefined}
        />
      )}
    </div>
    </DensityContext.Provider>
  );
};

// --- Helper Components ---

const WeeklyTotalRow: React.FC<{
  columns: GridColumn[];
  projects: Project[];
  weeklyHours: WeeklyHour[];
  selectedPersonId: string | "all";
  isCategory?: boolean;
}> = ({ columns, projects, weeklyHours, selectedPersonId, isCategory }) => {
  const density = useDensity();

  const getTotal = (column: GridColumn) => {
    if (column.type === "week") {
      const dateKey = format(column.date, "yyyy-MM-dd");
      return weeklyHours
        .filter(h => projects.some(p => p.id === h.projectId))
        .filter(h => h.weekStartDate === dateKey)
        .filter(h => selectedPersonId === "all" || h.userId === selectedPersonId)
        .reduce((sum, h) => sum + h.hours, 0);
    } else {
      // Month Total: Sum of displayed weeks
      const weekColumns = columns.filter(c => c.type === "week");
      const weekDates = weekColumns.map(c => format(c.date, "yyyy-MM-dd"));
      
      return weeklyHours
        .filter(h => projects.some(p => p.id === h.projectId))
        .filter(h => weekDates.includes(h.weekStartDate))
        .filter(h => selectedPersonId === "all" || h.userId === selectedPersonId)
        .reduce((sum, h) => sum + h.hours, 0);
    }
  };

  return (
    <div className="flex flex-1">
      {columns.map((col, i) => {
        const total = getTotal(col);
        const isMonth = col.type === "month";
        return (
          <div key={i} className={cn(
            "flex-1 min-w-[60px] flex items-center justify-center text-xs tabular-nums",
            density === "compact" ? "py-1 px-2" : "p-2",
            // Only the category totals carry weight; client totals stay quiet.
            isCategory ? "font-semibold text-foreground" : "font-normal text-muted-foreground/60",
            isMonth && "min-w-[100px]"
          )}>
            {total > 0 ? total : <span className="text-muted-foreground/30">–</span>}
          </div>
        );
      })}
    </div>
  );
};

// Inline "+ Add" row — hidden until you hover the group (or focus it); click turns into an input.
const InlineAddRow: React.FC<{ label: string; indent?: boolean; className?: string; onAdd: (name: string) => void }> = ({ label, indent, className, onAdd }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const submit = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
    }
  };

  const pad = indent ? "pl-10" : "pl-4";

  if (!editing) {
    return (
      <div className={cn("flex transition-opacity", className)}>
        <div className="w-96 flex-none">
          <button
            onClick={() => setEditing(true)}
            className={cn("flex items-center gap-1.5 pr-4 py-1 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors", pad)}
          >
            <Plus className="h-3 w-3" /> {label}
          </button>
        </div>
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex border-b border-border/40 bg-muted/10">
      <div className={cn("w-96 flex-none border-r flex items-center pr-3 py-1", indent ? "pl-9" : "pl-3")}>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setName(""); setEditing(false); }
          }}
          onBlur={() => { if (name.trim()) submit(); setEditing(false); }}
          placeholder={label}
          className="h-7 text-xs"
        />
      </div>
      <div className="flex-1" />
    </div>
  );
};

// Category Group
const CategoryGroup: React.FC<{
  category: Category;
  categoryProjects: Project[];
  allProjects: Project[];
  clients: Client[];
  columns: GridColumn[];
  users: User[];
  weeklyHours: WeeklyHour[];
  onUpdateHours: any;
  selectedPersonId: string | "all";
  onProjectClick: (project: Project) => void;
  getClient: (id?: string) => Client | undefined;
  onCellClick: (projectId: string, column: GridColumn) => void;
  onAddProject: (clientId?: string, category?: Category) => void;
  onAddClient: () => void;
  onManageCategory: () => void;
  onManageClientProjects: (clientId: string) => void;
  onOpenRenameClient: (clientId: string, currentName: string) => void;
  onArchiveClient: (clientId: string) => void;
  onReorderClients: (orderedIds: string[], category?: Category) => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onAddClientDirect: (name: string, category?: Category) => void;
  onAddProjectDirect: (name: string, clientId: string) => void;
  onAddInternalProject: (name: string) => void;
  searchQuery: string;
  projectWeekNotes: ProjectWeekNote[];
  onUpdateProjectNote?: (projectId: string, weekStart: string, note: string, type: 'info' | 'warning' | 'important') => void;
  onUpdateProjectStatus?: (id: string, status: ProjectStatus) => void;
  stickyOffset: number;
}> = ({ category, categoryProjects, allProjects, clients, columns, users, weeklyHours, onUpdateHours, selectedPersonId, onProjectClick, getClient, onCellClick, onAddProject, onAddClient, onManageCategory, onManageClientProjects, onOpenRenameClient, onArchiveClient, onReorderClients, onReorderProjects, onAddClientDirect, onAddProjectDirect, onAddInternalProject, searchQuery, projectWeekNotes, onUpdateProjectNote, onUpdateProjectStatus, stickyOffset }) => {
  const density = useDensity();
  // Internal starts collapsed — it's rarely the focus when scanning the board.
  const [isOpen, setIsOpen] = useState(category !== "Internal");

  // Measure the category header so client headers can pin exactly beneath it.
  const catHeaderRef = useRef<HTMLDivElement>(null);
  const [catHeaderH, setCatHeaderH] = useState(0);
  React.useEffect(() => {
    const el = catHeaderRef.current;
    if (!el) return;
    const update = () => setCatHeaderH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const clientStickyTop = stickyOffset + catHeaderH;
  const [clientExpandState, setClientExpandState] = useState<{ id: number; expanded: boolean } | undefined>(undefined);

  // Sort projects: Order first, then Pipeline at the bottom
  const sortedProjects = [...categoryProjects].sort((a, b) => {
    // Primary: Order
    const orderA = a.order || 9999;
    const orderB = b.order || 9999;
    if (orderA !== orderB) return orderA - orderB;

    // Secondary: Pipeline status
    if (a.status === "Pipeline" && b.status !== "Pipeline") return 1;
    if (a.status !== "Pipeline" && b.status === "Pipeline") return -1;
    
    return 0;
  });

  // Group projects by client
  const clientGroups = new Map<string, Project[]>();
  const noClientProjects: Project[] = [];

  sortedProjects.forEach(p => {
    if (p.clientId) {
      const existing = clientGroups.get(p.clientId) || [];
      clientGroups.set(p.clientId, [...existing, p]);
    } else {
      noClientProjects.push(p);
    }
  });

  // Identify clients that should be shown in this category
  const clientsWithoutProjects = clients.filter(c => {
      // Check if client has ANY projects in the entire system
      const hasProjects = allProjects.some(p => p.clientId === c.id);
      return !hasProjects;
  });

  const extraClients = clientsWithoutProjects.filter(c => {
       if (c.defaultCategory) return c.defaultCategory === category;
       return category === "Billable projects"; // Default fallback
  });

  // Filter extra clients by search query if needed
  const filteredExtraClients = extraClients.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Merge extra clients into clientGroups keys for sorting
  const allClientIds = new Set(clientGroups.keys());
  filteredExtraClients.forEach(c => allClientIds.add(c.id));

  // Sort Clients based on their order
  const sortedClientIds = Array.from(allClientIds)
    .filter(clientId => {
        const client = getClient(clientId);
        return client?.status !== "Inactive";
    })
    .sort((a, b) => {
      const clientA = getClient(a);
      const clientB = getClient(b);
      
      const getOrder = (c?: Client) => {
          if (!c) return 9999;
          if (category === "Billable projects") return c.billableOrder ?? c.order ?? 9999;
          if (category === "Non-billable projects") return c.nonBillableOrder ?? c.order ?? 9999;
          return c.order ?? 9999;
      };

      return getOrder(clientA) - getOrder(clientB);
  });
  
  // --- Local drag order (clients + no-client/internal projects) ---
  const noClientProjectIds = noClientProjects.map(p => p.id);
  const reorderList = (list: string[], from: number, to: number) => {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  const [orderedClientIds, setOrderedClientIds] = useState<string[]>(sortedClientIds);
  React.useEffect(() => { setOrderedClientIds(sortedClientIds); }, [sortedClientIds.join("|")]);

  const [orderedNoClientIds, setOrderedNoClientIds] = useState<string[]>(noClientProjectIds);
  React.useEffect(() => { setOrderedNoClientIds(noClientProjectIds); }, [noClientProjectIds.join("|")]);

  const moveClient = (from: number, to: number) => setOrderedClientIds(prev => reorderList(prev, from, to));
  const commitClientOrder = () => onReorderClients(orderedClientIds, category);
  const moveNoClientProject = (from: number, to: number) => setOrderedNoClientIds(prev => reorderList(prev, from, to));
  const commitNoClientOrder = () => onReorderProjects(orderedNoClientIds);

  const clientDragType = `client-${category}`;
  const noClientDragType = `project-noclient-${category}`;

  // If no content and search query active, hide category
  if (sortedClientIds.length === 0 && noClientProjects.length === 0 && searchQuery) {
      return null;
  }

  const handleToggleExpandAll = (expanded: boolean) => {
      setClientExpandState({ id: Date.now(), expanded });
  };

  return (
    <div className="mb-10">
      {/* Category Header Row — the one level that carries real weight */}
      <div
        ref={catHeaderRef}
        className="flex bg-secondary text-secondary-foreground border-y sticky left-0 right-0 z-[40] shadow-sm"
        // -1px so a sub-pixel rounding gap under the capacity overview can't show a sliver of a row.
        style={{ top: Math.max(0, stickyOffset - 1) }}
      >
        <div
          className={cn(
            "w-96 flex-none flex items-center px-4 cursor-pointer hover:bg-secondary/90 transition-colors border-r group",
            density === "compact" ? "py-1.5" : "py-2"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <button className="text-secondary-foreground/70 mr-2 hover:text-secondary-foreground">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <span className="font-bold text-xs uppercase tracking-wider">{category}</span>
          
           {/* Actions in Category Header */}
           <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                  className="p-1 hover:bg-background/50 rounded text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpandAll(true);
                  }}
                  title="Expand All Clients"
               >
                  <ChevronsDown className="h-4 w-4" />
               </button>
               <button 
                  className="p-1 hover:bg-background/50 rounded text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExpandAll(false);
                  }}
                  title="Collapse All Clients"
               >
                  <ChevronsUp className="h-4 w-4" />
               </button>
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                        className="p-1 hover:bg-background/50 rounded text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        title="More actions"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{category}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageCategory(); }}>
                        <Archive className="mr-2 h-4 w-4" /> Manage archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
           </div>
        </div>
        
        {/* Weekly Totals for Category */}
        <WeeklyTotalRow 
          columns={columns}
          projects={categoryProjects} 
          weeklyHours={weeklyHours}
          selectedPersonId={selectedPersonId}
          isCategory={true}
        />
      </div>

      {isOpen && (
        <div className="bg-background pt-0 group/category">
           {/* Render Clients (drag to reorder) */}
           {orderedClientIds.map((clientId, index) => {
              const cProjects = clientGroups.get(clientId) || [];
              const client = getClient(clientId);
              return (
                <ClientGroup
                  key={clientId}
                  client={client || { id: "unknown", name: "Unknown Client", status: "Active" }}
                  category={category}
                  projects={cProjects}
                  columns={columns}
                  users={users}
                  weeklyHours={weeklyHours}
                  onUpdateHours={onUpdateHours}
                  selectedPersonId={selectedPersonId}
                  onProjectClick={onProjectClick}
                  onCellClick={onCellClick}
                  onAddProject={onAddProject}
                  onAddProjectDirect={onAddProjectDirect}
                  onReorderProjects={onReorderProjects}
                  onManageProjects={() => onManageClientProjects(clientId)}
                  onRenameClient={(name) => onOpenRenameClient(clientId, name)}
                  onArchiveClient={() => onArchiveClient(clientId)}
                  expandState={clientExpandState}
                  projectWeekNotes={projectWeekNotes}
                  onUpdateProjectNote={onUpdateProjectNote}
                  onUpdateProjectStatus={onUpdateProjectStatus}
                  dragIndex={index}
                  dragType={clientDragType}
                  moveRow={moveClient}
                  onDropCommit={commitClientOrder}
                  stickyTop={clientStickyTop}
                />
              );
            })}

            {/* Inline add client (billable / non-billable categories) */}
            {category !== "Internal" && (
              <InlineAddRow
                label="Add client"
                className="opacity-0 group-hover/category:opacity-100 focus-within:opacity-100"
                onAdd={(name) => onAddClientDirect(name, category)}
              />
            )}

            {/* Render No-Client / Internal Projects directly (drag to reorder) */}
            {orderedNoClientIds.map((pid, index) => {
               const p = noClientProjects.find(np => np.id === pid);
               if (!p) return null;
               return (
                 <ProjectRow
                   key={p.id}
                   project={{...p, clientName: ""}}
                   columns={columns}
                   users={users}
                   weeklyHours={weeklyHours}
                   onUpdateHours={onUpdateHours}
                   selectedPersonId={selectedPersonId}
                   onProjectClick={onProjectClick}
                   onCellClick={onCellClick}
                   projectWeekNotes={projectWeekNotes}
                   onUpdateProjectNote={onUpdateProjectNote}
                   onUpdateProjectStatus={onUpdateProjectStatus}
                   dragIndex={index}
                   dragType={noClientDragType}
                   moveRow={moveNoClientProject}
                   onDropCommit={commitNoClientOrder}
                 />
               );
            })}

            {/* Inline add internal project */}
            {category === "Internal" && (
              <InlineAddRow
                label="Add internal project"
                className="opacity-0 group-hover/category:opacity-100 focus-within:opacity-100"
                onAdd={(name) => onAddInternalProject(name)}
              />
            )}
        </div>
      )}
    </div>
  );
};


// Client Group Component
const ClientGroup: React.FC<{
  client: Client;
  category: Category;
  projects: Project[];
  columns: GridColumn[];
  users: User[];
  weeklyHours: WeeklyHour[];
  onUpdateHours: any;
  selectedPersonId: string | "all";
  onProjectClick: (project: Project) => void;
  onCellClick: (projectId: string, column: GridColumn) => void;
  onAddProject: (clientId: string, category?: Category) => void;
  onAddProjectDirect: (name: string, clientId: string) => void;
  onReorderProjects: (orderedIds: string[]) => void;
  onManageProjects: () => void;
  onRenameClient: (currentName: string) => void;
  onArchiveClient: () => void;
  expandState?: { id: number; expanded: boolean };
  projectWeekNotes: ProjectWeekNote[];
  onUpdateProjectNote?: (projectId: string, weekStart: string, note: string, type: 'info' | 'warning' | 'important') => void;
  onUpdateProjectStatus?: (id: string, status: ProjectStatus) => void;
  // Drag-to-reorder this client header within its category
  dragIndex?: number;
  dragType?: string;
  moveRow?: (from: number, to: number) => void;
  onDropCommit?: () => void;
  stickyTop?: number;
}> = ({ client, category, projects, columns, users, weeklyHours, onUpdateHours, selectedPersonId, onProjectClick, onCellClick, onAddProject, onAddProjectDirect, onReorderProjects, onManageProjects, onRenameClient, onArchiveClient, expandState, projectWeekNotes, onUpdateProjectNote, onUpdateProjectStatus, dragIndex, dragType, moveRow, onDropCommit, stickyTop = 0 }) => {
  const density = useDensity();
  const [isOpen, setIsOpen] = useState(true);

  React.useEffect(() => {
    if (expandState) {
      setIsOpen(expandState.expanded);
    }
  }, [expandState]);

  // --- Client header drag-to-reorder ---
  const headerRef = useRef<HTMLDivElement>(null);
  const canReorderClient = !!moveRow && dragIndex !== undefined && !!dragType;

  const [, dropClient] = useDrop({
    accept: dragType || "__client_none__",
    hover(item: { index: number }) {
      if (!canReorderClient) return;
      if (item.index === dragIndex) return;
      moveRow!(item.index, dragIndex!);
      item.index = dragIndex!;
    },
  });

  const [{ isDragging: isClientDragging }, dragClient] = useDrag({
    type: dragType || "__client_none__",
    item: () => ({ index: dragIndex }),
    canDrag: canReorderClient,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => onDropCommit?.(),
  });

  if (canReorderClient) dropClient(headerRef);

  // --- Project drag-to-reorder within this client ---
  const projectIds = projects.map(p => p.id);
  const [orderedProjectIds, setOrderedProjectIds] = useState<string[]>(projectIds);
  React.useEffect(() => { setOrderedProjectIds(projectIds); }, [projectIds.join("|")]);
  const moveProject = (from: number, to: number) => setOrderedProjectIds(prev => {
    const next = [...prev];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    return next;
  });
  const commitProjectOrder = () => onReorderProjects(orderedProjectIds);
  const projectDragType = `project-${client.id}`;

  return (
    <div className={cn("mb-0", isClientDragging && "opacity-40")}>
      <div
        ref={headerRef}
        className="flex bg-background hover:bg-muted/20 transition-colors border-b border-border/40 sticky left-0 right-0 z-[30]"
        // -1px to close a sub-pixel rounding gap beneath the category header.
        style={{ top: Math.max(0, stickyTop - 1) }}
      >
        <div
          className={cn(
            "w-96 flex-none flex items-center gap-1 pr-4 pl-2 border-r cursor-pointer group",
            density === "compact" ? "py-1" : "py-1.5"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {canReorderClient && (
            <button
              ref={(node) => { dragClient(node); }}
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity flex-none"
              title="Drag to reorder"
              aria-label="Reorder client"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <button className="text-muted-foreground hover:text-foreground flex-none">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm text-foreground truncate">{client.name}</span>
          </div>

           {/* Actions in Client Header */}
           <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Don't toggle open/close
                        }}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Client Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onAddProject(client.id, category);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> New project (details)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onRenameClient(client.name);
                    }}>
                        <Pencil className="mr-2 h-4 w-4" /> Rename client
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onManageProjects();
                    }}>
                        <Archive className="mr-2 h-4 w-4" /> Archived projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onArchiveClient();
                    }} className="text-muted-foreground focus:text-foreground">
                        <Archive className="mr-2 h-4 w-4" /> Archive client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
           </div>
        </div>

        {/* Weekly Totals for Client */}
        <WeeklyTotalRow 
          columns={columns}
          projects={projects} 
          weeklyHours={weeklyHours}
          selectedPersonId={selectedPersonId}
          isCategory={false}
        />
      </div>

      {isOpen && (
        <div className="group/client">
          {orderedProjectIds.map((pid, index) => {
            const p = projects.find(pr => pr.id === pid);
            if (!p) return null;
            return (
              <ProjectRow
                key={p.id}
                project={{...p, clientName: client.name}}
                columns={columns}
                users={users}
                weeklyHours={weeklyHours}
                onUpdateHours={onUpdateHours}
                selectedPersonId={selectedPersonId}
                onProjectClick={onProjectClick}
                onCellClick={onCellClick}
                projectWeekNotes={projectWeekNotes}
                onUpdateProjectNote={onUpdateProjectNote}
                onUpdateProjectStatus={onUpdateProjectStatus}
                dragIndex={index}
                dragType={projectDragType}
                moveRow={moveProject}
                onDropCommit={commitProjectOrder}
              />
            );
          })}
          <InlineAddRow
            indent
            label="Add project"
            className="opacity-0 group-hover/client:opacity-100 focus-within:opacity-100"
            onAdd={(name) => onAddProjectDirect(name, client.id)}
          />
        </div>
      )}
    </div>
  );
};