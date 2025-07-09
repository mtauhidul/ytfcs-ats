// app/dashboard/import/import.tsx (Updated - Manual Upload Only)

"use client";

import { addDoc, collection } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  FileUp,
  Loader2,
  Mail,
  RefreshCw,
  Upload,
  UploadCloud,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { Textarea } from "~/components/ui/textarea";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { resetImport, updateParsedData } from "~/features/candidateImportSlice";
import { db, storage } from "~/lib/firebase";
import type { AppDispatch, RootState } from "~/store";
import type { ImportedCandidate } from "~/types/email";
import JobSelector from "./job-selector";
import ResumeScore, { type ResumeScoreData } from "./resume-score";

// Define the parsed data interface
interface ParsedCandidate {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  resumeText?: string;
  affindaData?: any;
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
  resumeFileURL?: string | null;
  resumeScore?: number;
  resumeScoringDetails?: any;
}

// Job data interface
interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  salary: string;
  department: string;
}

export default function ImportPage() {
  // Basic state
  const dispatch = useDispatch<AppDispatch>();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Status
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  // AI parsing state
  const [isAiParsing, setIsAiParsing] = useState(false);

  // Scoring state
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [scoreResult, setScoreResult] = useState<ResumeScoreData | null>(null);

  // Get state from Redux
  const { parsedData, status, error } = useSelector(
    (state: RootState) => state.candidateImport
  );

  // Handle file selection (local state only)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];

      // Validate file type
      const validTypes = [
        ".pdf",
        ".doc",
        ".docx",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const isValidType = validTypes.some(
        (type) =>
          selectedFile.name.toLowerCase().endsWith(type) ||
          selectedFile.type === type
      );

      if (!isValidType) {
        toast.error("Please upload a PDF, DOC, or DOCX file");
        setErrorDetails(
          "Invalid file type. Please upload a PDF, DOC, or DOCX file."
        );
        return;
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        setErrorDetails("File too large. Maximum size is 10MB.");
        return;
      }

      setFile(selectedFile);
      // Reset any previous parsing state when a new file is selected
      if (status !== "idle") {
        dispatch(resetImport());
      }
      setErrorDetails(null);
      setScoreResult(null);
    }
  };

  // Handle job selection
  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  // Handle selected job data
  const handleJobDataChange = (jobData: Job | null) => {
    setSelectedJob(jobData);
  };

  // Parse resume using AI (with automatic scoring if job is selected)
  const handleParseWithAI = async () => {
    if (!file) return;

    try {
      setIsAiParsing(true);
      setParsingProgress(10);
      setSaveStatus("idle");
      setErrorDetails(null);

      // Add file type validation
      const validFileTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validFileTypes.includes(file.type)) {
        setErrorDetails(
          "Invalid file type. Please upload a PDF, DOC, or DOCX file."
        );
        setParsingProgress(0);
        setIsAiParsing(false);
        return;
      }

      // Add file size validation (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setErrorDetails("File too large. Maximum size is 10MB.");
        setParsingProgress(0);
        setIsAiParsing(false);
        return;
      }

      setParsingProgress(20);

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);

      // Add job ID if selected for automatic scoring
      if (selectedJobId) {
        formData.append("jobId", selectedJobId);
        if (selectedJob) {
          formData.append("jobTitle", selectedJob.title);
        }
      }

      setParsingProgress(30);

      // Make the actual API call to the backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/resume/parse`,
        {
          method: "POST",
          body: formData,
        }
      );

      setParsingProgress(50);

      // Check for error response
      if (!response.ok) {
        let errorMessage = "Failed to parse resume";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        
        throw new Error(errorMessage);
      }

      setParsingProgress(70);

      // Parse the response
      const data = await response.json();
      console.log("API Response:", data); // Debug log

      setParsingProgress(85);

      if (!data.success) {
        throw new Error(data.message || "Failed to parse resume");
      }

      // Create the parsed candidate object with proper data extraction
      const candidateData = data.candidate || data.data || data;
      const scoreData = data.score || data.resumeScore || data.scoring;
      
      const parsedCandidate: ParsedCandidate = {
        name: candidateData?.name || data.name || "",
        email: candidateData?.email || data.email || "",
        phone: candidateData?.phone || data.phone || "",
        skills: candidateData?.skills || data.skills || [],
        experience: candidateData?.experience || data.experience || "",
        education: candidateData?.education || data.education || "",
        resumeText: candidateData?.resumeText || data.resumeText || "",
        affindaData: candidateData?.affindaData || data.affindaData || null,
        linkedIn: candidateData?.linkedIn || data.linkedIn || "",
        location: candidateData?.location || data.location || "",
        languages: candidateData?.languages || data.languages || [],
        jobTitle: candidateData?.jobTitle || data.jobTitle || "",
        originalFilename: file.name,
        fileType: file.type,
        fileSize: file.size,
        resumeFileURL: candidateData?.resumeFileURL || data.resumeFileURL || null,
        resumeScore: scoreData?.finalScore || scoreData?.score || data.resumeScore || null,
        resumeScoringDetails: scoreData || data.resumeScoringDetails || null,
      };

      console.log("Parsed Candidate:", parsedCandidate); // Debug log

      setParsingProgress(100);

      // Store the parsed data in Redux
      dispatch(updateParsedData(parsedCandidate));

      // If score is available, set it
      if (scoreData && scoreData.componentScores) {
        console.log("Setting scoreResult with:", scoreData);
        setScoreResult(scoreData);
      } else {
        console.log("Not setting scoreResult. scoreData:", scoreData);
      }

      // Show success message with score info if available
      const scoreValue = scoreData?.finalScore || scoreData?.score || data.resumeScore;
      if (selectedJobId && scoreValue) {
        toast.success(`Resume parsed and scored successfully! Score: ${Math.round(scoreValue)}%`);
      } else {
        toast.success("Resume parsed successfully!");
      }
    } catch (error) {
      console.error("Error parsing resume:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to parse resume";
      setErrorDetails(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Create a synthetic event to reuse the file handling logic
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileChange(syntheticEvent);
    }
  };

  // Handle updating parsed data
  const handleUpdate = (field: string, value: any) => {
    const updates = { [field]: value };
    if (field === "skills" && typeof value === "string") {
      updates.skills = value.split(",").map((skill) => skill.trim());
    }
    if (field === "languages" && typeof value === "string") {
      updates.languages = value.split(",").map((lang) => lang.trim());
    }
    dispatch(updateParsedData(updates));
  };

  // Handle saving to database
  const handleSave = async () => {
    if (!parsedData || !parsedData.name) {
      toast.error("Please provide at least a candidate name");
      return;
    }

    setSaveStatus("saving");

    try {
      let resumeFileURL: string | null = null;

      // Upload resume file if available
      if (file) {
        const timestamp = new Date().getTime();
        const filename = `resumes/${timestamp}_${file.name}`;
        const storageRef = ref(storage, filename);
        
        const snapshot = await uploadBytes(storageRef, file);
        resumeFileURL = await getDownloadURL(snapshot.ref);
      }

      // Prepare candidate data for Firestore
      const candidateData = {
        name: parsedData.name,
        email: parsedData.email || "",
        phone: parsedData.phone || "",
        skills: parsedData.skills || [],
        experience: parsedData.experience || "",
        education: parsedData.education || "",
        resumeText: parsedData.resumeText || "",
        linkedIn: parsedData.linkedIn || "",
        location: parsedData.location || "",
        languages: parsedData.languages || [],
        jobTitle: parsedData.jobTitle || "",
        originalFilename: parsedData.originalFilename || file?.name || "",
        fileType: parsedData.fileType || file?.type || "",
        fileSize: parsedData.fileSize || file?.size || 0,
        resumeFileURL,
        resumeScore: parsedData.resumeScore || null,
        resumeScoringDetails: parsedData.resumeScoringDetails || null,
        scoredAgainstJobId: selectedJobId || null,
        scoredAgainstJobTitle: selectedJob?.title || null,
        source: "manual_upload",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, "candidates"), candidateData);
      
      setSaveStatus("done");
      toast.success("Candidate saved successfully!");
      
      // Reset the form after successful save
      setTimeout(() => {
        setSaveStatus("idle");
        // Clear all form data
        setFile(null);
        setParsingProgress(0);
        setErrorDetails(null);
        setScoreResult(null);
        setSelectedJobId("");
        setSelectedJob(null);
        dispatch(resetImport());
      }, 2000);
      
    } catch (error) {
      console.error("Error saving candidate:", error);
      setSaveStatus("error");
      toast.error("Failed to save candidate");
      
      // Reset error status after a delay
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    }
  };

  // Handle reset
  const handleReset = () => {
    setFile(null);
    setParsingProgress(0);
    setErrorDetails(null);
    setSaveStatus("idle");
    setScoreResult(null);
    setSelectedJobId("");
    setSelectedJob(null);
    dispatch(resetImport());
    toast.success("Form reset successfully");
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Import Candidates</h1>
        <p className="text-muted-foreground">
          Upload resume files to automatically extract candidate information using AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - File Upload */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" />
              Upload Resume
            </CardTitle>
            <CardDescription>
              Upload candidate resume files for AI-powered data extraction
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* File Upload Section */}
            <div className="min-h-[300px] space-y-4">
              <div
                className={`border-2 border-dashed 
                  ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : file
                      ? "border-green-300 bg-green-50/40"
                      : "border-muted-foreground/20"
                  } 
                  rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div
                  className={`${
                    file ? "bg-green-100" : "bg-muted/50"
                  } p-4 rounded-full`}
                >
                  {file ? (
                    <Check className="size-8 text-green-600" />
                  ) : (
                    <Upload className="size-8 text-muted-foreground" />
                  )}
                </div>

                <div className="text-center">
                  {file ? (
                    <>
                      <p className="font-medium mb-1 text-green-700">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium mb-1">
                        Drop resume file here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        PDF, DOC, or DOCX (max 10MB)
                      </p>
                    </>
                  )}

                  <div className="relative">
                    {file ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setFile(null)}
                      >
                        <RefreshCw className="mr-2 size-4" />
                        Change File
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" className="w-full">
                          Select File
                        </Button>
                        <Input
                          id="resumeFile"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Job selector for resume scoring */}
              <JobSelector
                value={selectedJobId}
                onChange={handleJobChange}
                onJobChange={handleJobDataChange}
                disabled={isAiParsing}
                className="mt-4"
              />
              
              {/* Job selection hint */}
              {!selectedJobId && (
                <div className="mt-2 text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800">
                      <strong>Tip:</strong> Select a job position to automatically score the resume against job requirements during parsing.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {file && (
                  <Button
                    onClick={handleParseWithAI}
                    disabled={status === "loading" || isAiParsing}
                    className="w-full"
                  >
                    {status === "loading" || isAiParsing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        {selectedJobId ? "Parsing & Scoring..." : "Parsing Resume..."}
                      </div>
                    ) : (
                      <>
                        <Zap className="mr-2 size-4" />
                        {selectedJobId ? "Parse & Score Resume" : "Parse with AI"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Error display */}
            {errorDetails && (
              <div className="mt-4 bg-red-50 text-red-600 border border-red-200 rounded-md p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm text-red-600/90">{errorDetails}</p>
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {(status === "loading" || isAiParsing) && (
              <div className="mt-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">
                    Parsing resume...
                  </span>
                  <span className="text-xs font-medium">
                    {parsingProgress}%
                  </span>
                </div>
                <Progress value={parsingProgress} className="w-full h-1.5" />
              </div>
            )}

            {/* Scoring Result */}
            {scoreResult && (
              <div className="mt-4">
                <ResumeScore
                  score={scoreResult}
                  loading={isAiParsing}
                  className="border-primary/20"
                />
              </div>
            )}

            {/* Info about automated email monitoring */}
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Email Monitoring Active
                  </h4>
                  <p className="text-sm text-blue-700">
                    Email monitoring is now automated. New candidate emails are processed automatically. 
                    Use this manual upload for additional candidates or when you have resume files directly.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <span className="font-medium">Need to add email accounts?</span> Visit the 
                    <span className="font-medium"> Email Monitoring </span> section to connect your email accounts.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column - Parsed Data */}
        <Card
          className={`w-full md:w-full transition-opacity duration-300 ${
            parsedData && parsedData.name
              ? "opacity-100"
              : "opacity-50 pointer-events-none"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="size-5 text-primary" />
                Candidate Information
              </CardTitle>
              <CardDescription>
                Review and edit the extracted information
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {parsedData && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 font-normal"
                >
                  <Zap className="mr-1.5 size-3.5" />
                  AI Parsed
                </Badge>
              )}

              {parsedData?.resumeScore && (
                <Badge
                  variant="outline"
                  className={`font-medium ${
                    parsedData.resumeScore >= 80
                      ? "bg-green-50 text-green-700 border-green-200"
                      : parsedData.resumeScore >= 60
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : parsedData.resumeScore >= 40
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <BadgeCheck className="mr-1.5 size-3.5" />
                  {Math.round(parsedData.resumeScore)}% Match
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-5 max-h-[650px] overflow-y-auto pr-1">
            {parsedData && parsedData.name ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name*
                    </Label>
                    <Input
                      id="name"
                      value={parsedData.name || ""}
                      onChange={(e) => handleUpdate("name", e.target.value)}
                      placeholder="Candidate name"
                      required
                      className="border-input/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={parsedData.email || ""}
                      onChange={(e) => handleUpdate("email", e.target.value)}
                      placeholder="candidate@example.com"
                      className="border-input/80"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={parsedData.phone || ""}
                      onChange={(e) => handleUpdate("phone", e.target.value)}
                      placeholder="(123) 456-7890"
                      className="border-input/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-sm font-medium">
                      Years of Experience
                    </Label>
                    <Input
                      id="experience"
                      value={parsedData.experience || ""}
                      onChange={(e) =>
                        handleUpdate("experience", e.target.value)
                      }
                      placeholder="e.g. 5 years"
                      className="border-input/80"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education" className="text-sm font-medium">
                    Education
                  </Label>
                  <Textarea
                    id="education"
                    value={parsedData.education || ""}
                    onChange={(e) => handleUpdate("education", e.target.value)}
                    placeholder="Education details"
                    className="min-h-[80px] border-input/80 resize-y"
                  />
                </div>

                {parsedData.jobTitle && (
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">
                      Job Title
                    </Label>
                    <Input
                      id="jobTitle"
                      value={parsedData.jobTitle || ""}
                      onChange={(e) => handleUpdate("jobTitle", e.target.value)}
                      placeholder="Current job title"
                      className="border-input/80"
                    />
                  </div>
                )}

                {parsedData.location && (
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm font-medium">
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={parsedData.location || ""}
                      onChange={(e) => handleUpdate("location", e.target.value)}
                      placeholder="Candidate location"
                      className="border-input/80"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="skills" className="text-sm font-medium">
                    Skills (comma-separated)
                  </Label>
                  <Textarea
                    id="skills"
                    value={
                      Array.isArray(parsedData.skills)
                        ? parsedData.skills.join(", ")
                        : ""
                    }
                    onChange={(e) => handleUpdate("skills", e.target.value)}
                    placeholder="e.g. JavaScript, React, Node.js"
                    className="min-h-[80px] border-input/80 resize-y"
                  />
                </div>

                {parsedData.languages &&
                  Array.isArray(parsedData.languages) &&
                  parsedData.languages.length > 0 && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="languages"
                        className="text-sm font-medium"
                      >
                        Languages
                      </Label>
                      <Input
                        id="languages"
                        value={parsedData.languages.join(", ")}
                        onChange={(e) =>
                          handleUpdate("languages", e.target.value)
                        }
                        placeholder="Languages spoken"
                        className="border-input/80"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {parsedData.languages.map((language, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="px-2 py-0.5"
                          >
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {parsedData.linkedIn && (
                  <div className="space-y-2">
                    <Label htmlFor="linkedIn" className="text-sm font-medium">
                      LinkedIn Profile
                    </Label>
                    <Input
                      id="linkedIn"
                      value={parsedData.linkedIn || ""}
                      onChange={(e) => handleUpdate("linkedIn", e.target.value)}
                      placeholder="LinkedIn URL"
                      className="border-input/80"
                    />
                  </div>
                )}

                {/* Resume Score Display */}
                {parsedData.resumeScore && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Resume Score</Label>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          parsedData.resumeScore >= 80
                            ? "bg-green-100 text-green-700"
                            : parsedData.resumeScore >= 60
                            ? "bg-blue-100 text-blue-700"
                            : parsedData.resumeScore >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {Math.round(parsedData.resumeScore)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {Math.round(parsedData.resumeScore)}% Match
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {parsedData.resumeScore >= 80
                              ? "Excellent match"
                              : parsedData.resumeScore >= 60
                              ? "Good match"
                              : parsedData.resumeScore >= 40
                              ? "Fair match"
                              : "Needs improvement"}
                          </p>
                        </div>
                      </div>
                      {selectedJob && (
                        <div className="ml-auto text-right">
                          <p className="text-xs text-muted-foreground">Scored against</p>
                          <p className="text-sm font-medium">{selectedJob.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="bg-muted/20 p-4 rounded-full mb-4">
                  <FileUp className="size-8 opacity-40" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                <p className="max-w-sm">
                  Upload and parse a resume to extract candidate information
                </p>
                <div className="mt-6 text-sm p-4 bg-blue-50 text-blue-700 rounded-md max-w-sm">
                  <p className="font-medium mb-2 flex items-center gap-1.5">
                    <Zap className="size-4" />
                    AI-Powered Resume Parser
                  </p>
                  <p>
                    This tool uses AI to automatically extract candidate details
                    including contact information, skills, experience, and more.
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset} className="px-4">
              Reset
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                !parsedData ||
                !parsedData.name ||
                saveStatus === "saving" ||
                isAiParsing
              }
              className="relative px-4"
            >
              {saveStatus === "saving" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </div>
              ) : saveStatus === "done" ? (
                <div className="flex items-center gap-2">
                  <Check className="size-4" />
                  Saved!
                </div>
              ) : (
                "Save to Database"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
