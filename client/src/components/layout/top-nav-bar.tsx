import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotificationWithDetails } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Bell } from "lucide-react";
import NotificationDropdown from "@/components/notifications/notification-dropdown";

type TopNavBarProps = {
  title: string;
  onUploadClick?: () => void;
  hideUploadButton?: boolean;
};

export default function TopNavBar({ 
  title, 
  onUploadClick,
  hideUploadButton = false
}: TopNavBarProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch notifications
  const { data: notifications, isLoading: isNotificationsLoading } = useQuery<NotificationWithDetails[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleToggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Upload Button */}
        {!hideUploadButton && onUploadClick && (
          <Button 
            className="hidden sm:flex items-center gap-1"
            onClick={onUploadClick}
          >
            <Upload size={16} />
            <span>Upload</span>
          </Button>
        )}
        
        {/* Mobile Upload Button */}
        {!hideUploadButton && onUploadClick && (
          <Button 
            className="sm:hidden" 
            size="icon"
            onClick={onUploadClick}
          >
            <Upload size={20} />
          </Button>
        )}
        
        {/* Notifications */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
            onClick={handleToggleNotifications}
          >
            <Bell size={20} />
            
            {/* Notification Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
          
          {/* Notifications Dropdown */}
          <NotificationDropdown
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notifications={notifications || []}
            isLoading={isNotificationsLoading}
          />
        </div>
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-48 lg:w-64 pl-8"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>
    </header>
  );
}
