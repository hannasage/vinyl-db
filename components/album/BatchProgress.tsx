'use client';

import React from 'react';

interface BatchProgressProps {
  currentStep: number;
  totalSteps: number;
  currentDescription: string;
  summary: string;
  isComplete: boolean;
  hasErrors: boolean;
  className?: string;
}

export default function BatchProgress({ 
  currentStep, 
  totalSteps, 
  currentDescription, 
  summary,
  isComplete,
  hasErrors,
  className = '' 
}: BatchProgressProps) {
  const progressPercentage = Math.min((currentStep / totalSteps) * 100, 100);
  
  const getStatusColor = () => {
    if (isComplete) {
      return hasErrors ? 'text-yellow-600' : 'text-green-600';
    }
    return 'text-blue-600';
  };

  const getStatusIcon = () => {
    if (isComplete) {
      return hasErrors ? '⚠️' : '✅';
    }
    return '🔄';
  };

  const getStatusText = () => {
    if (isComplete) {
      return hasErrors ? 'Completed with errors' : 'Completed successfully';
    }
    return 'In progress';
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 text-sm font-bold">
            {getStatusIcon()}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-blue-800">Batch Operation</h3>
      </div>
      
      <div className="mb-4">
        <p className="text-blue-700 mb-2">{summary}</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        {/* Progress Text */}
        <div className="flex justify-between text-sm text-blue-600">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Current Step */}
      {!isComplete && (
        <div className="mb-3">
          <p className="text-sm text-blue-700 font-medium">Current step:</p>
          <p className="text-blue-600">{currentDescription}</p>
        </div>
      )}

      {/* Status */}
      <div className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>
    </div>
  );
} 