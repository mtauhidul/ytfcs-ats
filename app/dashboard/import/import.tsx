// app/dashboard/import/import.tsx

"use client";

import { addDoc, collection } from "firebase/firestore";
import {
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  Mail,
  RefreshCw,
  Upload,
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

import { resetImport, updateParsedData } from "~/features/candidateImportSlice";
import { db } from "~/lib/firebase";
import type { AppDispatch, RootState } from "~/store";
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
      setFile(e.target.files[0]);
      // Reset any previous parsing state when a new file is selected
      if (status !== "idle") {
        dispatch(resetImport());
      }
      setErrorDetails(null);
    }
  };

  // Parse resume using OpenAI API (replacing Affinda)
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

      // In a real implementation, you would send the file to your backend
      // For now, we'll simulate the API call and response

      // Simulate API call with a delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setParsingProgress(60);

      // Simulate response with mock data based on filename
      const mockResponse = generateMockAIResponse(file.name);

      setParsingProgress(80);

      // Map OpenAI response to our format
      const parsedData: ParsedCandidate = {
        name: mockResponse.name || "",
        email: mockResponse.email || "",
        phone: mockResponse.phone || "",
        experience: mockResponse.experience || "",
        education: mockResponse.education || "",
        skills: mockResponse.skills || [],
        resumeText: mockResponse.resumeText || "",
        linkedIn: mockResponse.linkedin || "",
        location: mockResponse.location || "",
        languages: mockResponse.languages || [],
        jobTitle: mockResponse.jobTitle || "",
        originalFilename: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      // Dispatch to Redux store
      dispatch(updateParsedData(parsedData));

      setParsingProgress(100);
      toast.success("Resume parsed successfully using AI");
    } catch (error) {
      console.error("Error during resume parsing:", error);
      setParsingProgress(0);
      setErrorDetails(
        "Failed to parse resume: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      toast.error("Failed to parse resume");
    } finally {
      setIsAiParsing(false);
    }
  };

  // Generate mock AI response for demo purposes
  // In a real implementation, this would come from your backend
  interface MockAIResponse {
    name: string;
    email: string;
    phone: string;
    experience: string;
    education: string;
    skills: string[];
    resumeText: string;
    linkedin: string;
    location: string;
    languages: string[];
    jobTitle: string;
  }

  const generateMockAIResponse = (filename: string): MockAIResponse => {
    // Extract a mock name from the filename
    const namePart = filename.split(".")[0].replace(/[_-]/g, " ");
    const capitalizedName = namePart
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    return {
      name: capitalizedName,
      email: `${namePart.toLowerCase().replace(/\s/g, ".")}@example.com`,
      phone: "+1 (555) 123-4567",
      experience: "5.5 years",
      education:
        "Bachelor of Science, Computer Science\nStanford University, 2018",
      skills: [
        "JavaScript",
        "React",
        "Node.js",
        "TypeScript",
        "MongoDB",
        "AWS",
      ],
      resumeText:
        "Professional with experience in web development and software engineering...",
      linkedin: "https://linkedin.com/in/example",
      location: "San Francisco, California, USA",
      languages: ["English", "Spanish"],
      jobTitle: "Senior Frontend Developer",
    };
  };

  // Monitor parsing status from Redux state
  useEffect(() => {
    if (status === "succeeded" && parsedData) {
      setParsingProgress(100);
      setErrorDetails(null);
      toast.success("Resume parsed successfully");

      // If email wasn't extracted, try to extract it from the resume text
      if (!parsedData.email && parsedData.resumeText) {
        // Simple regex to find emails in text - not foolproof but catches common formats
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = parsedData.resumeText.match(emailRegex);

        if (matches && matches.length > 0) {
          dispatch(updateParsedData({ email: matches[0] }));
        }
      }

      // Similarly, try to extract phone if not already found
      if (!parsedData.phone && parsedData.resumeText) {
        // Simple regex for phone numbers - captures common formats
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
    } else {
      dispatch(updateParsedData({ [field]: value }));
    }
  };

  // Save to Firestore
  const handleSave = async () => {
    if (!parsedData) return;
    try {
      setSaveStatus("saving");

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

        // Use skills as initial tags (up to 3)
        tags: parsedData.skills ? [...parsedData.skills].slice(0, 3) : [],

        // Additional fields
        resumeText: parsedData.resumeText || "",
        linkedIn: parsedData.linkedIn || "",
        location: parsedData.location || "",
        languages: parsedData.languages || [],
        jobTitle: parsedData.jobTitle || "",

        // Source tracking
        source: "resume_upload",
        importMethod: "ai_parser",
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, "candidates"), candidateData);

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

  return (
    <div className="container py-8 mx-auto">
      <Toaster position="top-right" richColors />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left column - Upload */}
        <Card className="w-full md:w-1/3 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="size-5" />
              Resume Upload
            </CardTitle>
            <CardDescription>
              Upload a candidate's resume to parse and store their information
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              defaultValue="file"
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "file" | "email" | "ai")
              }
            >
              <TabsList className="mb-4 grid grid-cols-3">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-1">
                  <Zap className="size-3.5" />
                  <span>AI Parse</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  <span>Email</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="min-h-[300px]">
                <div
                  className={`border-2 border-dashed ${
                    dragActive ? "border-primary bg-primary/5" : "border-border"
                  } 
                    rounded-lg p-8 flex flex-col items-center justify-center gap-4 transition-colors`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="bg-muted/50 p-4 rounded-full">
                    <Upload className="size-8 text-muted-foreground" />
                  </div>

                  <div className="text-center">
                    <p className="font-medium mb-1">Drop resume file here</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      PDF, DOC, or DOCX (max 10MB)
                    </p>

                    <div className="relative">
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
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai" className="min-h-[300px]">
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
                    <h3 className="text-sm font-medium flex items-center gap-1.5 mb-1">
                      <Zap className="size-4" />
                      AI-Powered Resume Parsing
                    </h3>
                    <p className="text-xs">
                      Our AI system extracts candidate information from resumes
                      with high accuracy. Upload a resume file to get started.
                    </p>
                  </div>

                  <div
                    className={`border-2 border-dashed ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    } 
                      rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-colors`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="bg-muted/50 p-3 rounded-full">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>

                    <div className="text-center">
                      <p className="font-medium mb-1 text-sm">
                        Upload resume for AI parsing
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        PDF, DOC, or DOCX (max 10MB)
                      </p>

                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full text-sm h-8"
                        >
                          Select File
                        </Button>
                        <Input
                          id="aiResumeFile"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {file && (
                    <div className="mt-4 bg-muted/30 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {file.name.split(".").pop()?.toUpperCase()}
                        </Badge>
                        <p className="text-sm font-medium truncate flex-1">
                          {file.name}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => setFile(null)}
                        >
                          <RefreshCw className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleParseWithAI}
                    disabled={!file || isAiParsing}
                    className="w-full"
                  >
                    {isAiParsing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        AI Processing...
                      </div>
                    ) : (
                      <>
                        <Zap className="mr-2 size-4" />
                        Parse with AI
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="email" className="min-h-[300px]">
                <EmailImport
                  onImportComplete={(data) => {
                    // Handle the imported candidate data
                    toast.success("Successfully imported candidate from email");

                    // If data is a parsed resume, update the state
                    if (data && data.name) {
                      dispatch(updateParsedData(data));
                      setParsingProgress(100);
                    }
                  }}
                />
              </TabsContent>
            </Tabs>

            {file && activeTab === "file" && (
              <div className="mt-4 bg-muted/30 p-3 rounded-md">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </Badge>
                  <p className="text-sm font-medium truncate flex-1">
                    {file.name}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => setFile(null)}
                  >
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Error display */}
            {errorDetails && (
              <div className="mt-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{errorDetails}</p>
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {(status === "loading" || isAiParsing) && (
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {activeTab === "ai"
                      ? "AI processing..."
                      : "Parsing resume..."}
                  </span>
                  <span className="text-xs font-medium">
                    {parsingProgress}%
                  </span>
                </div>
                <Progress value={parsingProgress} className="w-full" />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col gap-2">
            {activeTab === "file" && (
              <Button
                onClick={handleParseWithAI}
                disabled={!file || status === "loading" || isAiParsing}
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
          </CardFooter>
        </Card>

        {/* Right column - Parsed Data */}
        <Card
          className={`w-full md:w-2/3 transition-opacity duration-300 ${
            parsedData && (status === "succeeded" || parsingProgress === 100)
              ? "opacity-100"
              : "opacity-50 pointer-events-none"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Candidate Information</CardTitle>
              <CardDescription>
                Review and edit the parsed information before saving
              </CardDescription>
            </div>
            {parsedData && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                AI Parsed
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6 max-h-[800px] overflow-y-auto">
            {parsedData &&
            (status === "succeeded" || parsingProgress === 100) ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={parsedData.phone || ""}
                      onChange={(e) => handleUpdate("phone", e.target.value)}
                      placeholder="(123) 456-7890"
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
                    className="min-h-[80px]"
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
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="skills" className="text-sm font-medium">
                    Skills (comma-separated)
                  </Label>
                  <Textarea
                    id="skills"
                    value={parsedData.skills?.join(", ") || ""}
                    onChange={(e) => handleUpdate("skills", e.target.value)}
                    placeholder="e.g. JavaScript, React, Node.js"
                    className="min-h-[80px]"
                  />

                  {parsedData.skills && parsedData.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parsedData.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {parsedData.languages && parsedData.languages.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="languages" className="text-sm font-medium">
                      Languages
                    </Label>
                    <Input
                      id="languages"
                      value={parsedData.languages?.join(", ") || ""}
                      onChange={(e) =>
                        handleUpdate("languages", e.target.value)
                      }
                      placeholder="Languages spoken"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parsedData.languages.map((language, index) => (
                        <Badge key={index} variant="outline">
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
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileUp className="size-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                <p className="max-w-sm">
                  Upload and parse a resume to extract candidate information
                </p>
                <div className="mt-4 text-sm p-3 bg-muted/30 rounded-md max-w-sm">
                  <p className="font-medium text-foreground mb-1">
                    Using AI-Powered Resume Parser
                  </p>
                  <p>
                    This tool uses an AI-powered resume parser to automatically
                    extract candidate details like contact information, skills,
                    experience, and more.
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
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
              className="relative"
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
