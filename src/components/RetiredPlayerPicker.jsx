// RetiredPlayerPicker — shows clickable season buttons for players with no stats in current season
// v4.10.0 | 2026-02-14

import React from 'react';
import { getPlayerHeadshotUrl } from '../utils/teamData';

const RetiredPlayerPicker = ({ player, seasons, currentSeason, onSelectSeason }) => {
  if (!player || !seasons || seasons.length === 0) return null;

  const headshotUrl = getPlayerHeadshotUrl(player.id);

  // Group seasons by decade for long careers (10+)
  const useDecadeGroups = seasons.length >= 10;
  const decadeGroups = {};
  if (useDecadeGroups) {
    seasons.forEach(year => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      if (!decadeGroups[decade]) decadeGroups[decade] = [];
      decadeGroups[decade].push(year);
    });
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-6 mb-6 animate-fade-in theme-transition">
      {/* Player info header */}
      <div className="flex items-center gap-4 mb-5">
        {headshotUrl && (
          <img
            src={headshotUrl}
            alt={player.fullName}
            className="w-20 h-20 rounded-xl object-cover bg-bg-tertiary"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div>
          <h3 className="font-display text-2xl tracking-wide text-text-primary">
            {player.fullName?.toUpperCase()}
          </h3>
          <p className="text-text-muted text-sm mt-1">
            No {currentSeason} stats available for this player
          </p>
        </div>
      </div>

      {/* Season picker */}
      <div>
        <h4 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          View a season
        </h4>

        {useDecadeGroups ? (
          <div className="space-y-4">
            {Object.entries(decadeGroups).map(([decade, years]) => (
              <div key={decade}>
                <span className="text-xs font-medium text-text-muted mb-2 block">{decade}</span>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {years.map(year => (
                    <button
                      key={year}
                      onClick={() => onSelectSeason(year)}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-accent hover:text-text-inverse border border-border hover:border-accent transition-all theme-transition"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {seasons.map(year => (
              <button
                key={year}
                onClick={() => onSelectSeason(year)}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-bg-tertiary hover:bg-accent hover:text-text-inverse border border-border hover:border-accent transition-all theme-transition"
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RetiredPlayerPicker;
