import { useEffect, useRef } from "react";

interface PerformanceMetrics {
  renderTime: number;
  candidateCount: number;
  stageCount: number;
}

export function usePerformanceMonitoring(
  candidateCount: number,
  stageCount: number,
  enabled = false
) {
  const renderStartTime = useRef<number>(0);
  const previousMetrics = useRef<PerformanceMetrics | null>(null);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartTime.current;
    const metrics: PerformanceMetrics = {
      renderTime,
      candidateCount,
      stageCount,
    };

    // Log performance metrics in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚀 Workflow Performance Metrics");
      console.log(`Render Time: ${renderTime.toFixed(2)}ms`);
      console.log(`Candidates: ${candidateCount}`);
      console.log(`Stages: ${stageCount}`);
      
      if (previousMetrics.current) {
        const timeDiff = renderTime - previousMetrics.current.renderTime;
        const candidateDiff = candidateCount - previousMetrics.current.candidateCount;
        
        console.log(`Performance change: ${timeDiff > 0 ? '+' : ''}${timeDiff.toFixed(2)}ms`);
        console.log(`Candidate change: ${candidateDiff > 0 ? '+' : ''}${candidateDiff}`);
      }
      
      // Performance warnings
      if (renderTime > 100) {
        console.warn("⚠️ Slow render detected (>100ms)");
      }
      if (candidateCount > 100) {
        console.warn("⚠️ Large dataset detected (>100 candidates) - consider virtualization");
      }
      
      console.groupEnd();
    }

    previousMetrics.current = metrics;
  }, [candidateCount, stageCount, enabled]);

  return {
    enabled,
    lastRenderTime: previousMetrics.current?.renderTime || 0,
  };
}
