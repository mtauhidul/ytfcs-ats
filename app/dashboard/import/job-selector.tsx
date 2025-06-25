// app/dashboard/import/job-selector.tsx

import { collection, onSnapshot, query } from "firebase/firestore";
import { Briefcase, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { db } from "~/lib/firebase";

export interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  salary: string;
  department: string;
}

interface JobSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  onJobChange?: (jobData: Job | null) => void;
}

export default function JobSelector({
  value,
  onChange,
  disabled = false,
  className = "",
  onJobChange,
}: JobSelectorProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch jobs from Firestore
  useEffect(() => {
    const q = query(collection(db, "jobs"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "Untitled Job",
            status: data.status || "Draft",
            location: data.location || "",
            salary: data.salary || "",
            department: data.department || "",
          };
        });
        setJobs(jobsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching jobs:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Notify parent of job data when selected job changes
  useEffect(() => {
    if (onJobChange && value) {
      const selectedJob = jobs.find((job) => job.id === value) || null;
      onJobChange(selectedJob);
    }
  }, [value, jobs, onJobChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="job-selector" className="text-sm font-medium">
        Score Against Job Posting
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || loading}
      >
        <SelectTrigger
          id="job-selector"
          className="w-full"
          disabled={disabled || loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading jobs...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select a job to score against" />
          )}
        </SelectTrigger>
        <SelectContent>
          {jobs.length === 0 ? (
            <div className="py-2 px-2 text-sm text-muted-foreground text-center">
              No jobs available
            </div>
          ) : (
            jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="font-medium">{job.title}</span>
                  {job.status === "Published" && (
                    <Check className="h-3 w-3 text-green-500 ml-1" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {job.location}
                  {job.department ? ` • ${job.department}` : ""}
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <div className="text-xs text-muted-foreground">
        Select a job to calculate a resume match score
      </div>
    </div>
  );
}
