import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetFooter, SheetTitle, SheetDescription } from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Project, User, Client, ProjectStatus, ProjectAssignment, WeeklyHour } from "../../data/mockData";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
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
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [pendingTeam, setPendingTeam] = useState<string[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({ ...project });
      setPendingTeam([]);
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