import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useSidebar } from '../../components/ui/sidebar';
import { 
  Plus, 
  Settings, 
  MoreHorizontal,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GripVertical,
  AlertCircle,
  Save,
  X,
  Edit,
  Trash2
} from 'lucide-react';

// Firebase imports
import { 
  collection, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Redux actions
import { fetchJobs } from '../../features/jobsSlice';
import type { Candidate } from '../../types/candidate';

// Drag and drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

// Types
interface WorkflowStage {
  id: string;
  name: string;
  order: number;
  color: string;
  jobId: string;
}

interface JobWorkflow {
  id: string;
  jobId: string;
  stages: WorkflowStage[];
  createdAt: string;
  updatedAt: string;
}

// Sortable Candidate Component
function SortableCandidate({ candidate }: { candidate: Candidate }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing border border-border bg-card hover:shadow-sm hover:border-ring/40 transition-all duration-200 group ${
        isDragging ? 'shadow-xl ring-2 ring-primary/20 scale-105 rotate-2 bg-card/90' : ''
      }`}
    >
      <CardContent className="px-2 py-1">
        {/* Single line with name and grip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-1.5 w-1.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-card-foreground text-xs truncate block">{candidate.name}</span>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="truncate flex-1">{candidate.email}</span>
                <span className="text-[10px] whitespace-nowrap">
                  {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <GripVertical className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// Candidate Card for Drag Overlay
function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <Card className="cursor-grabbing border border-primary bg-card shadow-xl ring-2 ring-primary/30 scale-105 rotate-2 opacity-95">
      <CardContent className="px-2 py-1">
        {/* Single line with name and grip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-1.5 w-1.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-card-foreground text-xs truncate block">{candidate.name}</span>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span className="truncate flex-1">{candidate.email}</span>
                <span className="text-[10px] whitespace-nowrap">
                  {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// Droppable Area Component
function DroppableArea({ 
  id, 
  children 
}: { 
  id: string; 
  children: React.ReactNode; 
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[150px] p-1 rounded-md transition-colors ${
        isOver ? 'bg-accent/50 border-2 border-dashed border-primary' : ''
      }`}
    >
      {children}
    </div>
  );
}

export default function KanbanWorkflowManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { jobs, loading: jobsLoading } = useSelector((state: RootState) => state.jobs);
  const { state: sidebarState } = useSidebar();

  // Session storage key for persisting job selection
  const WORKFLOW_JOB_SESSION_KEY = "workflow_selected_job_id";

  // Helper functions for session storage
  const saveJobSelectionToSession = (jobId: string) => {
    try {
      if (typeof window !== 'undefined' && jobId) {
        sessionStorage.setItem(WORKFLOW_JOB_SESSION_KEY, jobId);
        console.log("📱 Saved job selection to session:", jobId);
      }
    } catch (error) {
      console.warn("Failed to save job selection to session storage:", error);
    }
  };

  const getJobSelectionFromSession = (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const savedJobId = sessionStorage.getItem(WORKFLOW_JOB_SESSION_KEY);
        console.log("📱 Retrieved job selection from session:", savedJobId);
        return savedJobId;
      }
    } catch (error) {
      console.warn("Failed to retrieve job selection from session storage:", error);
    }
    return null;
  };

  const clearJobSelectionFromSession = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(WORKFLOW_JOB_SESSION_KEY);
        console.log("📱 Cleared job selection from session");
      }
    } catch (error) {
      console.warn("Failed to clear job selection from session storage:", error);
    }
  };

  // Local state
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [workflow, setWorkflow] = useState<JobWorkflow | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragInProgress, setIsDragInProgress] = useState(false);
  
  // Dialog states
  const [isCreateWorkflowDialogOpen, setIsCreateWorkflowDialogOpen] = useState(false);
  const [isEditStageDialogOpen, setIsEditStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [newStages, setNewStages] = useState<Omit<WorkflowStage, 'id' | 'jobId'>[]>([
    { name: 'Applied', order: 1, color: '#3b82f6' },
    { name: 'Screening', order: 2, color: '#f59e0b' },
    { name: 'Interview', order: 3, color: '#8b5cf6' },
    { name: 'Final Review', order: 4, color: '#ef4444' },
    { name: 'Hired', order: 5, color: '#10b981' }
  ]);

  // Enhanced job selection handler with session storage
  const handleJobSelection = (jobId: string) => {
    setSelectedJobId(jobId);
    saveJobSelectionToSession(jobId);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Start dragging after moving 3px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize job selection from session storage on component mount
  useEffect(() => {
    const savedJobId = getJobSelectionFromSession();
    if (savedJobId && !selectedJobId) {
      console.log("📱 Pre-loading job selection from session:", savedJobId);
      setSelectedJobId(savedJobId);
    }
  }, []); // Empty dependency array - runs only on mount

  // Load jobs on mount and handle session restoration
  useEffect(() => {
    dispatch(fetchJobs());
  }, [dispatch]);

  // Handle job restoration when jobs are loaded
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      const savedJobId = getJobSelectionFromSession();
      if (savedJobId) {
        const jobExists = jobs.some(job => job.id === savedJobId);
        if (jobExists) {
          console.log("📱 Restoring job selection from session:", savedJobId);
          setSelectedJobId(savedJobId);
        } else {
          console.log("📱 Saved job no longer exists, clearing session");
          clearJobSelectionFromSession();
        }
      }
      // Don't auto-select first job - let user choose for new sessions
    }
  }, [jobs, selectedJobId]);

  // Load workflow and candidates when job is selected
  useEffect(() => {
    if (!selectedJobId) {
      setWorkflow(null);
      setCandidates([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Listen to workflow changes
    const workflowQuery = query(
      collection(db, 'jobWorkflows'),
      where('jobId', '==', selectedJobId)
    );

    const unsubscribeWorkflow = onSnapshot(workflowQuery, (snapshot) => {
      if (snapshot.empty) {
        setWorkflow(null);
      } else {
        const workflowDoc = snapshot.docs[0];
        setWorkflow({
          id: workflowDoc.id,
          ...workflowDoc.data()
        } as JobWorkflow);
      }
      setLoading(false);
    }, (error) => {
      setError('Failed to load workflow: ' + error.message);
      setLoading(false);
    });

    // Listen to candidates changes
    setCandidatesLoading(true);
    const candidatesQuery = query(
      collection(db, 'candidates'),
      where('jobId', '==', selectedJobId)
    );

    const unsubscribeCandidates = onSnapshot(candidatesQuery, (snapshot) => {
      // Skip real-time updates during drag operations to prevent flickering
      if (isDragInProgress) return;
      
      const candidatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[];
      setCandidates(candidatesData);
      setCandidatesLoading(false);
    }, (error) => {
      console.error('Error loading candidates:', error);
      setCandidates([]);
      setCandidatesLoading(false);
    });

    return () => {
      unsubscribeWorkflow();
      unsubscribeCandidates();
    };
  }, [selectedJobId]);

  // Create workflow for selected job
  const handleCreateWorkflow = async () => {
    if (!selectedJobId) return;

    try {
      const stagesData = newStages.map((stage, index) => ({
        ...stage,
        id: `stage_${Date.now()}_${index}`,
        jobId: selectedJobId,
        order: index + 1
      }));

      await addDoc(collection(db, 'jobWorkflows'), {
        jobId: selectedJobId,
        stages: stagesData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      setIsCreateWorkflowDialogOpen(false);
    } catch (error) {
      setError('Failed to create workflow: ' + (error as Error).message);
    }
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragInProgress(true);
  };

  // Handle drag over for better visual feedback
  const handleDragOver = (event: any) => {
    // This can be used for custom drop zone highlighting if needed
    // Currently handled by DroppableArea component
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over || !workflow || active.id === over.id) {
      setIsDragInProgress(false);
      return;
    }

    // Find the candidate and update their stage
    const candidateId = active.id as string;
    const newStageId = over.id as string;

    // Check if the over target is a valid stage
    const isValidStage = workflow.stages.some(stage => stage.id === newStageId);
    if (!isValidStage) {
      setIsDragInProgress(false);
      return;
    }

    // Find the current candidate to get the old stage
    const currentCandidate = candidates.find(c => c.id === candidateId);
    if (!currentCandidate) {
      setIsDragInProgress(false);
      return;
    }

    const oldStageId = currentCandidate.stageId;
    
    // If no change, return early
    if (oldStageId === newStageId) {
      setIsDragInProgress(false);
      return;
    }

    // Immediate optimistic update
    setCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, stageId: newStageId, updatedAt: new Date().toISOString() }
        : candidate
    ));

    try {
      // Update database
      await updateDoc(doc(db, 'candidates', candidateId), {
        stageId: newStageId,
        updatedAt: new Date().toISOString()
      });
      
      // Re-enable real-time updates after a short delay to allow DB sync
      setTimeout(() => {
        setIsDragInProgress(false);
      }, 500);
      
    } catch (error) {
      // Rollback on error
      setCandidates(prev => prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, stageId: oldStageId }
          : candidate
      ));
      setError('Failed to move candidate: ' + (error as Error).message);
      setIsDragInProgress(false);
    }
  };

  // Add new stage
  const handleAddStage = () => {
    const newStage = {
      name: 'New Stage',
      order: newStages.length + 1,
      color: '#6b7280'
    };
    setNewStages([...newStages, newStage]);
  };

  // Update stage
  const handleUpdateStage = (index: number, updates: Partial<Omit<WorkflowStage, 'id' | 'jobId'>>) => {
    const updatedStages = [...newStages];
    updatedStages[index] = { ...updatedStages[index], ...updates };
    setNewStages(updatedStages);
  };

  // Remove stage
  const handleRemoveStage = (index: number) => {
    const updatedStages = newStages.filter((_, i) => i !== index);
    setNewStages(updatedStages);
  };

  // Edit existing workflow stage
  const handleEditWorkflowStage = async () => {
    if (!editingStage || !workflow) return;

    try {
      const updatedStages = workflow.stages.map(stage =>
        stage.id === editingStage.id ? editingStage : stage
      );

      await updateDoc(doc(db, 'jobWorkflows', workflow.id), {
        stages: updatedStages,
        updatedAt: new Date().toISOString()
      });

      setIsEditStageDialogOpen(false);
      setEditingStage(null);
    } catch (error) {
      setError('Failed to update stage: ' + (error as Error).message);
    }
  };

  // Get candidates for a specific stage
  const getCandidatesForStage = (stageId: string) => {
    return candidates.filter(candidate => candidate.stageId === stageId && candidate.jobId === selectedJobId);
  };

  const selectedJob = jobs.find(job => job.id === selectedJobId);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Compact Header */}
      <div className="bg-card border-b border-border px-2 py-2 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-shrink-0">
            <div className="w-6 h-6 bg-gradient-to-br from-primary to-zinc-800 rounded-md flex items-center justify-center">
              <div className="w-2 h-2 bg-primary-foreground rounded-sm"></div>
            </div>
            <h1 className="text-sm font-medium text-foreground">Workflow Board</h1>
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <Select value={selectedJobId} onValueChange={handleJobSelection}>
              <SelectTrigger className="w-40 sm:w-48 md:w-60 h-8 text-sm border-border focus:border-primary focus:ring-1 focus:ring-ring bg-background">
                <SelectValue placeholder={jobsLoading ? "Loading..." : "Select job"} />
              </SelectTrigger>
              <SelectContent>
                {jobsLoading ? (
                  <SelectItem value="__loading__" disabled>Loading jobs...</SelectItem>
                ) : jobs.length === 0 ? (
                  <SelectItem value="__no_jobs__" disabled>No jobs available</SelectItem>
                ) : (
                  jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedJobId && candidates.length > 0 && (
              <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                <User className="h-3 w-3 mr-1" />
                {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
              </div>
            )}
            {selectedJobId && !workflow && !loading && (
              <Button 
                onClick={() => setIsCreateWorkflowDialogOpen(true)}
                size="sm"
                className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm whitespace-nowrap"
              >
                <Plus className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-2 mt-2 flex-shrink-0">
          <Alert variant="destructive" className="border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-base font-medium text-foreground">Loading workflow...</div>
            <div className="text-xs text-muted-foreground">Please wait</div>
          </div>
        </div>
      )}

      {/* No Job Selected */}
      {!selectedJobId && !loading && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center px-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 bg-muted-foreground/20 rounded-md"></div>
            </div>
            <div className="text-base font-medium text-foreground">Select a job to view workflow</div>
            <div className="text-xs text-muted-foreground">Choose a job from the dropdown above</div>
          </div>
        </div>
      )}

      {/* No Workflow */}
      {selectedJobId && !workflow && !loading && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center px-4">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-accent-foreground" />
            </div>
            <div className="text-base font-medium text-foreground">No workflow found for {selectedJob?.title}</div>
            <div className="text-xs text-muted-foreground mb-1">Create a workflow to get started</div>
            {candidates.length > 0 && (
              <div className="text-xs text-orange-600 mb-3">
                {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} assigned to this job waiting for workflow
              </div>
            )}
            <Button 
              onClick={() => setIsCreateWorkflowDialogOpen(true)}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Workflow
            </Button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {workflow && !loading && (
        <div className="flex-1 overflow-hidden">
          {/* Responsive Container: calculates available space after sidebar */}
          <div 
            className="w-full h-full transition-all duration-200 ease-linear" 
            style={{
              width: sidebarState === 'expanded' 
                ? 'calc(100vw - 16rem - 2rem)' // 16rem sidebar + 2rem padding
                : 'calc(100vw - 3rem - 2rem)',  // 3rem icon sidebar + 2rem padding
              maxWidth: sidebarState === 'expanded'
                ? 'calc(100vw - 16rem - 2rem)'
                : 'calc(100vw - 3rem - 2rem)'
            }}
          >
            <DndContext 
              sensors={sensors} 
              collisionDetection={rectIntersection} 
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="h-full overflow-x-auto overflow-y-hidden">
                <div className="flex space-x-2 p-2 h-full min-w-max">
                {workflow.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <div key={stage.id} className="flex-shrink-0 w-64 h-full">
                      <div className="bg-card rounded-xl border border-border shadow-sm h-full flex flex-col">
                        {/* Stage Header */}
                        <div className="px-2 py-1.5 border-b border-border flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <div 
                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: stage.color }}
                              />
                              <h3 className="font-medium text-card-foreground truncate text-sm">{stage.name}</h3>
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-muted border-border text-muted-foreground flex-shrink-0"
                              >
                                {getCandidatesForStage(stage.id).length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 w-5 p-0 hover:bg-accent flex-shrink-0"
                                >
                                  <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setEditingStage(stage);
                                    setIsEditStageDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Stage
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Candidates Column */}
                        <SortableContext 
                          items={getCandidatesForStage(stage.id).map(c => c.id)} 
                          strategy={verticalListSortingStrategy}
                          id={stage.id}
                        >
                          <DroppableArea id={stage.id}>
                            <div className="p-0.5 space-y-0.5 flex-1 overflow-y-auto">
                              {candidatesLoading ? (
                                <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
                                  Loading candidates...
                                </div>
                              ) : getCandidatesForStage(stage.id).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-xs text-center">
                                  <User className="h-6 w-6 mb-2 opacity-50" />
                                  <div>No candidates in this stage</div>
                                  <div className="text-[10px] mt-1">Drag candidates here or assign them to this job</div>
                                </div>
                              ) : (
                                getCandidatesForStage(stage.id).map((candidate) => (
                                  <SortableCandidate key={candidate.id} candidate={candidate} />
                                ))
                              )}
                            </div>
                          </DroppableArea>
                        </SortableContext>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            <DragOverlay>
              {activeId ? (
                <CandidateCard 
                  candidate={candidates.find(c => c.id === activeId)!}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
          </div>
        </div>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={isCreateWorkflowDialogOpen} onOpenChange={setIsCreateWorkflowDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Workflow for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Define the stages candidates will go through for this job.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {newStages.map((stage, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Name:</Label>
                    <Input
                      value={stage.name}
                      onChange={(e) => handleUpdateStage(index, { name: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Color:</Label>
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => handleUpdateStage(index, { color: e.target.value })}
                      className="w-8 h-8 rounded"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStage(index)}
                  disabled={newStages.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateWorkflowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkflow}>
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={isEditStageDialogOpen} onOpenChange={setIsEditStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
          </DialogHeader>
          {editingStage && (
            <div className="space-y-4">
              <div>
                <Label>Stage Name</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={editingStage.color}
                    onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })}
                    className="w-8 h-8 rounded"
                  />
                  <span className="text-sm text-muted-foreground">{editingStage.color}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWorkflowStage}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
