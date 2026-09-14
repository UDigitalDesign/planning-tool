import React from "react";
import { User } from "../../data/types";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

interface UserFilterProps {
  users: User[];
  selectedPersonId: string | "all";
  onPersonChange: (id: string | "all") => void;
  onEditUsers: () => void;
}

export const UserFilter: React.FC<UserFilterProps> = ({
  users,
  selectedPersonId,
  onPersonChange,
  onEditUsers
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-2">
        {users.map((user) => (
          <UserAvatar
            key={user.id}
            name={user.name}
            initials={user.initials}
            color={user.color}
            selected={selectedPersonId === user.id}
            onClick={() => {
              if (selectedPersonId === user.id) {
                onPersonChange("all");
              } else {
                onPersonChange(user.id);
              }
            }}
          />
        ))}
      </div>

      <button 
        onClick={onEditUsers}
        className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
      >
        Manage
      </button>
    </div>
  );
};
