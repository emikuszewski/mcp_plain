import { useState, useEffect, useCallback } from 'react';

// Pipeline steps configuration
export const PIPELINE_STEPS = [
  { id: 0, name: 'Start', duration: 0 },
  { id: 1, name: 'User Request', duration: 2000 },
  { id: 2, name: 'OAuth 2.1 Auth', duration: 2500 },
  { id: 3, name: 'Gate 1: Tool Filter', duration: 3000 },
  { id: 4, name: 'Tool Selection', duration: 2000 },
  { id: 5, name: 'Gate 2: Execution Auth', duration: 3000 },
  { id: 6, name: 'MCP Execute', duration: 2000 },
  { id: 7, name: 'Gate 3: Response Mask', duration: 2500 },
  { id: 8, name: 'Complete', duration: 0 },
];

export const usePipelineAnimation = (onStepChange) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stepData, setStepData] = useState({});

  // Start the pipeline
  const startPipeline = useCallback((initialData = {}) => {
    setCurrentStep(1);
    setIsRunning(true);
    setIsPaused(false);
    setStepData(initialData);
  }, []);

  // Reset the pipeline
  const resetPipeline = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(false);
    setIsPaused(false);
    setStepData({});
  }, []);

  // Pause/Resume
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Skip to next step
  const skipToNext = useCallback(() => {
    if (currentStep < PIPELINE_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  // Skip to specific step
  const skipToStep = useCallback((stepId) => {
    if (stepId >= 0 && stepId < PIPELINE_STEPS.length) {
      setCurrentStep(stepId);
    }
  }, []);

  // Update step data
  const updateStepData = useCallback((newData) => {
    setStepData(prev => ({ ...prev, ...newData }));
  }, []);

  // Auto-advance through steps
  useEffect(() => {
    if (!isRunning || isPaused || currentStep === 0 || currentStep >= PIPELINE_STEPS.length - 1) {
      return;
    }

    const currentStepConfig = PIPELINE_STEPS[currentStep];
    const nextStep = currentStep + 1;

    // Call onStepChange callback if provided
    if (onStepChange) {
      onStepChange(currentStep, PIPELINE_STEPS[currentStep]);
    }

    // Auto-advance to next step after duration
    const timer = setTimeout(() => {
      if (nextStep < PIPELINE_STEPS.length) {
        setCurrentStep(nextStep);
        
        // Stop running when we reach the final step
        if (nextStep === PIPELINE_STEPS.length - 1) {
          setIsRunning(false);
        }
      }
    }, currentStepConfig.duration);

    return () => clearTimeout(timer);
  }, [currentStep, isRunning, isPaused, onStepChange]);

  // Notify when complete
  useEffect(() => {
    if (currentStep === PIPELINE_STEPS.length - 1 && onStepChange) {
      onStepChange(currentStep, PIPELINE_STEPS[currentStep]);
    }
  }, [currentStep, onStepChange]);

  return {
    currentStep,
    isRunning,
    isPaused,
    stepData,
    steps: PIPELINE_STEPS,
    startPipeline,
    resetPipeline,
    togglePause,
    skipToNext,
    skipToStep,
    updateStepData,
    isComplete: currentStep === PIPELINE_STEPS.length - 1,
    progress: (currentStep / (PIPELINE_STEPS.length - 1)) * 100,
  };
};

export default usePipelineAnimation;
