// app/dashboard/import/import.tsx

"use client";

import { addDoc, collection } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { resetImport, updateParsedData } from "~/features/candidateImportSlice";
import { db, storage } from "~/lib/firebase";
import type { AppDispatch, RootState } from "~/store";
import type { ImportedCandidate } from "~/types/email";
import EmailImport from "./email-import";

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
}

export default function ImportPage() {
  // Basic state
  const dispatch = useDispatch<AppDispatch>();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "email" | "ai">("file");

  // Status
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  // AI parsing state
  const [isAiParsing, setIsAiParsing] = useState(false);

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
    }
  };

  // Parse resume using AI
  const handleParseWithAI = async () => {
    if (!file) return;

    try {
      setIsAiParsing(true);
      setParsingProgress(10);
      setSaveStatus("idle");

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
          // If response can't be parsed as JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Process the successful response
      const data = await response.json();
      setParsingProgress(70);

      if (!data.success || !data.data) {
        throw new Error("Invalid response format from resume parsing API");
      }

      const parsedResume = data.data;
      setParsingProgress(80);

      // Map response to our format
      const parsedData: ParsedCandidate = {
        name: parsedResume.name || "",
        email: parsedResume.email || "",
        phone: parsedResume.phone || "",
        experience: parsedResume.experience || "",
        education: parsedResume.education || "",
        skills: parsedResume.skills || [],
        resumeText: parsedResume.resumeText || "",
        linkedIn: parsedResume.linkedIn || "",
        location: parsedResume.location || "",
        languages: parsedResume.languages || [],
        jobTitle: parsedResume.jobTitle || "",
        originalFilename: parsedResume.originalFilename || file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      // Dispatch to Redux store
      dispatch(updateParsedData(parsedData));

      if (
        parsedData &&
        parsedData.education &&
        Array.isArray(parsedData.education)
      ) {
        const educationText = parsedData.education
          .map((edu) => {
            if (typeof edu === "object") {
              // Extract relevant fields from education object
              const degree = edu.degree || "";
              const school = edu.institution || edu.school || "";
              const year = edu.year || edu.graduationYear || "";
              return `${degree}${degree && school ? " - " : ""}${school}${
                (degree || school) && year ? " (" + year + ")" : year
              }`;
            }
            return edu;
          })
          .join("\n");

        dispatch(updateParsedData({ education: educationText }));
      }

      setParsingProgress(100);
      toast.success("Resume parsed successfully using AI");
    } catch (error) {
      console.error("Error during resume parsing:", error);
      setParsingProgress(0);

      // More specific error messaging
      if (error instanceof Error && error.message.includes("response_format")) {
        setErrorDetails(
          "AI model configuration error. Please notify the administrator."
        );
        toast.error("AI service configuration error");
      } else {
        setErrorDetails(
          "Failed to parse resume: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
        toast.error("Failed to parse resume");
      }
    } finally {
      setIsAiParsing(false);
    }
  };

  // Monitor parsing status from Redux state
  useEffect(() => {
    if (status === "succeeded" && parsedData) {
      setParsingProgress(100);
      setErrorDetails(null);
      toast.success("Resume parsed successfully");

      // If email wasn't extracted, try to extract it from the resume text
      if (!parsedData.email && parsedData.resumeText) {
        // Simple regex to find emails in text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = parsedData.resumeText.match(emailRegex);

        if (matches && matches.length > 0) {
          dispatch(updateParsedData({ email: matches[0] }));
        }
      }

      // Try to extract phone if not already found
      if (!parsedData.phone && parsedData.resumeText) {
        // Simple regex for phone numbers
        const phoneRegex =
          /(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g;
        const matches = parsedData.resumeText.match(phoneRegex);

        if (matches && matches.length > 0) {
          dispatch(updateParsedData({ phone: matches[0] }));
        }
      }
    } else if (status === "failed") {
      setParsingProgress(0);
      setErrorDetails(
        error || "Failed to parse resume. Please try another file."
      );
      toast.error("Failed to parse resume");
    }
  }, [status, error, parsedData, dispatch]);

  // Update fields if user edits them
  const handleUpdate = (field: string, value: string) => {
    if (field === "skills") {
      const skillsArray = value
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      dispatch(updateParsedData({ skills: skillsArray }));
    } else if (field === "languages") {
      const languagesArray = value
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean);
      dispatch(updateParsedData({ languages: languagesArray }));
    } else {
      dispatch(updateParsedData({ [field]: value }));
    }
  };

  // Save to Firestore
  const handleSave = async () => {
    if (!parsedData) return;
    try {
      setSaveStatus("saving");

      // Upload file to Firebase Storage if available
      let resumeFileURL = null;
      if (file) {
        resumeFileURL = await uploadFileToStorage(file);
      }

      // Create candidate object with all required fields
      const candidateData = {
        ...parsedData,
        // Core fields
        name: parsedData.name || "",
        email: parsedData.email || "",
        phone: parsedData.phone || "",
        experience: parsedData.experience || "",
        education: parsedData.education || "",
        skills: parsedData.skills || [],

        // Default status fields
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stageId: "", // Default stage

        // tags are initially empty
        tags: [],

        // Additional fields
        resumeText: parsedData.resumeText || "",
        linkedIn: parsedData.linkedIn || "",
        location: parsedData.location || "",
        languages: parsedData.languages || [],
        jobTitle: parsedData.jobTitle || "",

        // Source tracking
        source: "resume_upload",
        importMethod: "ai_parser",

        // Resume file URL - new field
        resumeFileURL: resumeFileURL || (parsedData as any).resumeFileURL,
        originalFilename: file ? file.name : parsedData.originalFilename,
        fileType: file ? file.type : parsedData.fileType,
        fileSize: file ? file.size : parsedData.fileSize,
      };

      // Add document to Firestore
      await addDoc(collection(db, "candidates"), candidateData);

      setSaveStatus("done");
      toast.success("Candidate saved successfully!");

      // Reset after a short delay for better user experience
      setTimeout(() => {
        dispatch(resetImport());
        setFile(null);
        setSaveStatus("idle");
      }, 1500);
    } catch (err) {
      console.error("Error saving candidate:", err);
      setSaveStatus("error");
      toast.error("Error saving candidate");
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = [
        ".pdf",
        ".doc",
        ".docx",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      // Check if file type is valid
      if (
        validTypes.some(
          (type) =>
            droppedFile.name.toLowerCase().endsWith(type) ||
            droppedFile.type === type
        )
      ) {
        // Check file size
        if (droppedFile.size > 10 * 1024 * 1024) {
          toast.error("File too large. Maximum size is 10MB.");
          setErrorDetails("File too large. Maximum size is 10MB.");
          return;
        }

        setFile(droppedFile);
        if (status !== "idle") {
          dispatch(resetImport());
        }
        setErrorDetails(null);
      } else {
        toast.error("Please upload a PDF, DOC, or DOCX file");
        setErrorDetails(
          "Invalid file type. Please upload a PDF, DOC, or DOCX file."
        );
      }
    }
  };

  // Reset everything
  const handleReset = () => {
    dispatch(resetImport());
    setFile(null);
    setSaveStatus("idle");
    setErrorDetails(null);
    setParsingProgress(0);
  };

  // Handle email import completion - FIXED VERSION
  const handleEmailImportComplete = async (
    data: ImportedCandidate | ImportedCandidate[] | any
  ) => {
    if (Array.isArray(data)) {
      // Handle multiple candidates import
      toast.success(
        `Successfully imported ${data.length} candidates from email`
      );

      // Instead of saving directly, show the first candidate for review
      if (data.length > 0) {
        const firstCandidate = data[0];
        // Parse the first candidate for display
        handleSingleEmailImport(firstCandidate);
      }
    } else {
      // Handle single candidate import
      handleSingleEmailImport(data);
    }
  };

  // Helper function to handle single email import
  const handleSingleEmailImport = (data: any) => {
    // If this is already parsed data from an email attachment
    if (data.source === "email_attachment") {
      const parsedCandidate: ParsedCandidate = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        skills: data.skills || [],
        experience: data.experience || "",
        education: data.education || "",
        resumeText: data.resumeText || "",
        linkedIn: data.linkedIn || "",
        location: data.location || "",
        languages: data.languages || [],
        jobTitle: data.jobTitle || "",
        originalFilename: data.resumeFileName || data.originalFilename,
        resumeFileURL: data.resumeFileURL,
        fileType: data.fileType,
        fileSize: data.fileSize,
      };

      // Dispatch to Redux to show in the UI
      dispatch(updateParsedData(parsedCandidate));
      setParsingProgress(100);

      // Switch to email tab to show parsed data
      setActiveTab("email");

      // Show success message
      toast.success("Resume parsed successfully from email attachment");
    } else {
      // Handle regular email import (without parsed resume data)
      const candidateData: ParsedCandidate = {
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        skills: data.skills || [],
        experience: data.experience || "",
        education: data.education || "",
        originalFilename: data.resumeFileName,
        resumeFileURL: data.resumeFileURL,
      };

      // Dispatch to Redux to show in the UI for review
      dispatch(updateParsedData(candidateData));
      setParsingProgress(100);

      // Switch to email tab
      setActiveTab("email");

      toast.success("Import prepared for review. Please check and save.");
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      // Create a unique filename based on original name and timestamp
      const timestamp = new Date().getTime();
      const fileExtension = file.name.split(".").pop();
      const uniqueFilename = `resumes/${timestamp}_${file.name}`;

      // Create a reference to the file location in Firebase Storage
      const storageRef = ref(storage, uniqueFilename);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log("File uploaded successfully:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file to Firebase Storage:", error);
      toast.error("Failed to upload resume file");
      return null;
    }
  };

  return (
    <div className="container py-6 px-4 md:py-8 mx-auto">
      <Toaster position="top-right" richColors />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileUp className="size-6" />
          Import Candidates
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload resumes or import candidates from email
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Left column - Upload */}
        <Card className="w-full md:w-2/5 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="size-5 text-primary" />
              Import Methods
            </CardTitle>
            <CardDescription>
              Choose how to import your candidates
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              defaultValue="file"
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "file" | "email" | "ai")
              }
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="file" className="text-sm ">
                  <UploadCloud className="size-3.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="flex items-center gap-1.5 text-sm"
                >
                  <Mail className="size-3.5" />
                  <span>Email</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="min-h-[300px] space-y-4">
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
                          File selected
                        </p>
                        <p className="text-sm mb-1">{file.name}</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
                          {file.type.split("/")[1].toUpperCase()}
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

                {file && (
                  <Button
                    onClick={handleParseWithAI}
                    disabled={status === "loading" || isAiParsing}
                    className="w-full"
                  >
                    {status === "loading" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Parsing Resume...
                      </div>
                    ) : (
                      <>
                        <Zap className="mr-2 size-4" />
                        Parse with AI
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="email" className="min-h-[300px]">
                <EmailImport onImportComplete={handleEmailImportComplete} />
              </TabsContent>
            </Tabs>

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
                    {activeTab === "ai"
                      ? "AI processing..."
                      : "Parsing resume..."}
                  </span>
                  <span className="text-xs font-medium">
                    {parsingProgress}%
                  </span>
                </div>
                <Progress value={parsingProgress} className="w-full h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column - Parsed Data */}
        <Card
          className={`w-full md:w-3/5 transition-opacity duration-300 ${
            parsedData && (status === "succeeded" || parsingProgress === 100)
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
            {parsedData && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 font-normal"
              >
                <Zap className="mr-1.5 size-3.5" />
                AI Parsed
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-5 max-h-[650px] overflow-y-auto pr-1">
            {parsedData &&
            (status === "succeeded" || parsingProgress === 100) ? (
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

                  {parsedData.skills &&
                    Array.isArray(parsedData.skills) &&
                    parsedData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {parsedData.skills.map((skill, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="px-2 py-0.5"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
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
                saveStatus === "saving" ||
                (status !== "succeeded" && parsingProgress !== 100) ||
                !parsedData.name // Require at least a name
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
