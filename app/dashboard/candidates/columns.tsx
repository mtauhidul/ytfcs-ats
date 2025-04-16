import type { ColumnDef } from "@tanstack/react-table";

// Example shape:
export type Candidate = {
  id: string;
  name: string; // e.g. "John Doe"
  experience: string; // e.g. "14 years"
  education: string; // e.g. "Bachelor of Science..."
  skills: string[]; // e.g. ["Java", "React", ...]
};

export const columns: ColumnDef<Candidate>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
    meta: {
      // 90px to let "John Doe" fit comfortably in many cases
      thClass: "w-[120px]",
      tdClass: "w-[120px] whitespace-nowrap overflow-hidden text-ellipsis",
    },
  },
  {
    accessorKey: "experience",
    header: "Yrs",
    cell: ({ row }) => row.original.experience,
    meta: {
      // 70px for short text like "14 years"
      thClass: "w-[100px]",
      tdClass: "w-[100px] whitespace-nowrap overflow-hidden text-ellipsis",
    },
  },
  {
    accessorKey: "education",
    header: "Education",
    cell: ({ row }) => row.original.education,
    meta: {
      // 200px, wrapping for longer text
      thClass: "w-[200px]",
      tdClass: "w-[200px] break-words whitespace-normal",
    },
  },
  {
    accessorKey: "skills",
    header: "Skills",
    cell: ({ row }) => row.original.skills.join(", "),
    meta: {
      // Flexible width, multi-line wrap
      tdClass: "break-words whitespace-normal",
    },
  },
];
