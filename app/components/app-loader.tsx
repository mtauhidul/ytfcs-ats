import { AlertCircle, Database, Shield, Users } from 'lucide-react';
import { useAppLoading } from '~/context/app-loading-context';
import { PageLoader } from './ui/loading';
import { Button } from './ui/button';

interface AppLoaderProps {
  children: React.ReactNode;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ children }) => {
  const { isAppReady, loadingStates, error } = useAppLoading();

  // Show error state with retry option
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-red-800">Application Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              Retry Loading
            </Button>
            <p className="text-xs text-muted-foreground">
              If the problem persists, please contact support
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state with progress indicators
  if (!isAppReady) {
    const loadingSteps = [
      {
        key: 'auth',
        label: 'Authenticating user',
        loading: loadingStates.auth,
        icon: Shield,
      },
      {
        key: 'coreData',
        label: 'Loading application data',
        loading: loadingStates.coreData,
        icon: Database,
      },
    ];

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">ATS Loading</h1>
            <p className="text-muted-foreground">Preparing your workspace...</p>
          </div>

          <div className="space-y-3">
            {loadingSteps.map((step) => {
              const Icon = step.icon;
              const isComplete = !step.loading;
              const isCurrentStep = step.loading;

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isComplete
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : isCurrentStep
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {isCurrentStep && (
                      <div className="absolute -inset-1">
                        <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-current opacity-60" />
                      </div>
                    )}
                    {isComplete && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium">{step.label}</span>
                  {isCurrentStep && (
                    <div className="ml-auto">
                      <div className="animate-pulse text-sm">Loading...</div>
                    </div>
                  )}
                  {isComplete && (
                    <div className="ml-auto text-sm font-medium">Complete</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-current" />
              Initializing application...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // App is ready, render children
  return <>{children}</>;
};
