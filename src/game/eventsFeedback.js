import * as defaultFeedback from '../services/feedback';

/**
 * Maps engine game events to feedback service calls (haptics and audio).
 *
 * @param {Array<{ type: string, [key: string]: any }>} events - Array of engine events.
 * @param {typeof defaultFeedback} [feedback=defaultFeedback] - Feedback service functions.
 */
export function playFeedbackForEvents(events, feedback = defaultFeedback) {
  if (!Array.isArray(events) || events.length === 0) return;

  const fb = feedback || defaultFeedback;

  // Extract combo from combo event if one occurred in this step
  let combo = 1;
  for (let i = 0; i < events.length; i++) {
    if (events[i]?.type === 'combo' && typeof events[i].count === 'number') {
      combo = events[i].count;
      break;
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event || !event.type) continue;

    switch (event.type) {
      case 'placed':
        fb.onPlace?.();
        break;
      case 'cleared': {
        const linesCount =
          typeof event.linesCount === 'number'
            ? event.linesCount
            : (event.rows?.length || 0) + (event.cols?.length || 0) || 1;
        fb.onClear?.(linesCount, combo);
        break;
      }
      case 'perfectClear':
        fb.onPerfectClear?.();
        break;
      case 'gameOver':
        fb.onGameOver?.();
        break;
      default:
        break;
    }
  }
}

export {
  playFeedbackForEvents as dispatchFeedback,
  playFeedbackForEvents as handleEventsFeedback,
};
export default playFeedbackForEvents;
