import React, { useState, useEffect } from "react";
import { User } from "../../data/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { Trash2, Plus, X } from "lucide-react";

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  onAddUser: (user: Omit<User, "id">) => void;
  onDeleteUser: (userId: string) => void;
}

const PRESET_COLORS = [
  "bg-purple-600",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-blue-600",
  "bg-slate-700",
  "bg-emerald-600",
  "bg-pink-600",
  "bg-red-600",
  "bg-indigo-600",
  "bg-lime-600",
];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onUpdateUsers,
  onAddUser,
  onDeleteUser,
}) => {
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, "id">>({
    name: "",
    role: "Member",
    weeklyContractHours: 40,
    color: PRESET_COLORS[0],
    initials: "",
    costRate: 65
  });
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    setLocalUsers(users);
  }, [users, isOpen]);

  const handleUserChange = (id: string, field: keyof User, value: any) => {
    setLocalUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const handleSave = () => {
    onUpdateUsers(localUsers);
    onClose();
  };

  const handleAddSubmit = () => {
    if (!newUser.name) return;
    onAddUser(newUser);
    setNewUser({
      name: "",
      role: "Member",
      weeklyContractHours: 40,
      color: PRESET_COLORS[0],
      initials: "",
      costRate: 65
    });
    setIsAdding(false);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Team Management</DialogTitle>
            <DialogDescription>
              Add, remove, or edit team members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[50vh] pr-4 overflow-y-auto">
            <div className="space-y-6">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground mb-2 px-2">
                <div className="col-span-1">Avatar</div>
                <div className="col-span-2">Name</div>
                <div className="col-span-1">Initials</div>
                <div className="col-span-2">Weekly Hours</div>
                <div className="col-span-2">Cost Rate (€/h)</div>
                <div className="col-span-3">Color</div>
                <div className="col-span-1"></div>
              </div>

              {localUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-12 gap-4 items-center p-2 rounded-md hover:bg-muted/50">
                  <div className="col-span-1">
                    <UserAvatar 
                      name={user.name} 
                      initials={user.initials} 
                      color={user.color} 
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input 
                      value={user.name} 
                      onChange={(e) => handleUserChange(user.id, "name", e.target.value)}
                      className="h-8"
                    />
                  </div>

                  <div className="col-span-1">
                     <Input 
                      value={user.initials || ""} 
                      onChange={(e) => handleUserChange(user.id, "initials", e.target.value)}
                      maxLength={3}
                      className="h-8 uppercase"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input 
                      type="number"
                      value={user.weeklyContractHours} 
                      onChange={(e) => handleUserChange(user.id, "weeklyContractHours", parseInt(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input 
                      type="number"
                      value={user.costRate || 0} 
                      onChange={(e) => handleUserChange(user.id, "costRate", parseInt(e.target.value) || 0)}
                      className="h-8"
                      placeholder="€/h"
                    />
                  </div>

                  <div className="col-span-3 flex flex-wrap gap-1">
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        className={cn(
                          "w-4 h-4 rounded-full cursor-pointer border border-transparent hover:scale-125 transition-transform",
                          color,
                          user.color === color && "ring-2 ring-primary border-background"
                        )}
                        onClick={() => handleUserChange(user.id, "color", color)}
                      />
                    ))}
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setUserToDelete(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdding ? (
            <div className="border rounded-md p-4 bg-muted/30 mt-4">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold">New Team Member</h4>
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                    <X className="h-4 w-4" />
                  </Button>
               </div>
               <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-3">
                    <label className="text-xs font-medium mb-1 block">Name</label>
                    <Input 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Initials</label>
                    <Input 
                      value={newUser.initials || ""}
                      onChange={(e) => setNewUser({...newUser, initials: e.target.value})}
                      maxLength={3}
                      placeholder="ABC"
                      className="uppercase"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Hours/wk</label>
                    <Input 
                      type="number"
                      value={newUser.weeklyContractHours}
                      onChange={(e) => setNewUser({...newUser, weeklyContractHours: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs font-medium mb-1 block">€/h</label>
                    <Input 
                      type="number"
                      value={newUser.costRate || 0}
                      onChange={(e) => setNewUser({...newUser, costRate: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="col-span-4">
                     <label className="text-xs font-medium mb-1 block">Color</label>
                     <div className="flex flex-wrap gap-1 mt-2">
                        {PRESET_COLORS.map(color => (
                          <div
                            key={color}
                            className={cn(
                              "w-5 h-5 rounded-full cursor-pointer border border-transparent hover:scale-110 transition-transform",
                              color,
                              newUser.color === color && "ring-2 ring-primary border-background"
                            )}
                            onClick={() => setNewUser({...newUser, color})}
                          />
                        ))}
                     </div>
                  </div>
               </div>
               <div className="mt-4 flex justify-end">
                 <Button onClick={handleAddSubmit} disabled={!newUser.name}>Add Member</Button>
               </div>
            </div>
          ) : (
            <div className="mt-4">
              <Button variant="outline" className="w-full dashed border-dashed" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Team Member
              </Button>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => {
        if (!open) setUserToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this team member from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};