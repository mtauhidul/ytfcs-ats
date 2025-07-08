# YTFCS-ATS User Guide

## Overview
YTFCS-ATS (Applicant Tracking System) is a modern, comprehensive recruitment platform designed to streamline the entire hiring process. Built with React, Firebase, and advanced resume parsing technology, it provides real-time collaboration, intelligent candidate management, and automated workflow capabilities.

## Getting Started

### Login & Authentication
1. **Access the Platform**: Navigate to https://ytfcs-ats.vercel.app/
2. **Authentication Options**:
   - **Magic Link**: Enter your email to receive a secure login link
   - **Password Login**: Use email and password for traditional authentication
3. **Account Confirmation**: Check your email for verification links when required

### Dashboard Overview
Upon login, you'll access the main dashboard featuring:
- **Navigation Sidebar**: Access all platform features
- **Breadcrumb Navigation**: Track your current location
- **Real-time Updates**: Live data synchronization across all modules

## Core Features

### 1. Jobs Management
**Location**: Dashboard → Jobs List

**Create New Jobs**:
- Click "Create Job" button
- Fill in job details:
  - Job title and description
  - Department and location
  - Salary range
  - Employment type (Full-time, Part-time, Contract)
  - Required skills and experience level (comma-separated)
- Assign tags and categories for organization
- Set job status (Draft, Published, On Hold, Closed)

**Manage Existing Jobs**:
- View all jobs in a searchable table
- Filter by status, department, or tags
- Edit job details inline
- Change job status (Draft, Published, On Hold, Closed)
- Archive or delete completed positions
- View job history and updates

### 2. Candidate Import & Resume Parsing
**Location**: Dashboard → Candidate Import

**Resume Upload Methods**:
- **File Upload**: Drag & drop or browse for PDF/DOC/DOCX files
- **Email Import**: Import candidates from email attachments
- **Bulk Upload**: Process multiple resumes simultaneously

**Automated Parsing Process**:
1. Upload resume files
2. System automatically extracts:
   - Personal information (name, contact details)
   - Work experience and employment history
   - Education background
   - Skills and certifications
   - Professional summary
3. **Review & Edit**: Manually adjust parsed data before saving
4. **Resume Scoring**: AI-powered evaluation against job requirements
5. **Save to Database**: Confirm and store candidate profiles

**Resume Scoring Features**:
- Automated skill matching
- Experience level assessment
- Education requirement verification
- Overall compatibility score
- Detailed scoring breakdown

### 3. Candidates Management
**Location**: Dashboard → Candidates List

**Candidate Database**:
- **Comprehensive View**: Searchable table with all candidate information
- **Advanced Filtering**:
  - Search by name, skills, experience
  - Filter by tags, categories, job applications
  - Sort by relevance, date added, experience level
- **Quick Actions**:
  - View detailed profiles
  - Add notes and ratings
  - Update candidate status
  - Download resumes
  - Delete candidates

**Candidate Profiles**:
- **Personal Information**: Contact details, location
- **Professional Summary**: Experience overview and key skills
- **Work History**: Detailed employment timeline
- **Education**: Academic background and certifications
- **Skills Assessment**: Technical and soft skills evaluation
- **Application History**: Jobs applied for and current status
- **Notes & Ratings**: Recruiter feedback and assessments
- **Resume Attachments**: Original resume files

**Candidate Actions**:
- **Add Notes**: Record interview feedback, observations
- **Rate Candidates**: Score on custom rating scales
- **Tag Assignment**: Organize with custom tags
- **Status Updates**: Track application progress
- **Communication History**: Log all interactions

### 4. Application Workflow Management
**Location**: Dashboard → Application Flow

**Visual Kanban Board**:
- **Drag & Drop Interface**: Move candidates between stages
- **Customizable Stages**:
  - Applied
  - Initial Screening
  - Phone Interview
  - Technical Assessment
  - On-site Interview
  - Final Review
  - Offer Extended
  - Hired/Rejected

**Stage Management**:
- Create custom workflow stages
- Set stage-specific requirements
- Configure automatic notifications
- Track time spent in each stage
- View candidate progress analytics

**Workflow Features**:
- **Bulk Actions**: Move multiple candidates simultaneously
- **Stage Notes**: Add comments during transitions
- **Deadline Tracking**: Set and monitor stage deadlines
- **Automated Reminders**: System-generated follow-up alerts

### 5. Communication Tools
**Location**: Dashboard → Communication

**Email Management**:
- **Template Library**: Pre-built email templates for common scenarios
  - Application acknowledgments
  - Interview invitations
  - Rejection letters
  - Offer letters
- **Custom Templates**: Create personalized email templates
- **Bulk Messaging**: Send emails to multiple candidates
- **Email Tracking**: Monitor open and response rates

**Communication History**:
- **Centralized Log**: All candidate communications in one place
- **Thread Management**: Organize email conversations
- **Attachment Support**: Share documents and files
- **Response Tracking**: Monitor candidate responses

**Template Categories**:
- Initial contact emails
- Interview scheduling
- Follow-up messages
- Assessment instructions
- Offer negotiations
- Onboarding communications

### 6. Team Collaboration
**Location**: Dashboard → Collaboration

**Collaborative Features**:
- **Shared Notes**: Team-wide candidate observations
- **Feedback Collection**: Structured interview feedback forms
- **Rating Systems**: Multi-reviewer candidate assessments
- **Discussion Threads**: Team conversations about candidates

**Team Management**:
- **Role-based Access**: Different permissions for team members
- **Activity Tracking**: Monitor team member actions
- **Notification System**: Real-time updates on candidate progress
- **Consensus Building**: Collaborative decision-making tools

### 7. Organization & Categorization

#### Tags Management
**Location**: Dashboard → Tags

**Tag Features**:
- **Create Custom Tags**: Unlimited tagging system
- **Color Coding**: Visual organization with color-coded tags
- **Tag Categories**: Group related tags together
- **Bulk Tagging**: Apply tags to multiple candidates/jobs
- **Search & Filter**: Find content by tags quickly

**Common Tag Uses**:
- Skill categories (JavaScript, Python, Design)
- Experience levels (Junior, Senior, Lead)
- Interview status (Scheduled, Completed, Pending)
- Source tracking (LinkedIn, Referral, Career Fair)

#### Categories Management
**Location**: Dashboard → Categories

**Category System**:
- **Hierarchical Organization**: Create parent-child category relationships
- **Department Grouping**: Organize by business units
- **Job Function Classification**: Group similar roles
- **Custom Categorization**: Create domain-specific categories

#### Stages Management
**Location**: Dashboard → Stages

**Custom Stage Creation**:
- **Stage Definition**: Name and describe workflow stages
- **Order Management**: Set stage sequence and flow
- **Requirements Setting**: Define stage completion criteria
- **Automation Rules**: Configure automatic stage transitions

### 8. Email Monitoring
**Location**: Dashboard → Monitoring

**Email System Oversight**:
- **Delivery Tracking**: Monitor email delivery success rates
- **Response Analytics**: Track candidate response patterns
- **System Health**: Email service status monitoring
- **Error Reporting**: Identify and resolve email issues

**Monitoring Features**:
- **Real-time Dashboard**: Live email system metrics
- **Alert System**: Notifications for delivery failures
- **Performance Analytics**: Email engagement statistics
- **Troubleshooting Tools**: Diagnostic utilities

### 9. Profile Management
**Location**: Dashboard → Profile

**User Settings**:
- **Personal Information**: Update contact details and preferences
- **Notification Settings**: Configure email and system alerts
- **Security Options**: Password changes and security settings
- **Display Preferences**: Customize dashboard appearance

## Advanced Features

### Search & Filtering
**Global Search Capabilities**:
- **Full-text Search**: Search across all candidate data
- **Advanced Filters**: Combine multiple search criteria
- **Saved Searches**: Store frequently used search queries
- **Export Results**: Download filtered data sets

### Real-time Collaboration
**Live Updates**:
- **Instant Synchronization**: Changes appear immediately for all users
- **Conflict Resolution**: Automatic handling of simultaneous edits
- **Activity Feed**: Real-time notifications of team actions
- **Presence Indicators**: See who's currently viewing candidates

### Data Management
**Import/Export Features**:
- **Bulk Import**: Upload candidate data via CSV/Excel
- **Data Export**: Download candidate information in various formats
- **Backup & Restore**: Secure data backup capabilities
- **Data Validation**: Automatic quality checks on imported data

### Analytics & Reporting
**Performance Metrics**:
- **Recruitment Analytics**: Time-to-hire and source effectiveness (coming soon)
- **Candidate Funnel**: Visual representation of application flow (coming soon)
- **Team Performance**: Individual and group productivity metrics (coming soon)
- **Custom Reports**: Generate tailored recruitment reports (coming soon)

## Best Practices

### Workflow Optimization
1. **Set Up Standard Stages**: Create consistent workflow stages for all positions
2. **Use Tags Systematically**: Develop a standardized tagging convention
3. **Regular Data Cleanup**: Periodically review and update candidate information
4. **Template Standardization**: Create professional email templates for all scenarios

### Team Collaboration
1. **Clear Role Definition**: Assign specific responsibilities to team members
2. **Regular Reviews**: Schedule periodic candidate review meetings
3. **Feedback Consistency**: Use standardized rating criteria
4. **Communication Protocol**: Establish clear communication guidelines

### Data Quality
1. **Resume Review**: Always verify auto-parsed resume data
2. **Regular Updates**: Keep candidate information current
3. **Note Taking**: Document all candidate interactions thoroughly
4. **File Organization**: Maintain consistent file naming conventions

## Support & Troubleshooting

### Common Issues
- **Resume Parsing Errors**: Verify file format and quality
- **Search Problems**: Check spelling and filter settings
- **Notification Issues**: Review email settings and permissions
- **Performance Issues**: Clear browser cache and check internet connection

### Data Security
- **Access Control**: Role-based permissions protect sensitive data
- **Secure Storage**: All data encrypted and securely stored
- **Regular Backups**: Automatic data backup and recovery
- **Audit Trail**: Complete record of all system activities

### System Requirements
- **Browser Compatibility**: Modern web browsers (Chrome, Firefox, Safari, Edge)
- **Internet Connection**: Stable internet for real-time features
- **File Formats**: PDF, DOC, DOCX for resume uploads
- **Screen Resolution**: Optimized for desktop and tablet viewing

---

## Quick Reference

### Keyboard Shortcuts
- **Search**: `Ctrl/Cmd + K` - Global search
- **New Candidate**: `Ctrl/Cmd + N` - Add new candidate
- **Save**: `Ctrl/Cmd + S` - Save current changes

### File Format Support
- **Resumes**: PDF, DOC, DOCX
- **Import**: CSV, Excel (for bulk data)
- **Export**: PDF, CSV, Excel

### Contact Information
For technical support or feature requests, please contact: **mislam@aristagroups.com**

---

*This user guide covers the essential features and functionality of the YTFCS-ATS platform. For the most up-to-date information and advanced features, refer to the latest system documentation.*
