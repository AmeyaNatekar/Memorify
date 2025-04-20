import { useState, useRef, useEffect, ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Group, User } from "@shared/schema";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Upload } from "lucide-react";
import { Loader2 } from "lucide-react";

type ImageUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultSelectedGroup?: Group | null;
};

export default function ImageUploadModal({
  isOpen,
  onClose,
  defaultSelectedGroup = null,
}: ImageUploadModalProps) {
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>(
    defaultSelectedGroup ? [defaultSelectedGroup] : []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreview(null);
      setDescription("");
      setShareSearchQuery("");
      setSelectedUsers([]);
      if (!defaultSelectedGroup) {
        setSelectedGroups([]);
      }
    } else if (defaultSelectedGroup) {
      setSelectedGroups([defaultSelectedGroup]);
    }
  }, [isOpen, defaultSelectedGroup]);

  // Fetch friends for sharing
  const { data: friends, isLoading: isFriendsLoading } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: isOpen,
  });

  // Fetch groups for sharing
  const { data: groups, isLoading: isGroupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups"],
    enabled: isOpen,
  });

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("image", selectedFile);
      
      if (description) {
        formData.append("description", description);
      }

      if (selectedUsers.length > 0) {
        formData.append("userIds", JSON.stringify(selectedUsers.map(user => user.id)));
      }

      if (selectedGroups.length > 0) {
        formData.append("groupIds", JSON.stringify(selectedGroups.map(group => group.id)));
      }

      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to upload image");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images/dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images/by-date"] });
      
      // Invalidate group images if sharing with a group
      if (selectedGroups.length > 0) {
        selectedGroups.forEach(group => {
          queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id, "images"] });
        });
      }

      toast({
        title: "Upload successful",
        description: "Your image has been uploaded successfully",
      });
      
      onClose();
      setSelectedFile(null);
      setPreview(null);
      setDescription("");
      setSelectedUsers([]);
      setSelectedGroups(defaultSelectedGroup ? [defaultSelectedGroup] : []);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your image",
        variant: "destructive",
      });
    },
  });

  // Filter friends and groups based on search query
  const filteredFriends = shareSearchQuery && friends 
    ? friends.filter(friend => 
        friend.user.username.toLowerCase().includes(shareSearchQuery.toLowerCase())
      )
    : [];

  const filteredGroups = shareSearchQuery && groups
    ? groups.filter(group => 
        group.name.toLowerCase().includes(shareSearchQuery.toLowerCase())
      )
    : [];

  // Add/remove users and groups from selection
  const toggleUser = (user: User) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const toggleGroup = (group: Group) => {
    if (selectedGroups.some(g => g.id === group.id)) {
      setSelectedGroups(selectedGroups.filter(g => g.id !== group.id));
    } else {
      setSelectedGroups([...selectedGroups, group]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!preview ? (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept="image/*" 
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-gray-800 font-medium mb-1">Click to upload</p>
                <p className="text-gray-500 text-sm">or drag and drop</p>
                <p className="text-gray-400 text-xs mt-2">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-auto max-h-64 object-contain rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea 
              id="description" 
              rows={3} 
              placeholder="Add a description for your image"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Share with
            </label>
            
            {/* Selected items */}
            {(selectedUsers.length > 0 || selectedGroups.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedUsers.map(user => (
                  <Badge 
                    key={user.id} 
                    className="gap-1 bg-gray-100 text-gray-800 hover:bg-gray-200 px-2 py-1"
                  >
                    {user.username}
                    <button 
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      onClick={() => toggleUser(user)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                {selectedGroups.map(group => (
                  <Badge 
                    key={group.id}
                    className="gap-1 bg-green-100 text-green-800 hover:bg-green-200 px-2 py-1"
                  >
                    {group.name}
                    <button 
                      className="ml-1 text-green-500 hover:text-green-700"
                      onClick={() => toggleGroup(group)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Search friends or groups..." 
                className="pl-8"
                value={shareSearchQuery}
                onChange={(e) => setShareSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Search results */}
            {shareSearchQuery && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md divide-y">
                {(isFriendsLoading || isGroupsLoading) ? (
                  <div className="p-2 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : (
                  <>
                    {filteredFriends.length > 0 && (
                      <div className="p-1">
                        <p className="text-xs font-medium text-gray-500 px-2 py-1">Friends</p>
                        {filteredFriends.map(friend => (
                          <div 
                            key={friend.user.id}
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer rounded-md"
                            onClick={() => toggleUser(friend.user)}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                              {friend.user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{friend.user.username}</span>
                            {selectedUsers.some(u => u.id === friend.user.id) && (
                              <div className="ml-auto w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {filteredGroups.length > 0 && (
                      <div className="p-1">
                        <p className="text-xs font-medium text-gray-500 px-2 py-1">Groups</p>
                        {filteredGroups.map(group => (
                          <div 
                            key={group.id}
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer rounded-md"
                            onClick={() => toggleGroup(group)}
                          >
                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-800 flex items-center justify-center mr-2">
                              {group.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{group.name}</span>
                            {selectedGroups.some(g => g.id === group.id) && (
                              <div className="ml-auto w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {filteredFriends.length === 0 && filteredGroups.length === 0 && (
                      <div className="p-2 text-center text-sm text-gray-500">
                        No results found
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            disabled={!selectedFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
