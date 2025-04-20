import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { NotificationWithDetails } from "@shared/schema";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

type NotificationDropdownProps = {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationWithDetails[];
  isLoading: boolean;
};

export default function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  isLoading,
}: NotificationDropdownProps) {
  // Close on outside click
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const dropdown = document.getElementById('notification-dropdown');
        
        if (dropdown && !dropdown.contains(target) && !target.closest('[data-notification-toggle]')) {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Mark all notifications as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  if (!isOpen) return null;

  // Handle friend request response
  const handleFriendRequest = async (requestId: number, status: "accepted" | "declined") => {
    try {
      await apiRequest("PUT", `/api/friends/requests/${requestId}`, { status });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    } catch (error) {
      console.error("Error responding to friend request:", error);
    }
  };

  return (
    <div 
      id="notification-dropdown"
      className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-20"
    >
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Notifications</h3>
        {notifications.some(n => !n.isRead) && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="p-3 border-b border-gray-100">
              <div className="flex">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="ml-3 flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/4 mb-2" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : notifications.length > 0 ? (
          // Actual notifications
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
              onClick={() => {
                if (!notification.isRead) {
                  markAsReadMutation.mutate(notification.id);
                }
              }}
            >
              <div className="flex">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {notification.sender?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="ml-3 flex-1">
                  <p className="text-sm text-gray-800">
                    {notification.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                  
                  {/* Actions based on notification type */}
                  {notification.type === 'friend_request' && !notification.content.includes('accepted') && !notification.content.includes('declined') && (
                    <div className="mt-2 flex space-x-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="px-3 py-1 h-auto text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequest(notification.senderId!, "accepted");
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-3 py-1 h-auto text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequest(notification.senderId!, "declined");
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                  
                  {notification.type === 'group_invite' && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="link"
                        className="p-0 h-auto text-xs text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to group page
                        }}
                      >
                        View Group
                      </Button>
                    </div>
                  )}
                  
                  {notification.type === 'image_share' && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="link"
                        className="p-0 h-auto text-xs text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to image view
                        }}
                      >
                        View Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          // No notifications
          <div className="p-6 text-center">
            <p className="text-gray-500">No notifications</p>
          </div>
        )}
      </div>
      
      {notifications.length > 5 && (
        <div className="p-2 border-t border-gray-200 text-center">
          <Button variant="link" className="text-primary text-sm" onClick={onClose}>
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}
