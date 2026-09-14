import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop, DropTargetMonitor } from "react-dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { GripVertical, Plus, Edit2, Archive, Check, X, RotateCcw, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface ReorderItem {
  id: string;
  label: string;
  originalOrder: number;
}

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: ReorderItem[];
  archivedItems?: ReorderItem[];
  onSave: (newOrderIds: string[]) => void;
  onAdd?: (name: string) => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ItemType = "REORDER_ITEM";

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const DraggableRow: React.FC<{
  id: string;
  text: string;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onRename?: (id: string, name: string) => void;
  onArchive?: (id: string) => void;
}> = ({ id, text, index, moveRow, onRename, onArchive }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(text);

  useEffect(() => {
    setEditName(text);
  }, [text]);

  const [{ handlerId }, drop] = useDrop({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      return { id, index };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  
  if (!isEditing) {
      drag(drop(ref));
  } else {
      drop(ref); 
  }

  const handleSaveEdit = () => {
    if (editName.trim() && onRename) {
      onRename(id, editName.trim());
      setIsEditing(false);
    }
  };

  return (
    <div 
      ref={ref} 
      style={{ opacity }} 
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-md mb-2 transition-colors group",
        !isEditing && "cursor-move hover:border-primary/50"
      )}
      data-handler-id={handlerId}
    >
      <GripVertical className={cn("h-5 w-5 text-muted-foreground", isEditing && "opacity-20")} />
      
      {isEditing ? (
        <div className="flex-1 flex gap-2 items-center">
            <Input 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                }}
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveEdit}>
                <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      ) : (
        <>
            <span className="font-medium text-sm flex-1">{text}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRename && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                )}
                {onArchive && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => onArchive(id)}>
                        <Archive className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </>
      )}
    </div>
  );
};

const ArchivedRow: React.FC<{
  id: string;
  text: string;
  onUnarchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}> = ({ id, text, onUnarchive, onDelete }) => {
  return (
    <div 
      className="flex items-center gap-3 p-3 bg-muted/50 border border-transparent rounded-md mb-2 group"
    >
      <Archive className="h-5 w-5 text-muted-foreground opacity-50" />
      <span className="font-medium text-sm flex-1 text-muted-foreground line-through decoration-muted-foreground/50">{text}</span>
      
      <div className="flex items-center gap-1.5">
        {onDelete && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-500/10" 
            onClick={() => onDelete(id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {onUnarchive && (
           <Button 
              size="sm" 
              variant="outline" 
              className="h-8 gap-2 hover:text-primary hover:border-primary" 
              onClick={() => onUnarchive(id)}
           >
              <RotateCcw className="h-3 w-3" />
              Restore
           </Button>
        )}
      </div>
    </div>
  );
};

export const ReorderModal: React.FC<ReorderModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  archivedItems = [],
  onSave,
  onAdd,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}) => {
  const [orderedItems, setOrderedItems] = useState(items);
  const [newItemName, setNewItemName] = useState("");
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{id: string, name: string} | null>(null);
  
  // Update state when items prop changes (e.g. after adding new item)
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const newItems = [...orderedItems];
    const dragItem = newItems[dragIndex];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);
    setOrderedItems(newItems);
  };

  const handleSave = () => {
    onSave(orderedItems.map(i => i.id));
    onClose();
  };

  const handleAddItem = () => {
      if (newItemName.trim() && onAdd) {
          onAdd(newItemName.trim());
          setNewItemName("");
      }
  };

  const handleLocalRename = (id: string, name: string) => {
      setOrderedItems(prev => prev.map(item => item.id === id ? { ...item, label: name } : item));
      if (onRename) onRename(id, name);
  };

  // Archive directly — the grid surfaces an "Undo" toast, so no blocking confirm needed
  const requestArchive = (id: string) => {
      if (!onArchive) return;
      // Save current order first to prevent reset
      onSave(orderedItems.map(i => i.id));
      onArchive(id);
  };

  const requestDelete = (id: string) => {
      const item = archivedItems.find(i => i.id === id);
      if (item) {
          setDeleteConfirmItem({ id: item.id, name: item.label });
      }
  };

  const confirmDelete = () => {
      if (deleteConfirmItem && onDelete) {
          // Save current order first to prevent reset
          onSave(orderedItems.map(i => i.id));
          
          // Then delete
          onDelete(deleteConfirmItem.id);
          setDeleteConfirmItem(null);
      }
  };

  const hasArchived = archivedItems.length > 0 || !!onUnarchive;

  const ActiveList = (
      <>
        {onAdd && (
            <div className="flex gap-2 my-2">
                <Input 
                    placeholder="Add new..." 
                    value={newItemName} 
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                />
                <Button onClick={handleAddItem} size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        )}

        <div className="py-2 max-h-[50vh] overflow-y-auto">
           {orderedItems.length === 0 ? (
               <div className="text-center text-muted-foreground py-8">
                   No active items.
               </div>
           ) : (
               orderedItems.map((item, index) => (
                <DraggableRow
                    key={item.id}
                    index={index}
                    id={item.id}
                    text={item.label}
                    moveRow={moveRow}
                    onRename={onRename ? handleLocalRename : undefined}
                    onArchive={onArchive ? requestArchive : undefined}
                />
               ))
           )}
        </div>
      </>
  );

  return (
    <>
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">
                Manage items.
            </DialogDescription>
            </DialogHeader>

            {hasArchived ? (
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="archived">Archived</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active" className="mt-4">
                        {ActiveList}
                    </TabsContent>
                    <TabsContent value="archived" className="mt-4">
                        <div className="py-2 max-h-[50vh] overflow-y-auto">
                            {archivedItems.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    No archived items.
                                </div>
                            ) : (
                                archivedItems.map((item) => (
                                    <ArchivedRow 
                                        key={item.id} 
                                        id={item.id} 
                                        text={item.label} 
                                        onUnarchive={onUnarchive}
                                        onDelete={onDelete ? requestDelete : undefined}
                                    />
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            ) : (
                ActiveList
            )}

            <DialogFooter className="flex justify-end items-center w-full gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button type="button" onClick={handleSave}>
                    Done
                </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <strong>{deleteConfirmItem?.name}</strong> from the list. 
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
};