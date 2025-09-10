// app/components/jobs/job-creation-stepper.tsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '~/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronDown,
  Building2,
  User,
  Briefcase,
  FileText,
  Tags,
  Settings,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { Client } from '~/types/client';

// Step indicators component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center space-x-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            step < currentStep 
              ? 'bg-green-600 text-white' 
              : step === currentStep 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < totalSteps && (
            <div className={`w-8 h-0.5 transition-colors ${
              step < currentStep ? 'bg-green-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Step titles
const stepTitles = [
  'Client Selection',
  'Job Details', 
  'Requirements',
  'Organization',
  'Review & Create'
];

const stepIcons = [
  Building2,
  Briefcase,
  FileText,
  Settings,
  Check
];

export interface JobCreationData {
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salaryRange: string;
  department: string;
  employmentType: string;
  statusId: string;
  tags: string[];
  category: string;
  clientId: string;
}

interface JobCreationStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: JobCreationData) => Promise<void>;
  clients: Client[];
  categories: string[];
  statuses: Array<{ id: string; title: string; color?: string }>;
  tags: string[];
  isSubmitting?: boolean;
}

export function JobCreationStepper({
  open,
  onOpenChange,
  onSubmit,
  clients,
  categories,
  statuses,
  tags,
  isSubmitting = false
}: JobCreationStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<JobCreationData>({
    title: '',
    description: '',
    requirements: [],
    location: '',
    salaryRange: '',
    department: '',
    employmentType: '',
    statusId: '',
    tags: [],
    category: '',
    clientId: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setFormData({
        title: '',
        description: '',
        requirements: [],
        location: '',
        salaryRange: '',
        department: '',
        employmentType: '',
        statusId: '',
        tags: [],
        category: '',
        clientId: ''
      });
      setErrors({});
    }
  }, [open]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Client Selection
        if (!formData.clientId) {
          newErrors.clientId = 'Please select a client';
        }
        break;
      case 2: // Job Details
        if (!formData.title.trim()) {
          newErrors.title = 'Job title is required';
        }
        if (!formData.description.trim()) {
          newErrors.description = 'Job description is required';
        }
        if (!formData.location.trim()) {
          newErrors.location = 'Location is required';
        }
        break;
      case 3: // Requirements
        if (formData.requirements.length === 0 || !formData.requirements[0]?.trim()) {
          newErrors.requirements = 'Job requirements are required';
        }
        break;
      case 4: // Organization
        if (!formData.category) {
          newErrors.category = 'Please select a category';
        }
        if (!formData.statusId) {
          newErrors.statusId = 'Please select a status';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({}); // Clear errors when going back
  };

  const handleSubmit = async () => {
    if (validateStep(4)) { // Validate all required fields
      try {
        await onSubmit(formData);
        onOpenChange(false);
      } catch (error) {
        // Error handling is done in parent component
      }
    }
  };

  const updateFormData = (updates: Partial<JobCreationData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!formData.clientId;
      case 2: return !!(formData.title.trim() && formData.description.trim() && formData.location.trim());
      case 3: return formData.requirements.length > 0 && !!formData.requirements[0]?.trim();
      case 4: return !!(formData.category && formData.statusId);
      case 5: return true;
      default: return false;
    }
  };

  const renderStepContent = () => {
    const StepIcon = stepIcons[currentStep - 1];

    switch (currentStep) {
      case 1: // Client Selection
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Building2 className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Select Client</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose the client this job belongs to
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="client-select" className="text-sm font-medium">
                  Client <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.clientId} onValueChange={(value) => updateFormData({ clientId: value })}>
                  <SelectTrigger className={errors.clientId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{client.companyName}</div>
                            <div className="text-xs text-gray-500">{client.name}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.clientId}
                  </p>
                )}
              </div>

              {formData.clientId && selectedClient && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">{selectedClient.companyName}</p>
                      <p className="text-xs text-green-700">{selectedClient.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {clients.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">No clients available. Please create a client first.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Job Details
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Briefcase className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Provide basic information about this position
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="job-title" className="text-sm font-medium">
                  Job Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="job-title"
                  value={formData.title}
                  onChange={(e) => updateFormData({ title: e.target.value })}
                  placeholder="e.g. Senior Frontend Developer"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="job-description" className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="job-description"
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  placeholder="Describe the role and responsibilities..."
                  className={`min-h-[100px] resize-none ${errors.description ? 'border-red-500' : ''}`}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job-location" className="text-sm font-medium">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="job-location"
                    value={formData.location}
                    onChange={(e) => updateFormData({ location: e.target.value })}
                    placeholder="e.g. New York, NY"
                    className={errors.location ? 'border-red-500' : ''}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.location}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="salary-range" className="text-sm font-medium">
                    Salary Range
                  </Label>
                  <Input
                    id="salary-range"
                    value={formData.salaryRange}
                    onChange={(e) => updateFormData({ salaryRange: e.target.value })}
                    placeholder="e.g. $80,000 - $120,000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="department" className="text-sm font-medium">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => updateFormData({ department: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </div>

                <div>
                  <Label htmlFor="employment-type" className="text-sm font-medium">
                    Employment Type
                  </Label>
                  <Select 
                    value={formData.employmentType} 
                    onValueChange={(value) => updateFormData({ employmentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 3: // Requirements
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
              <p className="text-sm text-gray-600 mt-1">
                Define the skills and qualifications needed
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="requirements" className="text-sm font-medium">
                  Job Requirements <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements.join('\n')}
                  onChange={(e) => updateFormData({ 
                    requirements: [e.target.value]
                  })}
                  placeholder="Enter job requirements as free text&#10;&#10;Example:&#10;We are looking for a candidate with a Bachelor's degree in Computer Science or related field. The ideal candidate should have 5+ years of experience with JavaScript and modern frameworks like React. Strong problem-solving skills and excellent communication abilities are essential."
                  className={`min-h-[120px] resize-none ${errors.requirements ? 'border-red-500' : ''}`}
                />
                {errors.requirements && (
                  <p className="text-sm text-red-600 flex items-center mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.requirements}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter requirements as continuous text - no need for bullet points or line breaks
                </p>
              </div>
            </div>
          </div>
        );

      case 4: // Organization
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Settings className="w-10 h-10 text-blue-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Organization</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set category, status and tags for this job
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category" className="text-sm font-medium">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => updateFormData({ category: value })}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.statusId} 
                    onValueChange={(value) => updateFormData({ statusId: value })}
                  >
                    <SelectTrigger className={errors.statusId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center space-x-2">
                            {status.color && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: status.color }}
                              />
                            )}
                            <span>{status.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.statusId && (
                    <p className="text-sm text-red-600 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.statusId}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Tags (Optional)</Label>
                {tags.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between mt-1">
                        <span className="truncate">
                          {formData.tags.length > 0
                            ? `${formData.tags.length} tag${formData.tags.length > 1 ? 's' : ''} selected`
                            : 'Select tags'}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-full max-h-48 overflow-y-auto">
                      {tags.map(tag => (
                        <DropdownMenuCheckboxItem
                          key={tag}
                          checked={formData.tags.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFormData({ tags: [...formData.tags, tag] });
                            } else {
                              updateFormData({ 
                                tags: formData.tags.filter(t => t !== tag) 
                              });
                            }
                          }}
                        >
                          {tag}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="text-sm text-gray-500 border rounded-md p-3 bg-gray-50 mt-1">
                    No tags available
                  </div>
                )}

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateFormData({ 
                              tags: formData.tags.filter(t => t !== tag) 
                            });
                          }}
                          className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                        >
                          <X className="w-2 h-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 5: // Review & Create
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Check className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">Review & Create</h3>
              <p className="text-sm text-gray-600 mt-1">
                Review the details before creating the job
              </p>
            </div>

            <div className="space-y-4">
              {/* Client */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <Building2 className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Client</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{selectedClient?.companyName}</div>
                  <div className="text-gray-600">{selectedClient?.name}</div>
                </div>
              </div>

              {/* Job Details */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <Briefcase className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Job Details</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Title:</span> {formData.title}</div>
                  <div><span className="font-medium">Location:</span> {formData.location}</div>
                  {formData.salaryRange && (
                    <div><span className="font-medium">Salary:</span> {formData.salaryRange}</div>
                  )}
                  {formData.employmentType && (
                    <div><span className="font-medium">Type:</span> {formData.employmentType}</div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Description</span>
                </div>
                <p className="text-sm text-gray-800">{formData.description}</p>
              </div>

              {/* Requirements */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Requirements
                  </span>
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {formData.requirements[0] || 'No requirements specified'}
                </div>
              </div>

              {/* Organization */}
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Organization</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Category:</span> {formData.category}</div>
                  <div><span className="font-medium">Status:</span> {statuses.find(s => s.id === formData.statusId)?.title}</div>
                  {formData.tags.length > 0 && (
                    <div>
                      <span className="font-medium">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Create New Job</DialogTitle>
          <div className="mt-3">
            <StepIndicator currentStep={currentStep} totalSteps={5} />
            <p className="text-sm text-gray-600 text-center mt-2">
              {stepTitles[currentStep - 1]} ({currentStep} of 5)
            </p>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            {renderStepContent()}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center flex-shrink-0 bg-white">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? () => onOpenChange(false) : handlePrevious}
            disabled={isSubmitting}
            size="sm"
          >
            {currentStep === 1 ? "Cancel" : "Previous"}
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              size="sm"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Job"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
