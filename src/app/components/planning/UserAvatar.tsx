import React from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  initials: string;
  color: string;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  name, 
  initials, 
  color, 
  className,
  onClick,
  selected 
}) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center rounded-full text-white text-xs font-medium cursor-pointer transition-all border-2 border-background ring-offset-background hover:z-10",
        color,
        selected ? "ring-2 ring-primary z-10 scale-110" : "opacity-80 hover:opacity-100 hover:scale-105",
        className
      )}
      style={{ width: 32, height: 32 }}
      onClick={onClick}
      title={name}
    >
      {initials}
    </div>
  );
};
