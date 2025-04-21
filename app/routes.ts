import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx", [
    index("dashboard/dashboard/dashboard.tsx"), // Added the dashboard as index route
    route("import", "dashboard/import/import.tsx"),
    route("candidates", "dashboard/candidates/candidates.tsx"),
    route("workflow", "dashboard/workflow/workflow.tsx"),
    route("communication", "dashboard/communication/communication.tsx"),
    route("collaboration", "dashboard/collaboration/collaboration.tsx"),
    route("tags", "dashboard/tags/tags.tsx"),
    route("categories", "dashboard/categories/categories.tsx"),
    route("stages", "dashboard/stages/stages.tsx"),
  ]),
] satisfies RouteConfig;
