# YTFCS-ATS (Applicant Tracking System)

A modern, full-stack Applicant Tracking System (ATS) built with React, React Router, shadcn/ui, Redux, Tailwind CSS, and Firebase Firestore. Resume parsing is powered by Affinda's API. Designed for easy candidate import, management, and real‑time collaboration.

## Features

- 📄 **Resume Import & Parsing**
  - Upload PDF/DOC/DOCX resumes
  - Automatically extract key data (name, experience, education, skills) via Affinda API
  - Manual adjustment of parsed fields before saving
- 🔥 **Real‑Time Storage**
  - Store candidates in Firestore with live updates
- 📋 **Candidate Database (Talent Pool)**
  - List all applicants in a responsive, searchable data table
  - Wrap long fields (education, skills) while keeping fixed column widths
- 🏷️ **Tag & Category Management**
  - Create, edit, delete tags and categories via Firestore
  - Assign tags & categories to candidates
- 🔍 **Search & Filter**
  - Full-text search on any candidate field
  - Filter by tags, categories, experience, etc.
- ⚖️ **Sorting**
  - Sort by name, experience, date added, and other attributes
- 📝 **Notes & Ratings**
  - Add and edit candidate notes
  - Rate candidates on a custom scale
- 🖼️ **Detail Modal**
  - Click any row to open a modal with full candidate details and edit controls
  - Transparent, blurred backdrop for focus
- 🔄 **Real‑Time Sync**
  - All changes (notes, ratings, tags) persist instantly in Firestore
- 🛠️ **Developer Tools**
  - Redux Toolkit for state management
  - React Router for routing and nested layouts
  - shadcn/ui components for consistent UI
  - Tailwind CSS for utility‑first styling
  - PNPM for fast, disk‑efficient installs

## Tech Stack

- **Framework**: React (Client) + React Router (v6)
- **UI Library**: shadcn/ui (Radix + Tailwind)
- **State**: Redux Toolkit
- **Database**: Firebase Firestore
- **Resume Parsing**: Affinda API (v2)
- **Styling**: Tailwind CSS
- **Package Manager**: PNPM
- **Tooling**: Vite (dev server, build), Sonner (toasts)

## Prerequisites

- Node.js 18+ / PNPM installed
- Firebase project & credentials
- Affinda API Key

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```ini
# Firebase
VITE_FIREBASE_API_KEY=your_firebase_apiKey
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_authDomain
VITE_FIREBASE_PROJECT_ID=your_firebase_projectId
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messagingSenderId
VITE_FIREBASE_APP_ID=your_firebase_appId

# Affinda
VITE_AFFINDA_API_KEY=your_affinda_api_key
```

## Getting Started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Run the development server**

   ```bash
   pnpm dev
   ```

3. **Open** `http://localhost:5173` in your browser

## Available Scripts

- `pnpm dev` — Start the Vite dev server with HMR
- `pnpm build` — Create a production build
- `pnpm preview` — Preview the production build locally
- `pnpm lint` — Run ESLint checks

## Deployment

### Docker

```bash
docker build -t ytfcs-ats .
docker run -p 3000:3000 ytfcs-ats
```

### Static / Node Server

Deploy the `dist` folder output by `pnpm build` to your hosting of choice (Netlify, Vercel, DigitalOcean App Platform, etc.).

## Folder Structure

```
YTFCS-ATS/
├── app/                  # App entry & layouts
│   ├── root.tsx          # Redux & routing root
│   ├── dashboard/        # Dashboard pages (import, list, etc.)
│   └── components/       # Shared UI components
├── features/             # Redux slices (candidateImport, tags, candidates)
├── lib/                  # Utils & Firebase init
├── routes.ts             # Router definitions
├── store.ts              # Redux store setup
├── public/               # Static assets
├── tailwind.config.ts    # Tailwind config
├── vite.config.ts        # Vite config
└── README.md             # This file
```

## License

YTFCS © Mir Tauhidul Islam
