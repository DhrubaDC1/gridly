import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettings } from '../store/useSettings';

/**
 * Returns whether reduce motion is active, respecting useSettings and system preferences.
 *
 * @returns {boolean}
 */
export function useReduceMotion() {
  const setting = useSettings((state) => state.reduceMotion);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) {
          setSystemReduceMotion(Boolean(enabled));
        }
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => {
        if (mounted) {
          setSystemReduceMotion(Boolean(enabled));
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return systemReduceMotion;
}

export default useReduceMotion;
