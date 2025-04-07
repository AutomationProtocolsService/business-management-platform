import React from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * A consistent page layout component that provides standardized styling
 * for page titles, subtitles, and action buttons.
 * 
 * @param title The main page title
 * @param subtitle Optional subtitle displayed below the title
 * @param actions Optional action buttons to display in the header
 * @param children The main content of the page
 * @param className Optional additional CSS classes
 */
export function PageLayout({
  title,
  subtitle,
  actions,
  children,
  className
}: PageLayoutProps) {
  return (
    <div className={cn("container mx-auto px-4 py-6 h-full", className)}>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}