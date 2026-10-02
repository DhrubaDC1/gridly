import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Redirect } from 'expo-router';
import GameScreen from '../../src/ui/GameScreen';
import { useProgress } from '../../src/store/useProgress';
import { canOpenLevel } from '../../src/game/adventureProgress';
import levelsData from '../../assets/levels/levels.json';

export { canOpenLevel };

/**
 * Screen rendering GameScreen in Adventure mode for a given level route param.
 * Guards against locked or nonexistent levels via deep links.
 */
export default function AdventureLevelScreen() {
  const { level } = useLocalSearchParams();
  const [hydrated, setHydrated] = useState(() => {
    return typeof useProgress.persist?.hasHydrated === 'function'
      ? useProgress.persist.hasHydrated()
      : true;
  });

  useEffect(() => {
    if (typeof useProgress.persist?.hasHydrated !== 'function') {
      return;
    }
    if (useProgress.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useProgress.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  const unlocked = useProgress((state) => state.adventure?.unlocked ?? 1);

  if (!hydrated) {
    return null;
  }

  const rawLevel = Array.isArray(level) ? level[0] : level;
  const levelId =
    typeof rawLevel === 'number'
      ? rawLevel
      : typeof rawLevel === 'string' && /^\d+$/.test(rawLevel.trim())
      ? parseInt(rawLevel.trim(), 10)
      : NaN;

  if (!canOpenLevel(levelId, unlocked, levelsData.length)) {
    return <Redirect href="/adventure" />;
  }

  return (
    <GameScreen
      key={`adventure-level-${levelId}`}
      mode="adventure"
      level={levelId}
      title={`Level ${levelId}`}
    />
  );
}
