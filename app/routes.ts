//routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth", "routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("confirm", "routes/auth/confirm.tsx"),
  ]),
  route("dashboard", "routes/dashboard.tsx", [
    index("dashboard/dashboard/index.tsx"),
    route("applications", "dashboard/applications/route.tsx"),
    route("jobs", "dashboard/jobs/jobs.tsx"),
    route("profile", "dashboard/profile/profile.tsx"),
    route("import", "dashboard/import/import.tsx"),
    route("candidates", "dashboard/candidates/candidates.tsx"),
    route("clients", "dashboard/clients/clients.tsx"),
    route("workflow", "dashboard/workflow/workflow.tsx"),
    route("communication", "dashboard/communication/communication.tsx"),
    route("collaboration", "dashboard/collaboration/collaboration.tsx"),
    route("tags", "dashboard/tags/tags.tsx"),
    route("categories", "dashboard/categories/categories.tsx"),
    route("stages", "dashboard/stages/stages.tsx"),
    route("monitoring", "dashboard/monitoring/email-monitoring.tsx"),
  ]),
] satisfies RouteConfig;
