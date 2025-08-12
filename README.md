# ATS Frontend

A modern Applicant Tracking System built with React, TypeScript, and Firebase.

## Features

- **Real-time Synchronization**: Live updates across all users
- **Candidate Management**: Import, track, and manage candidates
- **Interview Scheduling**: Schedule and track interviews  
- **Job Management**: Create and manage job postings
- **Communication**: Email integration and tracking
- **Analytics**: Performance monitoring and reporting

## Tech Stack

- **Frontend**: React 18, Remix, TypeScript, Tailwind CSS
- **State**: Redux Toolkit with real-time sync
- **Backend**: Firebase (Auth + Firestore)
- **UI**: Radix UI components with custom styling

## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Configure Firebase credentials

# Start development
pnpm dev
```

## Documentation

- **Users**: See [USER_GUIDE.md](./USER_GUIDE.md) for usage instructions
- **Developers**: See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for technical details

## Project Structure

```
app/
├── components/     # UI components
├── dashboard/      # Dashboard pages  
├── features/       # Redux slices
├── hooks/          # Custom hooks
├── services/       # Firebase integration
└── types/          # TypeScript definitions
```

## Key Features

- **Performance Optimized**: Smart caching and loading states
- **Real-time Updates**: No manual refresh needed
- **Type Safe**: Full TypeScript implementation
- **Responsive**: Mobile-first design
- **Accessible**: WCAG compliant components

## Environment Variables

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

## License

Private project - All rights reserved
