/**
 * App Configuration Constants
 * Centralized configuration for the application
 */

export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || 
  process.env.NEXT_PUBLIC_BASE_URL || 
  'https://agentyc.app';

export const APP_NAME = 'Agentyc';

// Metadata for SEO and OpenGraph
export const APP_METADATA = {
  title: 'Agentyc Trader',
  description: 'Agentyc Trading Platform',
  url: APP_BASE_URL,
  siteName: APP_NAME,
};

