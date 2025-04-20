import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageWithShares } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, Share2, Trash2, X, Users, User } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ImagePreviewModalProps = {
  image: ImageWithShares;
  onClose: () => void;
};

export default function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Format date
  const formattedDate = new Date(image.uploadedAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Check if user owns this image
  const isOwner = user?.id === image.userId;

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/images/${image.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images/dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images/by-date"] });
      
      // Invalidate group images if the image was shared with groups
      if (image.shares && image.shares.groups && image.shares.groups.length > 0) {
        image.shares.groups.forEach(group => {
          queryClient.invalidateQueries({ queryKey: ["/api/groups", group.id, "images"] });
        });
      }
      
      toast({
        title: "Image deleted",
        description: "The image has been deleted successfully",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting your image",
        variant: "destructive",
      });
    },
  });

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.path;
    link.download = `image-${image.id}${getExtension(image.path)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get file extension from path
  const getExtension = (path: string) => {
    const match = path.match(/\.[0-9a-z]+$/i);
    return match ? match[0] : '';
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden max-h-[90vh]">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex flex-col md:flex-row">
            {/* Image Display */}
            <div className="md:w-3/4 bg-black flex items-center justify-center">
              <img 
                src={image.path}
                alt={image.description || "Uploaded image"}
                className="max-h-[80vh] max-w-full object-contain"
              />
            </div>
            
            {/* Image Details */}
            <div className="md:w-1/4 p-4 border-t md:border-t-0 md:border-l border-gray-200 overflow-y-auto">
              <div className="mb-4 flex items-center">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {user?.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-500">{formattedDate}</p>
                </div>
              </div>
              
              {image.description && (
                <div className="border-t border-gray-200 py-3">
                  <p className="text-gray-800">{image.description}</p>
                </div>
              )}
              
              {/* Shared with section */}
              {image.shares && (
                <div className="border-t border-gray-200 py-3">
                  <h4 className="font-medium mb-2">Shared with</h4>
                  <div className="flex flex-wrap gap-2">
                    {image.shares.groups && image.shares.groups.length > 0 && 
                      image.shares.groups.map(group => (
                        <Badge key={group.id} className="flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200">
                          <Users className="h-3 w-3" />
                          <span>{group.name}</span>
                        </Badge>
                      ))
                    }
                    
                    {image.shares.users && image.shares.users.length > 0 && 
                      image.shares.users.map(user => (
                        <Badge key={user.id} className="flex items-center gap-1 bg-gray-100 text-gray-800 hover:bg-gray-200">
                          <User className="h-3 w-3" />
                          <span>{user.username}</span>
                        </Badge>
                      ))
                    }
                    
                    {(!image.shares.groups || image.shares.groups.length === 0) && 
                     (!image.shares.users || image.shares.users.length === 0) && (
                      <p className="text-sm text-gray-500">Not shared with anyone</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="border-t border-gray-200 py-3">
                <h4 className="font-medium mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  
                  {isOwner && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteImageMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteImageMutation.isPending}
            >
              {deleteImageMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
