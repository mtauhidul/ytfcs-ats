# ATS Frontend - Developer Guide

## Tech Stack

### Core Technologies
- **React 18**: UI library with hooks and functional components
- **Remix**: Full-stack React framework for routing and SSR
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Firebase**: Authentication and Firestore database
- **Redux Toolkit**: State management with real-time sync

### Key Libraries
- **React Router**: Client-side routing
- **Lucide React**: Icon system
- **Sonner**: Toast notifications
- **Radix UI**: Accessible component primitives

## Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, inputs, etc.)
│   ├── auth/           # Authentication components
│   └── shared/         # Shared business components
├── context/            # React contexts (auth, app loading)
├── dashboard/          # Dashboard pages and components
├── features/           # Redux slices for state management
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── services/           # API services and Firebase integrations
├── types/              # TypeScript type definitions
└── root.tsx            # Application root with providers
```

## Architecture Patterns

### State Management
- **Redux Toolkit**: Centralized state with real-time Firestore sync
- **Persistence Flags**: Prevent unnecessary data refetching
- **Custom Hooks**: Encapsulate data synchronization logic

### Component Patterns
- **Functional Components**: All components use hooks
- **Compound Components**: Complex UI built with composition
- **Loading States**: Unified DataLoader component for consistency

### Data Flow
```
Firebase → Real-time Service → Redux Store → Components
```

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm package manager
- Firebase project with Firestore

### Installation
```bash
# Install dependencies
pnpm install

# Environment setup
cp .env.example .env
# Configure Firebase credentials in .env

# Start development server
pnpm dev
```

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Key Implementation Details

### Real-time Data Sync
- **Services**: `app/services/realtimeService.ts` manages Firestore subscriptions
- **Redux Integration**: Custom actions update store on data changes
- **Hooks**: `useRealtimeSync()` provides component-level subscription management

### Loading Optimization
- **AppLoadingContext**: Prevents component rendering until data is ready
- **DataLoader Component**: Unified loading, error, and empty states
- **Persistence Flags**: Track data initialization to prevent refetching

### Authentication Flow
- **Firebase Auth**: Handles user authentication
- **Team Validation**: Checks user exists in teamMembers collection
- **Context Provider**: Manages auth state across application

## Best Practices

### Code Standards
- **TypeScript**: Strict typing throughout
- **Functional Programming**: Pure functions, no classes
- **Component Composition**: Prefer composition over inheritance
- **Error Boundaries**: Graceful error handling

### Performance
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components  
- **Debouncing**: Search and filter operations
- **Real-time Optimization**: Smart subscription management

### State Management
- **Single Source of Truth**: All app state in Redux
- **Normalized Data**: Flat state structure
- **Optimistic Updates**: UI updates before API confirmation
- **Error Recovery**: Graceful handling of failed operations

## Common Development Tasks

### Adding New Components
```tsx
// Use functional components with TypeScript
interface ComponentProps {
  data: EntityType;
  onAction: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  // Component implementation
};
```

### Creating Redux Slices
```typescript
// Follow established pattern with persistence flags
interface EntityState {
  entities: Entity[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  isInitialized: boolean;
}
```

### Adding Real-time Sync
```typescript
// Create subscription hook following existing pattern
export const useEntitySync = () => {
  const { isInitialized } = useAppSelector(state => state.entity);
  
  useEffect(() => {
    if (isInitialized) return;
    // Setup real-time subscription
  }, [isInitialized]);
};
```

## Build & Deployment

### Development
```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
```

### Production
- Build process optimizes for performance
- Environment variables must be configured
- Firebase security rules should be reviewed

## Troubleshooting

### Common Issues
- **Build Errors**: Check TypeScript errors and dependencies
- **Firebase Issues**: Verify credentials and security rules
- **Performance**: Check React DevTools for unnecessary re-renders

### Debugging
- React DevTools for component inspection
- Redux DevTools for state debugging
- Firebase console for data verification

## Contributing

1. **Code Style**: Follow existing patterns and TypeScript conventions
2. **Testing**: Write tests for new functionality
3. **Documentation**: Update relevant documentation
4. **Performance**: Consider loading and real-time sync implications
