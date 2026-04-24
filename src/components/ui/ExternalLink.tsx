import React from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { cn } from '@/lib/utils';

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A shared component for opening external URLs in the system's default browser.
 * Uses @tauri-apps/plugin-opener to ensure consistent behavior across Tauri platforms.
 */
export const ExternalLink = ({ 
  href, 
  children, 
  className, 
  onClick,
  ...props 
}: ExternalLinkProps) => {
  
  const handleOpen = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If there's an existing onClick, call it first
    if (onClick) onClick(e);
    
    // Prevent default anchor navigation/page refresh
    e.preventDefault();
    
    if (!href) return;

    try {
      // Use the Tauri opener plugin
      await openUrl(href);
    } catch (err) {
      console.error('Failed to open URL via plugin-opener:', err);
      // Fallback to standard window.open if plugin fails
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <a
      href={href}
      onClick={handleOpen}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-500/30 hover:decoration-blue-500 underline-offset-4 transition-all duration-200 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
};
