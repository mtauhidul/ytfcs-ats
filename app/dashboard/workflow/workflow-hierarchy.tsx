// app/dashboard/workflow/workflow-hierarchy.tsx
import React, { useState, useEffect } from 'react';
import { WorkflowHierarchyView } from '~/components/workflow/workflow-hierarchy-view';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '~/components/ui/tabs';
import { 
  Building2, 
  Briefcase, 
  GitBranch, 
  BarChart3,
  Users,
  Settings 
} from 'lucide-react';

// Mock data - replace with actual data from your services
const mockClients = [
  {
    id: 'client1',
    name: 'John Smith',
    companyName: 'Tech Innovations Inc.',
    contactEmail: 'john@techinnovations.com',
    contactPhone: '+1-555-0123',
    status: 'active' as const,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'client2',
    name: 'Sarah Johnson',
    companyName: 'Global Solutions Ltd.',
    contactEmail: 'sarah@globalsolutions.com',
    contactPhone: '+1-555-0456',
    status: 'active' as const,
    createdAt: '2024-01-20T10:00:00Z'
  },
  {
    id: 'client3',
    name: 'Michael Chen',
    companyName: 'Digital Dynamics Corp.',
    contactEmail: 'michael@digitaldynamics.com',
    contactPhone: '+1-555-0789',
    status: 'active' as const,
    createdAt: '2024-01-25T10:00:00Z'
  }
];

const mockJobs = [
  {
    id: 'job1',
    title: 'Senior Frontend Developer',
    clientId: 'client1',
    clientName: 'Tech Innovations Inc.',
    clientCompany: 'Tech Innovations Inc.',
    status: 'active',
    statusId: 'active',
    tags: ['frontend', 'react', 'typescript'],
    category: 'development',
    description: 'Looking for an experienced React developer',
    requirements: ['React', 'TypeScript', 'Node.js'],
    location: 'Remote',
    salaryRange: '$80,000 - $120,000'
  },
  {
    id: 'job2',
    title: 'Backend Engineer',
    clientId: 'client1',
    clientName: 'Tech Innovations Inc.',
    clientCompany: 'Tech Innovations Inc.',
    status: 'active',
    statusId: 'active',
    tags: ['backend', 'node', 'aws'],
    category: 'development',
    description: 'Node.js backend engineer for scalable systems',
    requirements: ['Node.js', 'PostgreSQL', 'AWS'],
    location: 'San Francisco, CA',
    salaryRange: '$90,000 - $130,000'
  },
  {
    id: 'job3',
    title: 'Product Manager',
    clientId: 'client2',
    clientName: 'Global Solutions Ltd.',
    clientCompany: 'Global Solutions Ltd.',
    status: 'active',
    statusId: 'active',
    tags: ['product', 'management', 'strategy'],
    category: 'product',
    description: 'Lead product strategy and roadmap',
    requirements: ['Product Management', 'Agile', 'Analytics'],
    location: 'New York, NY',
    salaryRange: '$100,000 - $140,000'
  },
  {
    id: 'job4',
    title: 'UX Designer',
    clientId: 'client3',
    clientName: 'Digital Dynamics Corp.',
    clientCompany: 'Digital Dynamics Corp.',
    status: 'active',
    statusId: 'active',
    tags: ['design', 'ux', 'figma'],
    category: 'design',
    description: 'Design user experiences for mobile apps',
    requirements: ['Figma', 'User Research', 'Prototyping'],
    location: 'Austin, TX',
    salaryRange: '$70,000 - $100,000'
  }
];

export default function WorkflowHierarchyPage() {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('hierarchy');

  // Auto-select first client for demo
  useEffect(() => {
    if (!selectedClientId && mockClients.length > 0) {
      setSelectedClientId(mockClients[0].id);
    }
  }, [selectedClientId]);

  const selectedClient = mockClients.find(c => c.id === selectedClientId);
  const clientJobs = mockJobs.filter(job => job.clientId === selectedClientId);

  const getHierarchyStats = () => {
    const totalClients = mockClients.length;
    const totalJobs = mockJobs.length;
    const activeJobs = mockJobs.filter(job => job.status === 'active').length;
    const avgJobsPerClient = (totalJobs / totalClients).toFixed(1);

    return { totalClients, totalJobs, activeJobs, avgJobsPerClient };
  };

  const stats = getHierarchyStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workflow Management</h1>
              <p className="text-gray-600 mt-2">
                Organize and manage workflows with client-job hierarchy
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button>
                <Users className="w-4 h-4 mr-2" />
                Manage Team
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-semibold">{stats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-semibold">{stats.totalJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GitBranch className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-semibold">{stats.activeJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Jobs/Client</p>
                  <p className="text-2xl font-semibold">{stats.avgJobsPerClient}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="hierarchy" className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4" />
              <span>Workflow Hierarchy</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Client Details</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hierarchy" className="space-y-0">
            <WorkflowHierarchyView
              clients={mockClients}
              jobs={mockJobs}
              selectedClientId={selectedClientId}
              onClientSelect={setSelectedClientId}
            />
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            {selectedClient ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Client Info */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Client Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedClient.companyName}</h3>
                      <p className="text-gray-600">{selectedClient.name}</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-sm text-gray-600">{selectedClient.contactEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Phone</p>
                        <p className="text-sm text-gray-600">{selectedClient.contactPhone}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Active Jobs</span>
                        <Badge variant="secondary">{clientJobs.length}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Jobs List */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="w-5 h-5 mr-2" />
                      Jobs for {selectedClient.companyName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clientJobs.map(job => (
                        <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-lg">{job.title}</h4>
                              <p className="text-gray-600 mt-1">{job.description}</p>
                              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                                <span>📍 {job.location}</span>
                                <span>💰 {job.salaryRange}</span>
                                <Badge 
                                  variant={job.status === 'active' ? 'default' : 'secondary'}
                                  className="ml-auto"
                                >
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {job.requirements.map(req => (
                                  <Badge key={req} variant="outline" className="text-xs">
                                    {req}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {clientJobs.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No jobs found for this client</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No client selected
                  </h3>
                  <p className="text-gray-600">
                    Please select a client to view their details and jobs.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
