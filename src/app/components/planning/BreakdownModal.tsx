import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { User } from "../../data/mockData";
import { cn } from "../../../lib/utils";
import { Check } from "lucide-react";

interface BreakdownEntry {
  user: User;
  hours: number;
}

interface BreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  entries: BreakdownEntry[];
  editable?: boolean;
  onUpdateHours?: (userId: string, hours: number) => void;
  assignedUserIds?: string[];
  onToggleAssignment?: (userId: string, assigned: boolean) => void;
}

export const BreakdownModal: React.FC<BreakdownModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  entries,
  editable = false,
  onUpdateHours,
  assignedUserIds = [],
  onToggleAssignment,
}) => {
  // Local state for editable hours — sync from props on open
  const [localHours, setLocalHours] = useState<Record<string, string>>({});
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, string> = {};
      entries.forEach((e) => {
        init[e.user.id] = e.hours > 0 ? String(e.hours) : "";
      });
      setLocalHours(init);
      initializedRef.current = true;
    } else {
      initializedRef.current = false;
    }
  }, [isOpen, entries]);

  const handleChange = (userId: string, val: string) => {
    // Only allow digits (and empty)
    if (val !== "" && !/^\d+$/.test(val)) return;
    setLocalHours((prev) => ({ ...prev, [userId]: val }));

    if (onUpdateHours) {
      const num = val === "" ? 0 : parseInt(val, 10);
      onUpdateHours(userId, num);
    }
  };

  const total = editable
    ? Object.values(localHours).reduce(
        (sum, v) => sum + (parseInt(v, 10) || 0),
        0
      )
    : entries.reduce((sum, e) => sum + e.hours, 0);

  // In read-only mode, only show entries with hours > 0
  const visibleEntries = editable
    ? entries
    : entries.filter((e) => e.hours > 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">{subtitle}</DialogDescription>
        </DialogHeader>
        <div className="py-1">
          {visibleEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              No hours logged.
            </div>
          ) : (
            <div className="space-y-0.5">
              {visibleEntries.map((entry) => {
                const isAssigned = assignedUserIds.includes(entry.user.id);
                const hasHours =
                  editable
                    ? (parseInt(localHours[entry.user.id] || "0", 10) || 0) > 0
                    : entry.hours > 0;

                return (
                  <div
                    key={entry.user.id}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-1.5 rounded transition-colors",
                      editable && !isAssigned && !hasHours
                        ? "opacity-45"
                        : ""
                    )}
                  >
                    {/* Left side: assignment toggle + avatar + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      {editable && onToggleAssignment ? (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleAssignment(entry.user.id, !isAssigned)
                          }
                          className={cn(
                            "w-4 h-4 rounded flex-none flex items-center justify-center border transition-all",
                            isAssigned
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 hover:border-muted-foreground"
                          )}
                        >
                          {isAssigned && <Check className="w-3 h-3" />}
                        </button>
                      ) : null}
                      <Avatar className="h-6 w-6 flex-none">
                        <AvatarFallback
                          className={cn(
                            "text-[10px] text-white",
                            entry.user.color
                          )}
                        >
                          {entry.user.initials || entry.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">
                        {entry.user.name}
                      </span>
                    </div>

                    {/* Right side: hours */}
                    {editable ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-12 h-7 text-center text-sm tabular-nums bg-muted/50 border border-border/60 rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                          value={localHours[entry.user.id] ?? ""}
                          onChange={(e) =>
                            handleChange(entry.user.id, e.target.value)
                          }
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">h</span>
                      </div>
                    ) : (
                      <span className="font-mono text-sm tabular-nums">
                        {entry.hours}h
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Totaal */}
              <div className="pt-2 mt-1 border-t border-border/50 flex justify-between items-center px-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  Totaal
                </span>
                <span className="font-mono text-sm tabular-nums font-semibold">
                  {total}h
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
