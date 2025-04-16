"use client";

import { addDoc, collection } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Toaster, toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";

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
    }
  };

  // 2. Parse resume
  const handleParse = () => {
    if (file) {
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
      dispatch(resetImport());
      setFile(null);
    } catch (err) {
      console.error("Error saving candidate:", err);
      setSaveStatus("error");
      toast.error("Error saving candidate");
    }
  };

  return (
    <section className="bg-muted/50 min-h-[300px] rounded-xl p-4 space-y-6">
      <Toaster />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Candidate Import</h1>
        <p className="text-sm text-muted-foreground">
          Upload & parse resumes, then store candidate data in Firestore.
        </p>
      </div>

      <Separator />

      {/* File Upload */}
      <div className="flex flex-col gap-2 max-w-sm">
        <Label htmlFor="resumeFile">Select Resume (PDF, DOC, DOCX)</Label>
        <Input
          id="resumeFile"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
        />
        {file && (
          <p className="text-sm text-muted-foreground">
            Selected file: <strong>{file.name}</strong>
          </p>
        )}
        <Button
          onClick={handleParse}
          disabled={!file || status === "loading"}
          className="w-fit"
        >
          {status === "loading" ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Parsing...
            </div>
          ) : (
            "Parse Resume"
          )}
        </Button>
        {error && (
          <p className="text-red-500 text-sm mt-1">
            Error parsing resume: {error}
          </p>
        )}
      </div>

      {/* Parsed Data */}
      {parsedData && status === "succeeded" && (
        <div className="space-y-4 max-w-md p-4 border border-border rounded-md bg-background">
          <h2 className="text-lg font-medium">Parsed Candidate Data</h2>

          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              value={parsedData.name || ""}
              onChange={(e) => handleUpdate("name", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Experience</Label>
            <Input
              value={parsedData.experience || ""}
              onChange={(e) => handleUpdate("experience", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Education</Label>
            <Input
              // Now it's a string, not an object
              value={parsedData.education || ""}
              onChange={(e) => handleUpdate("education", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Skills (comma-separated)</Label>
            <Input
              // Display them comma-separated
              value={parsedData.skills?.join(", ") || ""}
              onChange={(e) => handleUpdate("skills", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save to Firestore"
              )}
            </Button>
            {saveStatus === "done" && (
              <p className="text-green-500 text-sm">Candidate saved!</p>
            )}
            {saveStatus === "error" && (
              <p className="text-red-500 text-sm">Error saving candidate</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
