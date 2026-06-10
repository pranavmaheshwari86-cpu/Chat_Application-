"use client";

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // In production, this would send to Sentry/Google Analytics
    if (process.env.NODE_ENV === 'production') {
      console.log(`[Web Vitals] ${metric.name}: ${Math.round(metric.value)}`);
    }
  });

  return null;
}
