import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import { 
  subscribeToApplications,
  subscribeToCategories,
  subscribeToCandidates,
  subscribeToJobs,
  subscribeToStages,
  subscribeToTags,
  subscribeToInterviews,
  unsubscribeFromCollection,
  type SubscriptionKey,
} from "~/services/realtimeService";
import { setApplications } from "~/features/applicationsSlice";
import { setCategories } from "~/features/categoriesSlice";
import { setCandidates } from "~/features/candidatesSlice";
import { setJobs } from "~/features/jobsSlice";
import { setStages } from "~/features/stagesSlice";
import { setTags } from "~/features/tagsSlice";
import { setInterviews } from "~/features/interviewsSlice";

let globalSubscriptionsActive = false;
const activeGlobalSubscriptions: SubscriptionKey[] = [];

export const useRealtimeSync = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (globalSubscriptionsActive) return;

    globalSubscriptionsActive = true;

    const subscriptions: SubscriptionKey[] = [
      subscribeToCandidates((candidates) => dispatch(setCandidates(candidates))),
      subscribeToJobs((jobs) => dispatch(setJobs(jobs))),
      subscribeToStages((stages) => dispatch(setStages(stages))),
      subscribeToTags((tags) => dispatch(setTags(tags))),
      subscribeToCategories((categories) => dispatch(setCategories(categories))),
      subscribeToApplications((applications) => dispatch(setApplications(applications))),
      subscribeToInterviews((interviews) => dispatch(setInterviews(interviews)))
    ];

    activeGlobalSubscriptions.push(...subscriptions);

    return () => {
      globalSubscriptionsActive = false;
      activeGlobalSubscriptions.forEach(unsubscribeFromCollection);
      activeGlobalSubscriptions.length = 0;
    };
  }, [dispatch]);
};

export const useCandidatesSync = () => {
  const dispatch = useAppDispatch();
  const { candidates } = useAppSelector((state) => state.candidates);

  useEffect(() => {
    if (candidates.length > 0) return;

    const subscription = subscribeToCandidates((candidates) => 
      dispatch(setCandidates(candidates))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, candidates.length]);
};

export const useJobsSync = () => {
  const dispatch = useAppDispatch();
  const { jobs } = useAppSelector((state) => state.jobs);

  useEffect(() => {
    if (jobs.length > 0) return;

    const subscription = subscribeToJobs((jobs) => 
      dispatch(setJobs(jobs))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, jobs.length]);
};

export const useStagesSync = () => {
  const dispatch = useAppDispatch();
  const { stages, isInitialized } = useAppSelector((state) => state.stages);

  useEffect(() => {
    if (isInitialized && stages.length > 0) return;

    const subscription = subscribeToStages((stages) => 
      dispatch(setStages(stages))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, isInitialized, stages.length]);
};

export const useTagsSync = () => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.tags);

  useEffect(() => {
    if (isInitialized) return;

    const subscription = subscribeToTags((tags) => 
      dispatch(setTags(tags))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, isInitialized]);
};

export const useCategoriesSync = () => {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((state) => state.categories);

  useEffect(() => {
    if (isInitialized) return;

    const subscription = subscribeToCategories((categories) => 
      dispatch(setCategories(categories))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, isInitialized]);
};

export const useApplicationsSync = () => {
  const dispatch = useAppDispatch();
  const { applications } = useAppSelector((state) => state.applications);

  useEffect(() => {
    if (applications.length > 0) return;

    const subscription = subscribeToApplications((applications) => 
      dispatch(setApplications(applications))
    );

    return () => unsubscribeFromCollection(subscription);
  }, [dispatch, applications.length]);
};
