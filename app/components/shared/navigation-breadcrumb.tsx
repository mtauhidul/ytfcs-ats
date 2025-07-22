// app/components/shared/navigation-breadcrumb.tsx
import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";

const routeMap: Record<string, string> = {
  dashboard: "Dashboard",
  candidates: "Candidates",
  jobs: "Jobs",
  clients: "Clients",
  workflow: "Workflow",
  communication: "Communication",
  tags: "Tags",
  categories: "Categories",
  stages: "Stages",
  monitoring: "Monitoring",
  import: "Import",
  profile: "Profile",
  settings: "Settings",
  auth: "Authentication",
  login: "Login",
};

export default function NavigationBreadcrumb() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length <= 1) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathSegments.map((segment, index) => {
          const path = "/" + pathSegments.slice(0, index + 1).join("/");
          const isLast = index === pathSegments.length - 1;
          const displayName =
            routeMap[segment] ||
            segment.charAt(0).toUpperCase() + segment.slice(1);

          return (
            <div key={path} className="flex items-center">
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={path}>{displayName}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
