import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, Image, Users, UserRound, LogOut, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { 
      path: "/", 
      label: "Home", 
      icon: <Home size={isMobile ? 24 : 20} /> 
    },
    { 
      path: "/uploads", 
      label: "My Uploads", 
      icon: <Image size={isMobile ? 24 : 20} /> 
    },
    { 
      path: "/calendar", 
      label: "Calendar", 
      icon: <CalendarDays size={isMobile ? 24 : 20} /> 
    },
    { 
      path: "/groups", 
      label: "Groups", 
      icon: <Users size={isMobile ? 24 : 20} /> 
    },
    { 
      path: "/friends", 
      label: "Friends", 
      icon: <UserRound size={isMobile ? 24 : 20} /> 
    },
  ];

  return (
    <aside className="w-16 md:w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary hidden md:block">Imageshare</h1>
        <div className="md:hidden flex justify-center">
          <span className="text-2xl font-bold text-primary">IS</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <a
                  className={cn(
                    "flex items-center px-4 py-2 mx-2 rounded-md transition-colors",
                    location === item.path
                      ? "bg-gray-100 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                  )}
                >
                  {item.icon}
                  <span className="ml-3 hidden md:block">{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-300 text-gray-600">
              {user?.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-3 hidden md:block">
            <p className="text-sm font-medium text-gray-800">{user?.username}</p>
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs text-gray-500 hover:text-primary"
              onClick={handleLogout}
            >
              Log out
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="ml-auto md:hidden" 
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
