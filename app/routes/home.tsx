import Welcome from "~/welcome/welcome";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "YTFCS-ATS" },
    { name: "description", content: "Welcome to YTFCS ATS!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
