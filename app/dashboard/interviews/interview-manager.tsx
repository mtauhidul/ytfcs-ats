// app/dashboard/interviews/interview-manager.tsx
"use client";

import { format } from "date-fns";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  Building,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  MessageSquare,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar as CalendarComponent } from "~/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";
import type { Candidate } from "~/types";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InterviewManagerProps {
  candidate: Candidate;
  onInterviewScheduled?: () => void;
}

export default function InterviewManager({
  candidate,
  onInterviewScheduled,
}: InterviewManagerProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [interviewers, setInterviewers] = useState<TeamMember[]>([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Fetch team members with "Interviewer" role
  useEffect(() => {
    const fetchInterviewers = async () => {
      try {
        const q = query(
          collection(db, "teamMembers"),
          where("role", "==", "Interviewer")
        );
        const snapshot = await getDocs(q);
        const interviewerList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          email: doc.data().email || "",
          role: doc.data().role || "",
        }));
        setInterviewers(interviewerList);
      } catch (error) {
        console.error("Error fetching interviewers:", error);
        toast.error("Failed to load interviewers");
      }
    };

    fetchInterviewers();
  }, []);

  // Check for duplicate interview when interviewer is selected
  useEffect(() => {
    if (selectedInterviewer && candidate.interviewHistory) {
      const selectedInterviewerData = interviewers.find(
        (i) => i.id === selectedInterviewer
      );
      const hasPreviousInterview = candidate.interviewHistory.some(
        (interview) => interview.interviewerId === selectedInterviewer
      );

      if (hasPreviousInterview && selectedInterviewerData) {
        setDuplicateWarning(
          `⚠️ ${candidate.name} has already been interviewed by ${selectedInterviewerData.name}`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [selectedInterviewer, candidate, interviewers]);

  const handleScheduleInterview = async () => {
    if (!selectedInterviewer || !selectedDate || !selectedTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      const selectedInterviewerData = interviewers.find(
        (i) => i.id === selectedInterviewer
      );

      if (!selectedInterviewerData) {
        toast.error("Invalid interviewer selection");
        return;
      }

      // Combine date and time
      const [hours, minutes] = selectedTime.split(":");
      const interviewDateTime = new Date(selectedDate);
      interviewDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Create new interview record
      const newInterview = {
        id: Date.now().toString(), // Simple ID generation
        interviewerName: selectedInterviewerData.name,
        interviewerId: selectedInterviewer,
        interviewDate: interviewDateTime.toISOString(),
        outcome: "pending",
        notes: notes.trim(),
        scheduledBy: "HR Team", // You can get current user info here
      };

      // Update candidate with new interview
      const candidateRef = doc(db, "candidates", candidate.id);
      const updatedInterviewHistory = [
        ...(candidate.interviewHistory || []),
        newInterview,
      ];

      // Add to history log as well
      const historyEntry = {
        date: new Date().toISOString(),
        note: `Interview scheduled with ${
          selectedInterviewerData.name
        } for ${interviewDateTime.toLocaleDateString()} at ${interviewDateTime.toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true }
        )}`,
      };

      await updateDoc(candidateRef, {
        interviewHistory: updatedInterviewHistory,
        history: [...(candidate.history || []), historyEntry],
        updatedAt: new Date().toISOString(),
      });

      toast.success("Interview scheduled successfully");
      setIsScheduleOpen(false);
      setSelectedInterviewer("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setNotes("");
      setDuplicateWarning(null);
      setNotes("");
      setDuplicateWarning(null);

      if (onInterviewScheduled) {
        onInterviewScheduled();
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "passed":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 border-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Passed
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 border-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-800 border-amber-300"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-6 bg-card border rounded-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <Users className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Interview Management
            </h3>
            <p className="text-muted-foreground">
              Track and schedule interviews for{" "}
              <span className="font-medium text-foreground">
                {candidate.name}
              </span>
            </p>
          </div>
        </div>
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            {/* Header */}
            <DialogHeader className="space-y-2 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    Schedule Interview
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-sm">
                    Schedule an interview for{" "}
                    <span className="font-medium text-foreground">
                      {candidate.name}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Duplicate Warning */}
              {duplicateWarning && (
                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 text-xs">
                      Duplicate Interview Warning
                    </p>
                    <p className="text-amber-800 text-xs mt-0.5">
                      {duplicateWarning}
                    </p>
                  </div>
                </div>
              )}

              {/* Client Selection */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  Client / Employer
                </Label>
                <Select
                  value={selectedInterviewer}
                  onValueChange={setSelectedInterviewer}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a client or employer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewers.map((interviewer) => (
                      <SelectItem key={interviewer.id} value={interviewer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {interviewer.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {interviewer.email}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Interview Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full h-9 justify-start text-left font-normal ${
                        !selectedDate ? "text-muted-foreground" : ""
                      }`}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 z-[9999] pointer-events-auto"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    avoidCollisions={true}
                    style={{ zIndex: 9999 }}
                  >
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                      initialFocus
                      className="rounded-md border-0 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Selection */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Interview Time
                </Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Generate time options */}
                    {Array.from({ length: 24 }, (_, hour) => {
                      return [0, 30].map((minute) => {
                        const time = `${hour
                          .toString()
                          .padStart(2, "0")}:${minute
                          .toString()
                          .padStart(2, "0")}`;
                        const displayTime = new Date(
                          `2000-01-01T${time}`
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        });
                        return (
                          <SelectItem key={time} value={time}>
                            {displayTime}
                          </SelectItem>
                        );
                      });
                    }).flat()}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Additional Notes{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </Label>
                <Textarea
                  placeholder="Add any special instructions, requirements, or notes about this interview..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsScheduleOpen(false)}
                  className="flex-1 h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleInterview}
                  disabled={
                    isSubmitting ||
                    !selectedInterviewer ||
                    !selectedDate ||
                    !selectedTime
                  }
                  className="flex-1 h-9"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Interview
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Interview History List */}
      <div className="space-y-4">
        {candidate.interviewHistory && candidate.interviewHistory.length > 0 ? (
          <div className="space-y-3">
            {candidate.interviewHistory
              .sort(
                (a, b) =>
                  new Date(b.interviewDate).getTime() -
                  new Date(a.interviewDate).getTime()
              )
              .map((interview) => (
                <div
                  key={interview.id}
                  className="group bg-card border rounded-lg p-4 hover:shadow-sm transition-all relative"
                >
                  <div className="absolute top-4 right-4">
                    {getOutcomeBadge(interview.outcome || "pending")}
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getOutcomeIcon(interview.outcome || "pending")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground truncate">
                          {interview.interviewerName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(interview.interviewDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}{" "}
                          at{" "}
                          {new Date(interview.interviewDate).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>

                      {interview.notes && (
                        <div className="bg-muted rounded-lg p-3 mb-3 border-l-4 border-border">
                          <p className="text-sm text-foreground leading-relaxed">
                            {interview.notes}
                          </p>
                        </div>
                      )}

                      {interview.scheduledBy && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Scheduled by: {interview.scheduledBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <div className="p-3 bg-card rounded-full w-fit mx-auto mb-4 shadow-sm">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              No interviews scheduled
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Get started by scheduling the first interview with a client
            </p>
            <div className="inline-flex items-center text-sm text-muted-foreground font-medium">
              <Calendar className="h-4 w-4 mr-1" />
              Click "Schedule Interview" above
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
