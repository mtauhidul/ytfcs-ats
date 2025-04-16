"use client";

import { addDoc, collection } from "firebase/firestore";
import { Check, FileUp, Loader2, RefreshCw } from "lucide-react";
import React, { useState } from "react";
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

import {
  parseResume,
  resetImport,
  updateParsedData,
} from "~/features/candidateImportSlice";
import { db } from "~/lib/firebase";
import type { AppDispatch, RootState } from "~/store";

export default function ImportPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const { parsedData, status, error } = useSelector(
    (state: RootState) => state.candidateImport
  );

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  // 1. Handle file selection (local state only)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Reset any previous parsing state when a new file is selected
      if (status !== "idle") {
        dispatch(resetImport());
      }
    }
  };

  // 2. Parse resume
  const handleParse = () => {
    if (file) {
      setSaveStatus("idle"); // Reset save status
      dispatch(parseResume(file));
    }
  };

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
      await addDoc(collection(db, "candidates"), {
        ...parsedData,
        createdAt: new Date(),
      });
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
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
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
      } else {
        toast.error("Please upload a PDF, DOC, or DOCX file");
      }
    }
  };

  // Reset everything
  const handleReset = () => {
    dispatch(resetImport());
    setFile(null);
    setSaveStatus("idle");
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
                <FileUp className="size-8 text-muted-foreground" />
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

            {file && (
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
          </CardContent>

          <CardFooter className="flex-col gap-2">
            <Button
              onClick={handleParse}
              disabled={!file || status === "loading"}
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

            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 border border-red-100 rounded-md w-full">
                {error}
              </div>
            )}

            {status === "loading" && (
              <Progress value={50} className="w-full mt-2" />
            )}
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
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={parsedData.name || ""}
                      onChange={(e) => handleUpdate("name", e.target.value)}
                      placeholder="Candidate name"
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
                  <Input
                    id="education"
                    value={parsedData.education || ""}
                    onChange={(e) => handleUpdate("education", e.target.value)}
                    placeholder="Education details"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills" className="text-sm font-medium">
                    Skills (comma-separated)
                  </Label>
                  <Input
                    id="skills"
                    value={parsedData.skills?.join(", ") || ""}
                    onChange={(e) => handleUpdate("skills", e.target.value)}
                    placeholder="e.g. JavaScript, React, Node.js"
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
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileUp className="size-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Data Available</h3>
                <p className="max-w-sm">
                  Upload and parse a resume to see the extracted candidate
                  information here
                </p>
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
                !parsedData || saveStatus === "saving" || status !== "succeeded"
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
