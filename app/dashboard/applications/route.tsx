// app/dashboard/applications/route.tsx
import ApplicationsPage from "./applications";

export default function ApplicationsRoute() {
  return <ApplicationsPage />;
}

export function meta() {
  return [
    { title: "Applications - YTFCS ATS" },
    {
      name: "description",
      content: "Review and manage submitted applications",
    },
  ];
}
