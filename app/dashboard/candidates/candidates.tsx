"use client";

import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { DataTable } from "~/components/ui/data-table";
import { db } from "~/lib/firebase";
import { type Candidate, columns } from "./columns";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "candidates"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          experience: data.experience || "",
          education: data.education || "",
          skills: data.skills || [],
        } as Candidate;
      });
      setCandidates(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <section className="p-4">
        <p className="text-muted-foreground text-sm">Loading candidates...</p>
      </section>
    );
  }

  return (
    <section className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Candidates</h1>
      <DataTable columns={columns} data={candidates} />
    </section>
  );
}
