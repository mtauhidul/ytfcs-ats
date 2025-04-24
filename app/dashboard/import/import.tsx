// app/dashboard/import/import.tsx

"use client";

import { addDoc, collection } from "firebase/firestore";
import {
  AlertTriangle,
  Check,
  FileUp,
  Loader2,
  RefreshCw,
  Upload,
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

// Define interface for Affinda API response
interface AffindaResponse {
  data: {
    name?: { raw: string };
    emails?: string[];
    phoneNumbers?: string[];
    workExperience?: Array<{
      startDate?: string;
      endDate?: string;
      isCurrent?: boolean;
      title?: string;
      organization?: string;
    }>;
    education?: Array<{
      accreditation?: { inputStr: string };
      degree?: string;
      organization?: string;
      dates?: { endDate?: string };
    }>;
    skills?: Array<{ name: string }>;
    rawText?: string;
    linkedin?: string;
    websites?: string[];
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    languages?: Array<{ name: string }>;
    profession?: string;
    jobTitle?: string;
  };
  meta: {
    identifier: string;
    status: string;
  };
}

// Define a more comprehensive parsed candidate interface
interface AffindaCandidate {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  resumeText?: string;
  affindaData?: any; // Full Affinda response
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
}

// Define the parsed data interface for better type safety
interface ParsedCandidate {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  resumeText?: string;
  affindaData?: any; // Add this property to match the usage
  linkedIn?: string; // Add linkedIn property to match usage
  location?: string; // Add location property to match usage
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
  const [activeTab, setActiveTab] = useState<"file" | "email">("file");

  // Status
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  // Get state from Redux
  const { parsedData, status, error } = useSelector(
    (state: RootState) => state.candidateImport
  );

  // 1. Handle file selection (local state only)
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

  // 2. Parse resume using Affinda API
  const handleParse = async () => {
    if (!file) return;

    try {
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
        return;
      }

      // Add file size validation (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setErrorDetails("File too large. Maximum size is 10MB.");
        setParsingProgress(0);
        return;
      }

      setParsingProgress(20);

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("wait", "true"); // Wait for processing to complete
      formData.append("identifier", file.name); // Use filename as identifier

      // Specify resume as the document type
      formData.append("collection", "resumes");

      // Get the Affinda API key from environment variables
      const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_API_KEY;

      if (!AFFINDA_API_KEY) {
        throw new Error(
          "Affinda API key is missing. Please check your environment variables."
        );
      }

      setParsingProgress(30);

      // Send the file to Affinda API
      const response = await fetch("https://api.affinda.com/v2/resumes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AFFINDA_API_KEY}`,
          // No Content-Type header as FormData sets it automatically with the boundary
        },
        body: formData,
      });

      // Store the original file for potential upload
      let fileBuffer;
      try {
        fileBuffer = await file.arrayBuffer();
      } catch (error) {
        console.error("Error reading file:", error);
      }

      // Track the original filename
      const originalFilename = file.name;

      setParsingProgress(60);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Affinda API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setParsingProgress(80);

      // Map Affinda response to our format
      const parsedData: ParsedCandidate = {
        name: data.data.name?.raw || "",
        email: data.data.emails?.[0] || "",
        phone: data.data.phoneNumbers?.[0] || "",
        experience: extractExperienceYears(data.data.workExperience || []),
        education: formatEducation(data.data.education || []),
        skills:
          data.data.skills?.map((skill: { name: string }) => skill.name) || [],
        resumeText: data.data.rawText || "",
        // Store additional Affinda data for future use
        affindaData: data.data,
        linkedIn:
          data.data.linkedin ||
          data.data.websites?.find((site: string) =>
            site.includes("linkedin.com")
          ) ||
          "",
        location: formatLocation(data.data.location),
        languages:
          data.data.languages?.map((lang: { name: string }) => lang.name) || [],
        jobTitle: data.data.profession || data.data.jobTitle || "",
        originalFilename: file.name,
        fileType: file.type,
        fileSize: file.size,
      };

      // Dispatch to Redux store
      dispatch(updateParsedData(parsedData));

      setParsingProgress(100);
      toast.success("Resume parsed successfully using Affinda");
    } catch (error) {
      console.error("Error during resume parsing:", error);
      setParsingProgress(0);
      setErrorDetails(
        "Failed to parse resume: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      toast.error("Failed to parse resume");
    }
  };

  // Helper functions for parsing Affinda data
  const extractExperienceYears = (workExperience: any[]): string => {
    if (!workExperience || workExperience.length === 0) return "";

    // Calculate total years of experience from work history
    let totalMonths = 0;

    workExperience.forEach((job) => {
      if (job.startDate && (job.endDate || job.isCurrent)) {
        const startDate = new Date(job.startDate);
        const endDate = job.isCurrent ? new Date() : new Date(job.endDate);

        // Calculate months between dates
        const months =
          (endDate.getFullYear() - startDate.getFullYear()) * 12 +
          (endDate.getMonth() - startDate.getMonth());

        if (months > 0) {
          totalMonths += months;
        }
      }
    });

    // Convert months to years (rounded to 1 decimal place)
    const years = (totalMonths / 12).toFixed(1);
    return `${years} years`;
  };

  const formatEducation = (education: any[]): string => {
    if (!education || education.length === 0) return "";

    return education
      .map((edu) => {
        const degree = edu.accreditation?.inputStr || edu.degree || "";
        const institution = edu.organization || "";
        const year = edu.dates?.endDate
          ? new Date(edu.dates.endDate).getFullYear()
          : "";

        const parts = [degree, institution, year].filter(Boolean);
        return parts.join(", ");
      })
      .join("\n");
  };

  const formatLocation = (location: any): string => {
    if (!location) return "";

    const parts = [location.city, location.state, location.country].filter(
      Boolean
    );

    return parts.join(", ");
  };

  // Monitor parsing status - Use this if you're still using the Redux state for tracking
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

  // 3. Update fields if user edits them
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

  // 4. Save to Firestore
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

        // Additional fields from Affinda
        resumeText: parsedData.resumeText || "",
        affindaData: parsedData.affindaData || null,
        linkedIn: parsedData.linkedIn || "",
        location: parsedData.location || "",
        languages: parsedData.languages || [],
        jobTitle: parsedData.jobTitle || "",

        // Source tracking
        source: "resume_upload",
        importMethod: "affinda_parser",
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, "candidates"), candidateData);

      // If we have the resume file, we could also upload it to storage
      // and link it to the candidate document
      // This would be implemented here

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

  // Handle email connection has been moved to the email-import component
  // But we'll keep a simplified version for backward compatibility
  const handleConnectEmail = () => {
    // This is just a fallback in case the button is still used somewhere
    toast.info(
      "Please use the email import tab to connect to your email account"
    );
    setActiveTab("email");
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
      <Toaster position="top-right" />

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
              onValueChange={(value) => setActiveTab(value as "file" | "email")}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="email">Import from Email</TabsTrigger>
              </TabsList>

              <TabsContent value="file">
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

              <TabsContent value="email">
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
            {status === "loading" && (
              <div className="mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Parsing resume...
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
            <Button
              onClick={handleParse}
              disabled={!file || status === "loading" || activeTab !== "file"}
              className="w-full"
            >
              {status === "loading" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Parsing Resume...
                </div>
              ) : (
                "Parse Resume"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Right column - Parsed Data */}
        <Card
          className={`w-full md:w-2/3 transition-opacity duration-300 ${
            parsedData && status === "succeeded"
              ? "opacity-100"
              : "opacity-50 pointer-events-none"
          }`}
        >
          <CardHeader>
            <CardTitle>Candidate Information</CardTitle>
            <CardDescription>
              Review and edit the parsed information before saving
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {parsedData && status === "succeeded" ? (
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
                  Upload and parse a resume using Affinda to extract candidate
                  information
                </p>
                <div className="mt-4 text-sm p-3 bg-muted/30 rounded-md max-w-sm">
                  <p className="font-medium text-foreground mb-1">
                    Using Affinda Resume Parser
                  </p>
                  <p>
                    This tool uses Affinda's AI-powered resume parser to
                    automatically extract candidate details like contact
                    information, skills, experience, and more.
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
                status !== "succeeded" ||
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
