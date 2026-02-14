"use client";

import { Check } from "lucide-react";

interface WizardStep {
  label: string;
}

interface ReportWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
  children: React.ReactNode;
}

export function ReportWizard({
  steps,
  currentStep,
  onStepClick,
  children,
}: ReportWizardProps) {
  return (
    <div className="report-wizard">
      {/* Step indicators */}
      <div className="report-wizard-steps">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <button
              key={i}
              className={`report-wizard-step${isActive ? " active" : ""}${isCompleted ? " completed" : ""}`}
              onClick={() => onStepClick(i)}
              type="button"
            >
              <span className="report-wizard-step-number">
                {isCompleted ? <Check size={14} /> : i + 1}
              </span>
              {step.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      {children}
    </div>
  );
}
