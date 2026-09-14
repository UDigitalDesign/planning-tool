import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogDescription, DialogHeader } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Client } from "../../data/types";
import { Plus, Archive, Edit2, Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onAddClient: (name: string) => void;
  onUpdateClient: (client: Client) => void;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  clients,
  onAddClient,
  onUpdateClient,
}) => {
  const [newClientName, setNewClientName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (newClientName.trim()) {
      onAddClient(newClientName.trim());
      setNewClientName("");
    }
  };

  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditName(client.name);
  };

  const saveEdit = (client: Client) => {
    if (editName.trim()) {
      onUpdateClient({ ...client, name: editName.trim() });
      setEditingId(null);
    }
  };

  const toggleArchive = (client: Client) => {
    // Assuming we might want an 'archived' status in the future, 
    // but for now let's just add it if it doesn't exist or toggle it.
    // The mock data Client interface doesn't strictly have 'status' yet, 
    // so we might need to extend it or just rely on a naming convention/field.
    // Let's assume we add an 'isArchived' field to the Client type in our local state handling.
    // For now, I'll pass it up.
    const updatedClient = { ...client, isArchived: !(client as any).isArchived };
    onUpdateClient(updatedClient);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Clients</DialogTitle>
          <DialogDescription>
             Add new clients or manage existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 my-4">
          <Input 
            placeholder="New Client Name" 
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className={(client as any).isArchived ? "opacity-50" : ""}>
                  <TableCell>
                    {editingId === client.id ? (
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      <span className={ (client as any).isArchived ? "line-through" : ""}>
                        {client.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editingId === client.id ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => saveEdit(client)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(client)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleArchive(client)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
