// Skeleton loading components
// v1.0.0 | 2026-02-06

import React from 'react';

// Base shimmer bar
const SkeletonBar = ({ className = '' }) => (
  <div className={`skeleton-shimmer bg-bg-tertiary rounded ${className}`} />
);

// Circle placeholder (for headshots, logos)
const SkeletonCircle = ({ className = '' }) => (
  <div className={`skeleton-shimmer bg-bg-tertiary rounded-full ${className}`} />
);

// Player Card skeleton
export const PlayerCardSkeleton = () => (
  <div
    className="relative bg-bg-card rounded-2xl overflow-hidden shadow-theme-xl theme-transition"
    style={{ minWidth: '900px' }}
  >
    <div className="relative flex">
      {/* Left Panel */}
      <div className="w-80 p-6 flex flex-col bg-bg-elevated border-r border-border-light">
        {/* Team logo */}
        <SkeletonBar className="w-14 h-14 rounded-lg mb-4" />

        {/* Player photo */}
        <SkeletonBar className="w-full aspect-[4/5] rounded-xl mb-4" />

        {/* Player name */}
        <SkeletonBar className="h-8 w-40 mb-2" />
        <SkeletonBar className="h-8 w-48 mb-3" />

        {/* Team name */}
        <SkeletonBar className="h-4 w-36 mb-4" />

        {/* Season badge */}
        <SkeletonBar className="h-6 w-28 rounded-full mb-4" />

        {/* Position */}
        <SkeletonBar className="h-4 w-32 mb-4" />

        {/* Physical stats */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonBar key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-border-light px-6 pt-4 gap-4">
          {[1, 2, 3].map(i => (
            <SkeletonBar key={i} className="h-8 w-20 mb-2" />
          ))}
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-border-light">
            <SkeletonBar className="h-6 w-56" />
            <SkeletonBar className="h-6 w-24" />
          </div>

          {/* Stat categories */}
          {[1, 2, 3, 4, 5].map(cat => (
            <div key={cat} className="mb-5">
              <SkeletonBar className="h-3 w-24 mb-3" />
              {[1, 2, 3].map(bar => (
                <div key={bar} className="flex items-center gap-3 py-1.5">
                  <SkeletonBar className="w-14 h-5" />
                  <SkeletonBar className="flex-1 h-7" />
                  <SkeletonBar className="w-14 h-7 rounded-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Standings skeleton
export const StandingsSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {[1, 2].map(league => (
      <div key={league}>
        <SkeletonBar className="h-8 w-40 mb-6" />
        {[1, 2, 3].map(div => (
          <div key={div} className="mb-6">
            <SkeletonBar className="h-5 w-32 mb-3" />
            <div className="bg-bg-card rounded-xl overflow-hidden border border-border-light">
              {[1, 2, 3, 4, 5].map(row => (
                <div key={row} className="flex items-center gap-3 px-4 py-3 border-b border-border-light/50 last:border-0">
                  <SkeletonBar className="w-6 h-6 rounded" />
                  <SkeletonBar className="h-4 w-36" />
                  <div className="flex-1" />
                  {[1, 2, 3, 4].map(col => (
                    <SkeletonBar key={col} className="h-4 w-10" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// Team Card skeleton
export const TeamCardSkeleton = () => (
  <div
    className="relative bg-bg-card rounded-2xl overflow-hidden shadow-theme-xl theme-transition"
    style={{ minWidth: '900px' }}
  >
    <div className="relative flex">
      {/* Left Panel */}
      <div className="w-80 p-6 flex flex-col bg-bg-elevated border-r border-border-light">
        <SkeletonBar className="w-20 h-20 rounded-lg mb-4" />
        <SkeletonBar className="h-8 w-48 mb-2" />
        <SkeletonBar className="h-5 w-32 mb-4" />
        <SkeletonBar className="h-6 w-28 rounded-full mb-4" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <SkeletonBar key={i} className="h-7 w-16 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 p-6">
        <SkeletonBar className="h-6 w-40 mb-6" />
        {[1, 2, 3, 4].map(cat => (
          <div key={cat} className="mb-5">
            <SkeletonBar className="h-3 w-24 mb-3" />
            {[1, 2, 3].map(bar => (
              <div key={bar} className="flex items-center gap-3 py-1.5">
                <SkeletonBar className="w-14 h-5" />
                <SkeletonBar className="flex-1 h-7" />
                <SkeletonBar className="w-14 h-7 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default { PlayerCardSkeleton, StandingsSkeleton, TeamCardSkeleton };
