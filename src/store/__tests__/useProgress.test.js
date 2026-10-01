import { useProgress } from '../useProgress';
import levelsData from '../../../assets/levels/levels.json';

describe('useProgress store', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress();
  });

  describe('unlockAllLevels store action', () => {
    test('unlockAllLevels() sets adventure.unlocked to total number of levels in levels.json', () => {
      expect(useProgress.getState().adventure.unlocked).toBe(1);
      expect(levelsData.length).toBeGreaterThan(0);

      useProgress.getState().unlockAllLevels();

      expect(useProgress.getState().adventure.unlocked).toBe(levelsData.length);
    });

    test('unlockAllLevels(customCount) sets adventure.unlocked to specified count', () => {
      useProgress.getState().unlockAllLevels(50);
      expect(useProgress.getState().adventure.unlocked).toBe(50);
    });

    test('unlockAllLevels preserves existing stars, best scores, and updates updatedAt', () => {
      useProgress.getState().setAdventureProgress({
        levelId: 1,
        stars: 3,
        score: 2500,
      });

      const beforeIso = useProgress.getState().updatedAt;

      useProgress.getState().unlockAllLevels();

      const progress = useProgress.getState();
      expect(progress.adventure.unlocked).toBe(levelsData.length);
      expect(progress.adventure.stars[1]).toBe(3);
      expect(progress.adventure.best[1]).toBe(2500);
      expect(new Date(progress.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeIso).getTime()
      );
    });
  });
});
