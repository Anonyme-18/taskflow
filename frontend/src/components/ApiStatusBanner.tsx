'use client';

import React from 'react';

interface ApiStatusBannerProps {
  error: string | null;
  onRetry?: () => void;
}

export const ApiStatusBanner: React.FC<ApiStatusBannerProps> = ({ error, onRetry }) => {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-rose-500 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          <div>
            <h4 className="text-sm font-semibold text-rose-800">
              Communication interrompue avec la base de données locale
            </h4>
            <p className="text-sm text-rose-700 mt-0.5">
              {error}
            </p>
            <p className="text-xs text-rose-600 mt-1">
              Architecture Hybride : Assurez-vous que le PC 1 est sous tension et que le tunnel Cloudflare est opérationnel.
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-4 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold rounded-md transition whitespace-nowrap"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};
