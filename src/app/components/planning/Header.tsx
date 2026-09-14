import React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, ChevronsDown, ChevronsUp, BarChart3, Rows2, Rows3, LogOut } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { User, ProjectStatus } from "../../data/types";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";
import { UserFilter } from "./UserFilter";
import { cn } from "@/lib/utils";
import { supabase } from "../../services/supabaseClient";

interface HeaderProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  users: User[];
  selectedPersonId: string | "all";
  onPersonChange: (id: string | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatuses: ProjectStatus[];
  onStatusChange: (statuses: ProjectStatus[]) => void;
  onEditUsers: () => void;
  onToggleExpand: (expanded: boolean) => void;
  onOpenOverview: () => void;
  density: "compact" | "comfortable";
  onDensityChange: (density: "compact" | "comfortable") => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onPrev,
  onNext,
  onToday,
  users,
  selectedPersonId,
  onPersonChange,
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  onEditUsers,
  onToggleExpand,
  onOpenOverview,
  density,
  onDensityChange,
}) => {
  const allStatuses: ProjectStatus[] = ["Pipeline", "Active", "Completed", "On Hold", "Archived"];

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "Active": return "bg-emerald-500";
      case "Pipeline": return "bg-blue-500";
      case "Completed": return "bg-slate-400";
      case "On Hold": return "bg-amber-500";
      case "Archived": return "bg-slate-600";
      default: return "bg-slate-300";
    }
  };

  const toggleStatus = (status: ProjectStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border-b bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Team Planning</h1>
          
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button variant="ghost" size="icon" onClick={onPrev} className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-32 text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={onNext} className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onToday}>
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenOverview} className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Overview
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* User Filter & Management */}
          <UserFilter 
            users={users}
            selectedPersonId={selectedPersonId}
            onPersonChange={onPersonChange}
            onEditUsers={onEditUsers}
          />

          <Separator orientation="vertical" className="h-6" />

          {/* Density toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDensityChange("comfortable")}
              className={cn("h-7 w-7", density === "comfortable" && "bg-background shadow-sm")}
              title="Comfortable rows"
            >
              <Rows2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDensityChange("compact")}
              className={cn("h-7 w-7", density === "compact" && "bg-background shadow-sm")}
              title="Compact rows"
            >
              <Rows3 className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {(searchQuery || selectedStatuses.length !== allStatuses.length) && (
                   <span className="ml-1 flex h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">View Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize your planning view.
                  </p>
                </div>
                <Separator />
                
                <div className="grid gap-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search projects or clients..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Status</Label>
                  <div className="grid gap-2">
                    {allStatuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`status-${status}`} 
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={() => toggleStatus(status)}
                        />
                        <Label htmlFor={`status-${status}`} className="text-sm font-normal cursor-pointer flex items-center gap-2">
                          <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(status))} />
                          {status}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => supabase.auth.signOut()}
            title="Uitloggen"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};