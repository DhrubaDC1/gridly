@AGENTS.md

## Notes for Claude Code

- `AGENTS.md` is the source of truth; keep it in sync when code changes the spec.
- Device checks run on Android over adb with Expo Go. Navigate with deep links
  (`adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:<port>/--/stats" host.exp.exponent`)
  rather than blind taps. If you must tap, first confirm Expo Go is in the foreground
  (`adb shell dumpsys activity activities | grep topResumedActivity`), so taps never land in other apps.
- The round gear with a "Tools" label in device screenshots is Expo Go's dev menu, not app UI.
