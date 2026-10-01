import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import GameScreen from '../../src/ui/GameScreen';

/**
 * Screen rendering GameScreen in Adventure mode for a given level route param.
 */
export default function AdventureLevelScreen() {
  const { level } = useLocalSearchParams();
  const levelId = parseInt(level, 10) || 1;

  return (
    <GameScreen
      key={`adventure-level-${levelId}`}
      mode="adventure"
      level={levelId}
      title={`Level ${levelId}`}
    />
  );
}
