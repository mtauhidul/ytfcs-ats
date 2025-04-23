import { Outlet, useLocation } from "react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { ProtectedRoute } from "~/components/auth/protected-route";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";

export default function DashboardLayout() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  // Mapping dashboard routes to more descriptive labels
  const breadcrumbLabels: Record<string, string> = {
    dashboard: "Dashboard",
    profile: "Profile",
    import: "Candidate Import",
    candidates: "Candidates List",
    workflow: "Application Flow",
    communication: "Communication Tools",
    collaboration: "Collaboration & Feedback",
    tags: "Tag Management",
    categories: "Category Management",
    stages: "Stage Management",
  };

  // Generate breadcrumbs based on URL segments
  const breadcrumb = segments.map((segment, idx) => ({
    title: breadcrumbLabels[segment] || segment,
    href: `/${segments.slice(0, idx + 1).join("/")}`,
  }));

  // If we're at dashboard root, show Dashboard in breadcrumb
  if (segments.length === 1 && segments[0] === "dashboard") {
    breadcrumb.push({
      title: "Overview", // Add a second breadcrumb for the index page
      href: "/dashboard",
    });
  }

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumb.map((item, idx) => (
                    <BreadcrumbItem key={item.href + idx}>
                      {idx < breadcrumb.length - 1 ? (
                        <>
                          <BreadcrumbPage>{item.title}</BreadcrumbPage>
                          <BreadcrumbSeparator className="hidden md:block" />
                        </>
                      ) : (
                        <BreadcrumbPage>{item.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
