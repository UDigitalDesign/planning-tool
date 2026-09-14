import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetFooter, SheetTitle, SheetDescription } from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Project, User, Client, ProjectStatus, ProjectAssignment, WeeklyHour, Milestone } from "../../data/types";
import { Check, ChevronsUpDown, X, Plus, Trash2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../../lib/utils";

interface ProjectModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project, pendingTeamUserIds?: string[]) => void;
  clients: Client[];
  users: User[];
  projectAssignments: ProjectAssignment[];
  weeklyHours: WeeklyHour[];
  onUpdateAssignments: (projectId: string, userIds: string[]) => void;
  onCreateClient?: (name: string) => string;
  milestones?: Milestone[];
  onUpdateMilestones?: (projectId: string, milestones: Milestone[]) => void;
}

const PROJECT_NAME_SUGGESTIONS = [
  "Branding",
  "UX desktop",
  "UX mobile",
  "Design system"
];

const PROJECT_MANAGER_SUGGESTIONS = [
  "Bram", 
  "Eric", 
  "Fleur", 
  "Coen", 
  "Reinier", 
  "Nore", 
  "Bo"
];

const getStatusColor = (status: string) => {
    switch(status) {
        case 'Active': return "bg-emerald-500";
        case 'Pipeline': return "bg-blue-500";
        case 'Completed': return "bg-slate-400";
        case 'On Hold': return "bg-amber-500";
        case 'Archived': return "bg-slate-600";
        default: return "bg-slate-300";
    }
};

// Improved Creatable Combobox Component
const CreatableCombobox = ({ 
    value, 
    onChange, 
    options, 
    placeholder 
  }: { 
    value: string, 
    onChange: (val: string) => void, 
    options: string[], 
    placeholder: string 
  }) => {
      const [open, setOpen] = useState(false);
      const [inputValue, setInputValue] = useState("");

      return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm font-normal px-3 text-left hover:bg-zinc-800 hover:text-white h-9 text-xs", !value && "text-zinc-500")}
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-zinc-800 text-zinc-100" align="start">
                <Command className="bg-zinc-900 text-zinc-100">
                    <CommandInput 
                        placeholder="Search or type new..." 
                        onValueChange={(search) => setInputValue(search)}
                        className="bg-zinc-900 text-zinc-100 border-none h-9 text-xs"
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div 
                                className="px-2 py-1.5 text-xs cursor-pointer hover:bg-zinc-800 text-zinc-100 flex items-center gap-2"
                                onClick={() => {
                                    onChange(inputValue);
                                    setOpen(false);
                                }}
                            >
                                <span className="text-zinc-400">Use:</span> "{inputValue}"
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={() => {
                                        onChange(option);
                                        setOpen(false);
                                    }}
                                    className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white text-zinc-300 text-xs"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-3 w-3",
                                            value === option ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
      );
  };

// Creatable client picker — search existing clients or create a new one inline
const ClientCombobox = ({
    clients,
    value,
    onChange,
    onCreate,
  }: {
    clients: Client[],
    value?: string,
    onChange: (clientId: string) => void,
    onCreate?: (name: string) => string,
  }) => {
      const [open, setOpen] = useState(false);
      const [inputValue, setInputValue] = useState("");
      const selectedName = clients.find(c => c.id === value)?.name;
      const exactMatch = clients.some(c => c.name.toLowerCase() === inputValue.trim().toLowerCase());

      return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm font-normal px-3 text-left hover:bg-zinc-800 hover:text-white h-9 text-xs", !selectedName && "text-zinc-500")}
                >
                    {selectedName || "Select or create a client"}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-zinc-800 text-zinc-100" align="start">
                <Command className="bg-zinc-900 text-zinc-100">
                    <CommandInput
                        placeholder="Search or type new client..."
                        onValueChange={(search) => setInputValue(search)}
                        className="bg-zinc-900 text-zinc-100 border-none h-9 text-xs"
                    />
                    <CommandList>
                        <CommandEmpty>
                            {onCreate && inputValue.trim() ? (
                                <div
                                    className="px-2 py-1.5 text-xs cursor-pointer hover:bg-zinc-800 text-zinc-100 flex items-center gap-2"
                                    onClick={() => {
                                        const id = onCreate(inputValue.trim());
                                        onChange(id);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="text-zinc-400">Create client:</span> "{inputValue}"
                                </div>
                            ) : (
                                <div className="px-2 py-1.5 text-xs text-zinc-500">No clients found.</div>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {clients.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => { onChange(c.id); setOpen(false); }}
                                    className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white text-zinc-300 text-xs"
                                >
                                    <Check className={cn("mr-2 h-3 w-3", value === c.id ? "opacity-100" : "opacity-0")} />
                                    {c.name}
                                </CommandItem>
                            ))}
                            {onCreate && inputValue.trim() && !exactMatch && (
                                <CommandItem
                                    value={`__create__${inputValue}`}
                                    onSelect={() => {
                                        const id = onCreate(inputValue.trim());
                                        onChange(id);
                                        setOpen(false);
                                    }}
                                    className="data-[selected=true]:bg-zinc-800 data-[selected=true]:text-white text-zinc-100 text-xs"
                                >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Create "{inputValue}"
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
      );
  };

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSave,
  clients,
  users,
  projectAssignments,
  weeklyHours,
  onUpdateAssignments,
  onCreateClient,
  milestones = [],
  onUpdateMilestones,
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [pendingTeam, setPendingTeam] = useState<string[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneSoft, setNewMilestoneSoft] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({ ...project });
      setPendingTeam([]);
      setNewMilestoneTitle("");
      setNewMilestoneDate("");
    }
  }, [project]);

  if (!project) return null;

  const handleChange = (field: keyof Project, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (isNewProject) {
      onSave({ ...project, ...formData } as Project, pendingTeam);
    } else {
      onSave({ ...project, ...formData } as Project);
    }
    onClose();
  };

  // Milestones hang off a saved project; a new one has no id to link to yet, so
  // the section only appears once the project has been saved.
  const projectMilestones = project.id
    ? milestones
        .filter(m => m.projectId === project.id)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    : [];

  const commitMilestones = (next: Milestone[]) => {
    if (project.id) onUpdateMilestones?.(project.id, next);
  };

  const addMilestone = () => {
    if (!newMilestoneTitle.trim() || !newMilestoneDate) return;
    commitMilestones([
      ...projectMilestones,
      {
        id: Math.random().toString(36).slice(2, 11),
        projectId: project.id,
        title: newMilestoneTitle.trim(),
        dueDate: newMilestoneDate,
        endDate: null,
        soft: newMilestoneSoft,
      },
    ]);
    setNewMilestoneTitle("");
    setNewMilestoneDate("");
  };

  const clientName = clients.find(c => c.id === formData.clientId)?.name || "-";
  const isPipeline = formData.status === "Pipeline";
  const isNewProject = !project.id;

  // Team allocation
  const projectId = project.id;
  const assignedUserIds = isNewProject
    ? pendingTeam
    : projectAssignments
        .filter(a => a.projectId === projectId)
        .map(a => a.userId);

  const usersWithHours = new Set(
    weeklyHours
      .filter(h => h.projectId === projectId && h.hours > 0)
      .map(h => h.userId)
  );

  const toggleUser = (userId: string) => {
    if (isNewProject) {
      // For new projects, manage pending team locally
      setPendingTeam(prev => 
        prev.includes(userId) 
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      // For existing projects, update assignments directly
      const isAssigned = assignedUserIds.includes(userId);
      if (isAssigned) {
        onUpdateAssignments(projectId, assignedUserIds.filter(id => id !== userId));
      } else {
        onUpdateAssignments(projectId, [...assignedUserIds, userId]);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[420px] w-full p-0 gap-0 border-l border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col h-full text-zinc-50 pt-10">
        <SheetTitle className="sr-only">{isNewProject ? "New Project" : "Edit Project"}</SheetTitle>
        <SheetDescription className="sr-only">Manage project details</SheetDescription>
        
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
          
          {/* Top Section */}
          <div className="space-y-3">
             <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                   Client
                </label>
                {!project.id ? (
                  <ClientCombobox
                    clients={clients}
                    value={formData.clientId}
                    onChange={(val) => handleChange("clientId", val)}
                    onCreate={onCreateClient}
                  />
                ) : (
                  <div className="text-sm font-medium px-3 h-9 flex items-center border border-zinc-800 rounded-md bg-zinc-900/50 text-zinc-200">
                      {clientName}
                  </div>
                )}
             </div>
             
             <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                   Project Name
                </label>
                <div className="h-9">
                    <CreatableCombobox 
                        value={formData.name || ""}
                        onChange={(val) => handleChange("name", val)}
                        options={PROJECT_NAME_SUGGESTIONS}
                        placeholder="Select or type project name"
                    />
                </div>
             </div>
          </div>

          <div className="h-px bg-zinc-900" />

          {/* Details Section */}
          <div className="space-y-3">
             {/* Project Code - Full Width */}
             <div className="space-y-1">
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                   Code
                </label>
                <Input 
                  value={formData.projectCode || ""} 
                  onChange={(e) => handleChange("projectCode", e.target.value)}
                  className="font-mono h-9 bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-600 text-xs"
                  placeholder="e.g. PRJ-001"
                />
            </div>

            {/* Status & Budget - Half Width */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        Status
                    </label>
                    <Select 
                        value={formData.status} 
                        onValueChange={(val) => handleChange("status", val as ProjectStatus)}
                    >
                        <SelectTrigger className="w-full h-9 bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-zinc-700 text-xs">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                        {(["Pipeline", "Active", "Completed", "On Hold", "Archived"] as ProjectStatus[]).map(status => (
                            <SelectItem key={status} value={status} className="focus:bg-zinc-800 focus:text-white text-xs">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full ring-2 ring-transparent ring-offset-1 ring-offset-zinc-900", getStatusColor(status))} />
                                    <span className="font-medium">{status}</span>
                                </div>
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Where the bar starts on the timeline. The end follows from the
                    last deadline, so there is no second date to keep in sync. */}
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                        Start date
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate || ""}
                      onChange={(e) => handleChange("startDate", e.target.value || null)}
                      className="w-full h-9 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-zinc-700"
                    />
                </div>

                 <div className="space-y-1">
                   <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                       Budget (Hours)
                   </label>
                   <Input 
                     type="number"
                     value={formData.budget || ""} 
                     onChange={(e) => handleChange("budget", parseFloat(e.target.value))}
                     className="h-9 bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-600 text-xs"
                   />
                </div>
            </div>

            {/* Manager & Timeline - Half Width */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    Manager
                    </label>
                    <div className="h-9">
                        <CreatableCombobox 
                            value={formData.projectManager || ""}
                            onChange={(val) => handleChange("projectManager", val)}
                            options={PROJECT_MANAGER_SUGGESTIONS}
                            placeholder="Select"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className={cn("text-[10px] font-medium uppercase tracking-wider", !isPipeline ? "text-zinc-700" : "text-zinc-500")}>
                    Timeline
                    </label>
                    <Input 
                    value={formData.expectancy || ""} 
                    onChange={(e) => handleChange("expectancy", e.target.value)}
                    disabled={!isPipeline}
                    placeholder={isPipeline ? "e.g. Q4 2024" : "Pipeline only"}
                    className={cn("h-9 bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-zinc-700 placeholder:text-zinc-600 text-xs", !isPipeline && "bg-zinc-900/30 opacity-50")}
                    />
                </div>
            </div>
          </div>
          
           <div className="h-px bg-zinc-900" />

           {/* Description */}
           <div className="space-y-1 pb-2">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                 Description
              </label>
              <Textarea 
                value={formData.description || ""} 
                onChange={(e) => handleChange("description", e.target.value)}
                className="resize-none min-h-[80px] bg-zinc-900 border-zinc-800 text-zinc-100 shadow-sm leading-relaxed p-3 focus-visible:ring-zinc-700 placeholder:text-zinc-600 text-xs"
                placeholder="Add project details..."
              />
           </div>

           {/* Milestones — deadlines such as "Part A delivery" */}
           {!isNewProject && onUpdateMilestones && (
             <>
               <div className="h-px bg-zinc-900" />
               <div className="space-y-2">
                 <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                   Milestones
                 </label>

                 <div className="space-y-0.5">
                   {projectMilestones.map(m => (
                     <div
                       key={m.id}
                       className="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-zinc-900"
                     >
                       <button
                         type="button"
                         onClick={() => commitMilestones(
                           projectMilestones.map(x => x.id === m.id ? { ...x, soft: !x.soft } : x)
                         )}
                         className="w-3 h-3 flex items-center justify-center flex-none"
                         title={m.soft ? "Soft deadline — click to make it hard" : "Hard deadline — click to make it soft"}
                       >
                         <span
                           className={cn(
                             "block w-2 h-2 rotate-45 box-border",
                             m.soft ? "border-[1.5px] border-emerald-400" : "bg-emerald-400"
                           )}
                         />
                       </button>
                       <span className="flex-1 truncate text-zinc-200">
                         {m.title}
                       </span>
                       <span className="text-[10px] text-zinc-500 tabular-nums flex-none">
                         {m.dueDate.split("-").reverse().join("-")}
                       </span>
                       <button
                         type="button"
                         onClick={() => commitMilestones(projectMilestones.filter(x => x.id !== m.id))}
                         className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 flex-none"
                         title="Delete"
                       >
                         <Trash2 className="h-3 w-3" />
                       </button>
                     </div>
                   ))}
                   {projectMilestones.length === 0 && (
                     <p className="px-2.5 py-1 text-[11px] text-zinc-600">No milestones yet.</p>
                   )}
                 </div>

                 <div className="flex gap-1.5 pt-1">
                   <button
                     type="button"
                     onClick={() => setNewMilestoneSoft(v => !v)}
                     className="h-8 w-8 flex-none flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                     title={newMilestoneSoft ? "Soft deadline" : "Hard deadline"}
                   >
                     <span
                       className={cn(
                         "block w-2.5 h-2.5 rotate-45 box-border",
                         newMilestoneSoft ? "border-[1.5px] border-emerald-400" : "bg-emerald-400"
                       )}
                     />
                   </button>
                   <Input
                     value={newMilestoneTitle}
                     onChange={(e) => setNewMilestoneTitle(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                     placeholder="Part A delivery"
                     className="flex-1 h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-zinc-700 placeholder:text-zinc-600"
                   />
                   <Input
                     type="date"
                     value={newMilestoneDate}
                     onChange={(e) => setNewMilestoneDate(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMilestone(); } }}
                     className="w-[130px] h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-zinc-700"
                   />
                   <Button
                     type="button"
                     onClick={addMilestone}
                     disabled={!newMilestoneTitle.trim() || !newMilestoneDate}
                     className="h-8 w-8 p-0 flex-none bg-zinc-800 hover:bg-zinc-700 text-zinc-100 disabled:opacity-40"
                     title="Add milestone"
                   >
                     <Plus className="h-3.5 w-3.5" />
                   </Button>
                 </div>
               </div>
             </>
           )}

           {/* Team Allocation — shown for both new and existing projects */}
           <>
               <div className="h-px bg-zinc-900" />
               <div className="space-y-2 pb-2">
                 <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                   Team
                 </label>
                 <div className="space-y-0.5">
                   {users.map(user => {
                     const isAssigned = assignedUserIds.includes(user.id);
                     const hasHours = !isNewProject && usersWithHours.has(user.id);
                     return (
                       <button
                         key={user.id}
                         type="button"
                         onClick={() => toggleUser(user.id)}
                         className={cn(
                           "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                           isAssigned
                             ? "bg-zinc-800/80 text-zinc-100"
                             : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                         )}
                       >
                         <div className={cn(
                           "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium flex-none",
                           isAssigned ? user.color + " text-white" : "bg-zinc-800 text-zinc-500"
                         )}>
                           {user.initials}
                         </div>
                         <span className="flex-1 text-left">{user.name}</span>
                         {hasHours && !isAssigned && (
                           <span className="text-[9px] text-zinc-600">has hours</span>
                         )}
                         {isAssigned && (
                           <Check className="h-3 w-3 text-zinc-400" />
                         )}
                       </button>
                     );
                   })}
                 </div>
               </div>
           </>
        </div>

        <SheetFooter className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/30 flex-none mt-auto">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-9 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">Cancel</Button>
          <Button type="submit" onClick={handleSave} className="flex-1 h-9 bg-white text-black hover:bg-zinc-200 text-xs font-semibold">Save Changes</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};