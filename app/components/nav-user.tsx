// components/nav-user.tsx
import { getAuth, signOut } from "firebase/auth";
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "~/context/auth-context";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

export function NavUser() {
  const { isMobile, state } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fallback for when user data is not fully loaded
  const displayName = user?.name || "User";
  const email = user?.email || "";

  const handleLogout = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    try {
      const auth = getAuth();
      navigate("/auth/login");

      setTimeout(async () => {
        await signOut(auth);
      }, 100);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Generate initials from name - maximum 2 characters from first two name parts
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + (parts[1]?.charAt(0) || "")).toUpperCase();
  };

  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={`data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-12 transition-all duration-150 ease-in-out ${
                isCollapsed ? "w-12 justify-center p-0" : "px-3"
              }`}
            >
              <Avatar
                className={`rounded-lg ring-2 ring-background transition-all duration-150 ease-in-out ${
                  isCollapsed ? "h-8 w-8" : "h-8 w-8"
                }`}
              >
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-semibold border border-primary/20">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-sidebar-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60" />
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[240px] rounded-xl border shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
            alignOffset={0}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left text-sm border-b border-border/50">
                <Avatar className="h-9 w-9 rounded-lg ring-2 ring-background">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold border border-primary/20">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <div className="p-1">
              <DropdownMenuItem
                onClick={() => navigate("/dashboard/profile")}
                className="cursor-pointer px-3 py-2 rounded-lg transition-colors"
              >
                <UserCircle className="mr-3 size-4" />
                <span className="font-medium">My Profile</span>
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="my-1" />

            <div className="p-1">
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer px-3 py-2 rounded-lg transition-colors text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-3 size-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
