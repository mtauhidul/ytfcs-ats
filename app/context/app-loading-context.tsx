import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppSelector } from '~/hooks/redux';
import { useAuth } from './auth-context';

interface AppLoadingContextType {
  isAppReady: boolean;
  loadingStates: {
    auth: boolean;
    coreData: boolean;
  };
  error: string | null;
}

const AppLoadingContext = createContext<AppLoadingContextType>({
  isAppReady: false,
  loadingStates: {
    auth: true,
    coreData: true,
  },
  error: null,
});

export const useAppLoading = () => {
  return useContext(AppLoadingContext);
};

export const AppLoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [isAppReady, setIsAppReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get core data loading states from Redux
  const stages = useAppSelector((state) => state.stages);
  const tags = useAppSelector((state) => state.tags);
  const categories = useAppSelector((state) => state.categories);

  // Check if core data is initialized
  const isCoreDataReady = stages.isInitialized && tags.isInitialized && categories.isInitialized;
  
  // Check for any core data errors
  const hasCoreDataErrors = stages.error || tags.error || categories.error;

  useEffect(() => {
    // Reset error state when auth loading starts
    if (authLoading) {
      setError(null);
      setIsAppReady(false);
      return;
    }

    // Handle auth errors
    if (authError) {
      setError(authError);
      setIsAppReady(false);
      return;
    }

    // Handle core data errors
    if (hasCoreDataErrors) {
      setError(hasCoreDataErrors);
      setIsAppReady(false);
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setError('User not authenticated');
      setIsAppReady(false);
      return;
    }

    // App is ready when auth is complete and core data is loaded
    if (!authLoading && isCoreDataReady) {
      setError(null);
      setIsAppReady(true);
    } else {
      setIsAppReady(false);
    }
  }, [authLoading, authError, user, isCoreDataReady, hasCoreDataErrors]);

  const value: AppLoadingContextType = {
    isAppReady,
    loadingStates: {
      auth: authLoading,
      coreData: !isCoreDataReady,
    },
    error,
  };

  return (
    <AppLoadingContext.Provider value={value}>
      {children}
    </AppLoadingContext.Provider>
  );
};
