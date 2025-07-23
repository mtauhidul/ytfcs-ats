// app/dashboard/applications/applications.tsx
"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  Check,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Star,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { db } from "~/lib/firebase";
import type { Application, ApplicationStats } from "~/types/application";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch applications
  useEffect(() => {
    const q = query(
      collection(db, "applications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const applicationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Application[];

        setApplications(applicationList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching applications:", error);
        toast.error("Failed to load applications");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter === "all") {
      // Show all applications except converted and rejected ones
      matchesStatus = app.status !== "converted" && app.status !== "rejected";
    } else if (statusFilter === "pending") {
      matchesStatus =
        app.status === "pending" ||
        app.status === "pending_rev" ||
        app.status === "pending_review";
    } else {
      matchesStatus = app.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats: ApplicationStats = {
    total: applications.length,
    pending: applications.filter(
      (app) =>
        app.status === "pending" ||
        app.status === "pending_rev" ||
        app.status === "pending_review"
    ).length,
    approved: applications.filter((app) => app.status === "approved").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
    converted: applications.filter((app) => app.status === "converted").length,
  };

  // Handle status change
  const handleStatusChange = async (
    applicationId: string,
    newStatus: Application["status"],
    notes?: string
  ) => {
    try {
      setIsSubmitting(true);

      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      if (newStatus !== "pending") {
        updateData.reviewedAt = new Date().toISOString();
        updateData.reviewedBy = "HR Team"; // TODO: Get from auth context
        if (notes) {
          updateData.reviewNotes = notes;
          if (newStatus === "rejected") {
            updateData.rejectionReason = notes;
          }
        }
      }

      await updateDoc(doc(db, "applications", applicationId), updateData);

      const statusLabels = {
        pending: "set to pending review",
        pending_rev: "set to pending review",
        pending_review: "set to pending review",
        approved: "approved",
        rejected: "rejected",
        converted: "converted to candidate",
      };

      toast.success(`Application ${statusLabels[newStatus]} successfully!`);
    } catch (error) {
      console.error("Error updating application status:", error);
      toast.error("Failed to update application status");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle approve application and automatically convert to candidate
  const handleApproveAndConvert = async (applicationId: string) => {
    try {
      setIsSubmitting(true);

      // Find the application
      const application = applications.find((app) => app.id === applicationId);
      if (!application) {
        toast.error("Application not found");
        return;
      }

      // Create candidate record directly
      const candidateData = {
        name: application.name,
        email: application.email || "",
        phone: application.phone || "",
        skills: application.skills || [],
        experience: application.experience || "",
        education: application.education || "",
        resumeText: application.resumeText || "",
        linkedIn: application.linkedIn || "",
        location: application.location || "",
        languages: application.languages || [],
        jobTitle: application.jobTitle || "",
        resumeFileURL: application.resumeFileURL,
        originalFilename: application.originalFilename || "",
        fileType: application.fileType || "",
        fileSize: application.fileSize || 0,
        resumeScore: application.resumeScore || null,
        resumeScoringDetails: application.resumeScoringDetails || null,
        scoredAgainstJobId: application.scoredAgainstJobId || null,
        scoredAgainstJobTitle: application.scoredAgainstJobTitle || null,
        source: application.source,
        tags: [],
        category: "General",
        rating: 0,
        stageId: "unassigned",
        notes: `Approved and converted from application`,
        documents: application.resumeFileURL
          ? [
              {
                id: Date.now().toString(),
                name: application.originalFilename || "Resume",
                type: application.fileType || "application/pdf",
                size: application.fileSize || 0,
                uploadDate: application.createdAt,
                url: application.resumeFileURL,
              },
            ]
          : [],
        history: [
          {
            date: new Date().toISOString(),
            note: `Candidate created from approved application (${application.source})`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to candidates collection
      await addDoc(collection(db, "candidates"), candidateData);

      // Update application status to converted
      const applicationRef = doc(db, "applications", applicationId);
      await updateDoc(applicationRef, {
        status: "converted",
        convertedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast.success(
        "Application approved and converted to candidate successfully!"
      );
    } catch (error) {
      console.error("Error approving and converting application:", error);
      toast.error("Failed to approve and convert application");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle approve application
  const handleApprove = async (application: Application) => {
    try {
      setIsApproving(true);
      await handleStatusChange(
        application.id,
        "approved",
        reviewNotes.trim() || "Approved via review modal"
      );
      setIsReviewOpen(false);
      setSelectedApplication(null);
      setReviewNotes("");
    } catch (error) {
      console.error("Error approving application:", error);
    } finally {
      setIsApproving(false);
    }
  };

  // Handle reject application
  const handleReject = async (application: Application) => {
    try {
      setIsRejecting(true);
      await handleStatusChange(
        application.id,
        "rejected",
        reviewNotes.trim() || "Rejected via review modal"
      );
      setIsReviewOpen(false);
      setSelectedApplication(null);
      setReviewNotes("");
    } catch (error) {
      console.error("Error rejecting application:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  // Convert approved application to candidate
  const handleConvertToCandidate = async (application: Application) => {
    try {
      setIsSubmitting(true);

      // Create candidate record
      const candidateData = {
        name: application.name,
        email: application.email || "",
        phone: application.phone || "",
        skills: application.skills || [],
        experience: application.experience || "",
        education: application.education || "",
        resumeText: application.resumeText || "",
        linkedIn: application.linkedIn || "",
        location: application.location || "",
        languages: application.languages || [],
        jobTitle: application.jobTitle || "",
        resumeFileURL: application.resumeFileURL,
        originalFilename: application.originalFilename || "",
        fileType: application.fileType || "",
        fileSize: application.fileSize || 0,
        resumeScore: application.resumeScore || null,
        resumeScoringDetails: application.resumeScoringDetails || null,
        scoredAgainstJobId: application.scoredAgainstJobId || null,
        scoredAgainstJobTitle: application.scoredAgainstJobTitle || null,
        source: application.source,
        tags: [],
        category: "General",
        rating: 0,
        stageId: "unassigned",
        notes: application.reviewNotes || "",
        documents: application.resumeFileURL
          ? [
              {
                id: Date.now().toString(),
                name: application.originalFilename || "Resume",
                type: application.fileType || "application/pdf",
                size: application.fileSize || 0,
                uploadDate: application.createdAt,
                url: application.resumeFileURL,
              },
            ]
          : [],
        history: [
          {
            date: new Date().toISOString(),
            note: `Candidate created from approved application (${application.source})`,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const candidateRef = await addDoc(
        collection(db, "candidates"),
        candidateData
      );

      // Update application status to converted
      await updateDoc(doc(db, "applications", application.id), {
        status: "converted",
        candidateId: candidateRef.id,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Application converted to candidate successfully!");

      // Show success message with link to candidates section
      setTimeout(() => {
        toast.success(
          "🎉 Candidate added to database! Check the Candidates section.",
          {
            duration: 5000,
          }
        );
      }, 1000);

      setIsReviewOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      console.error("Error converting to candidate:", error);
      toast.error("Failed to convert to candidate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete application
  const handleDelete = async (applicationId: string) => {
    try {
      await deleteDoc(doc(db, "applications", applicationId));
      toast.success("Application deleted");
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Failed to delete application");
    }
  };

  const getStatusBadge = (status: Application["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "converted":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <User className="h-3 w-3 mr-1" />
            Converted
          </Badge>
        );
      case "pending":
      case "pending_rev":
      case "pending_review":
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  const getSourceIcon = (source: Application["source"]) => {
    switch (source) {
      case "email_import":
        return <Mail className="w-4 h-4" />;
      case "manual_upload":
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            Review submitted resumes and applications before adding to
            candidates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {filteredApplications.length} applications
          </Badge>
          {statusFilter === "all" && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Converted & rejected hidden
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applications</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {filteredApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Candidate</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Submitted</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application, index) => (
                    <tr
                      key={application.id}
                      className={`border-b hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      {/* Candidate Column */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {application.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {application.name}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              {getSourceIcon(application.source)}
                              <span>
                                {application.source.replace("_", " ")}
                              </span>
                              {application.originalFilename && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px]">
                                    {application.originalFilename}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Column */}
                      <td className="p-4">
                        <div className="space-y-1">
                          {application.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">
                                {application.email}
                              </span>
                            </div>
                          )}
                          {application.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{application.phone}</span>
                            </div>
                          )}
                          {application.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">
                                {application.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="p-4">
                        {getStatusBadge(application.status)}
                      </td>

                      {/* Submitted Column */}
                      <td className="p-4">
                        <div className="text-sm">
                          <div>
                            {new Date(
                              application.createdAt
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {new Date(application.createdAt).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {/* Quick Action Buttons */}
                          {(application.status === "pending" ||
                            application.status === "pending_rev" ||
                            application.status === "pending_review") && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleApproveAndConvert(application.id)
                                }
                                className="text-green-600 border-green-200 hover:bg-green-50 h-8 w-8 p-0"
                                disabled={isSubmitting}
                                title="Approve & Convert to Candidate"
                              >
                                {isSubmitting ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to reject ${application.name}'s application?`
                                    )
                                  ) {
                                    handleStatusChange(
                                      application.id,
                                      "rejected",
                                      "Rejected via quick action"
                                    );
                                  }
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50 h-8 w-8 p-0"
                                title="Reject Application"
                                disabled={isSubmitting}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {application.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleConvertToCandidate(application)
                              }
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                              disabled={isSubmitting}
                            >
                              <User className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline text-xs">
                                Convert
                              </span>
                            </Button>
                          )}

                          {application.status === "converted" && (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-200 bg-green-50 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              In Candidates
                            </Badge>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setIsReviewOpen(true);
                                  setReviewNotes(application.reviewNotes || "");
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              {application.resumeFileURL && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      application.resumeFileURL!,
                                      "_blank"
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Resume
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {application.status === "converted" &&
                                application.candidateId && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Navigate to candidates section with the specific candidate
                                      window.location.href = `/dashboard/candidates?id=${application.candidateId}`;
                                    }}
                                    className="text-blue-600"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View in Candidates
                                  </DropdownMenuItem>
                                )}

                              {application.status !== "converted" && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(application.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No applications found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm || statusFilter !== "all"
                  ? "No applications match your search criteria. Try adjusting your filters."
                  : "No applications have been submitted yet. Applications from the import page will appear here for review."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b">
            <DialogTitle className="text-lg sm:text-xl">
              Review Application - {selectedApplication?.name}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Review and approve or reject this application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger
                        value="details"
                        className="text-xs sm:text-sm"
                      >
                        Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="resume"
                        className="text-xs sm:text-sm"
                      >
                        Resume Text
                      </TabsTrigger>
                      <TabsTrigger
                        value="scoring"
                        className="text-xs sm:text-sm"
                      >
                        Scoring
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="details"
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Name
                          </label>
                          <p className="text-sm text-muted-foreground break-words">
                            {selectedApplication.name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Email
                          </label>
                          <p className="text-sm text-muted-foreground break-all">
                            {selectedApplication.email || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Phone
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {selectedApplication.phone || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Location
                          </label>
                          <p className="text-sm text-muted-foreground break-words">
                            {selectedApplication.location || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Job Title
                          </label>
                          <p className="text-sm text-muted-foreground break-words">
                            {selectedApplication.jobTitle || "Not provided"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">
                            Source
                          </label>
                          <div className="flex items-center gap-2">
                            {getSourceIcon(selectedApplication.source)}
                            <span className="text-sm text-muted-foreground">
                              {selectedApplication.source.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {selectedApplication.skills &&
                        selectedApplication.skills.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Skills
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedApplication.skills.map(
                                (skill, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs px-2 py-1"
                                  >
                                    {skill}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {selectedApplication.experience && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Experience
                          </label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {selectedApplication.experience}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedApplication.education && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            Education
                          </label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {selectedApplication.education}
                            </p>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="resume" className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">
                          Resume Text
                        </label>
                        <div className="border rounded-lg bg-gray-50">
                          <ScrollArea className="h-[300px] sm:h-[400px] w-full">
                            <div className="p-4">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-sans">
                                {selectedApplication.resumeText ||
                                  "No resume text available"}
                              </pre>
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="scoring" className="space-y-4">
                      {selectedApplication.resumeScore ? (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                            <div className="text-center flex-shrink-0">
                              <div
                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl ${
                                  selectedApplication.resumeScore >= 80
                                    ? "bg-green-100 text-green-700"
                                    : selectedApplication.resumeScore >= 60
                                    ? "bg-blue-100 text-blue-700"
                                    : selectedApplication.resumeScore >= 40
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {Math.round(selectedApplication.resumeScore)}
                              </div>
                              <p className="text-sm font-medium mt-2">Score</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-lg">
                                {selectedApplication.resumeScore >= 80
                                  ? "Excellent Match"
                                  : selectedApplication.resumeScore >= 60
                                  ? "Good Match"
                                  : selectedApplication.resumeScore >= 40
                                  ? "Fair Match"
                                  : "Poor Match"}
                              </p>
                              <p className="text-sm text-muted-foreground break-words">
                                Scored against:{" "}
                                {selectedApplication.scoredAgainstJobTitle ||
                                  "No job specified"}
                              </p>
                            </div>
                          </div>

                          {selectedApplication.resumeScoringDetails && (
                            <div className="space-y-3">
                              <label className="text-sm font-medium text-foreground">
                                Scoring Details
                              </label>
                              <div className="border rounded-lg bg-gray-50">
                                <ScrollArea className="h-[200px] sm:h-[300px] w-full">
                                  <div className="p-4">
                                    <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                                      {JSON.stringify(
                                        selectedApplication.resumeScoringDetails,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </ScrollArea>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            No scoring information available
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Review Notes */}
                  <div className="space-y-3 border-t pt-4">
                    <label className="text-sm font-medium text-foreground">
                      {selectedApplication.status === "pending" ||
                      selectedApplication.status === "pending_rev" ||
                      selectedApplication.status === "pending_review"
                        ? "Review Notes"
                        : "Review Notes/Rejection Reason"}
                    </label>
                    {selectedApplication.status === "pending" ||
                    selectedApplication.status === "pending_rev" ||
                    selectedApplication.status === "pending_review" ? (
                      <Textarea
                        placeholder="Add your review notes..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        className="resize-none min-h-[80px]"
                      />
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                          {selectedApplication.reviewNotes ||
                            selectedApplication.rejectionReason ||
                            "No notes provided"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end p-4 sm:p-6 border-t bg-background">
            <Button
              variant="outline"
              onClick={() => setIsReviewOpen(false)}
              disabled={isApproving || isRejecting}
              className="w-full sm:w-auto order-1 sm:order-1"
            >
              Close
            </Button>

            {(selectedApplication?.status === "pending" ||
              selectedApplication?.status === "pending_rev" ||
              selectedApplication?.status === "pending_review") && (
              <>
                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedApplication && handleReject(selectedApplication)
                  }
                  disabled={isApproving || isRejecting}
                  className="w-full sm:w-auto order-3 sm:order-2"
                >
                  {isRejecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>

                <Button
                  onClick={() =>
                    selectedApplication && handleApprove(selectedApplication)
                  }
                  disabled={isApproving || isRejecting}
                  className="w-full sm:w-auto order-2 sm:order-3"
                >
                  {isApproving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
