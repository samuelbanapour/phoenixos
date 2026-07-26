import React from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";

export default function StepIndicator({ steps = [], currentStep = 0 }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isComplete
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : isActive
                    ? "bg-phoenix-500/20 text-phoenix-400 border border-phoenix-500/50 pulse-glow"
                    : "bg-dark-800 text-dark-500 border border-dark-600"
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs text-center max-w-[80px] leading-tight ${
                  isActive ? "text-phoenix-400 font-medium" : isComplete ? "text-dark-300" : "text-dark-500"
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-5">
                <div
                  className={`h-full rounded-full transition-all ${
                    isComplete ? "bg-green-500/50" : "bg-dark-700"
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
