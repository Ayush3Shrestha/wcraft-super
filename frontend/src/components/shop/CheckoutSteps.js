import React from "react";
import { Check } from "lucide-react";

const STEPS = ["Cart", "Details", "Confirmed"];

// Cart → Details → Confirmed, with `current` counted from 1
export default function CheckoutSteps({ current }) {
  return (
    <ol className="wc-steps" aria-label="Checkout progress">
      {STEPS.map((name, i) => {
        const step = i + 1;
        const done = step < current;
        return (
          <li key={name} className={done ? "wc-done" : undefined} aria-current={step === current ? "step" : undefined}>
            {i > 0 && <span className="wc-step-line" aria-hidden="true" />}
            <span className="wc-step-dot" aria-hidden="true">
              {done ? <Check size={11} strokeWidth={3} /> : step}
            </span>
            {name}
            {done && <span className="sr-only"> (done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
