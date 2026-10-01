import { playFeedbackForEvents } from '../eventsFeedback';
import * as feedbackService from '../../services/feedback';

jest.mock('../../services/feedback', () => ({
  onPickup: jest.fn(),
  onPlace: jest.fn(),
  onClear: jest.fn(),
  onPerfectClear: jest.fn(),
  onAchievement: jest.fn(),
  onGameOver: jest.fn(),
}));

describe('playFeedbackForEvents (event-to-feedback mapping)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls onPlace when a placed event is present', () => {
    const events = [
      {
        type: 'placed',
        pieceId: 'line_1x2',
        cells: [0, 1],
        color: 2,
      },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onPlace).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).not.toHaveBeenCalled();
    expect(feedbackService.onPerfectClear).not.toHaveBeenCalled();
    expect(feedbackService.onGameOver).not.toHaveBeenCalled();
  });

  test('calls onClear with linesCount and combo count from combo event', () => {
    const events = [
      {
        type: 'placed',
        pieceId: 'line_1x1',
        cells: [0],
        color: 1,
      },
      {
        type: 'cleared',
        linesCount: 2,
        rows: [0],
        cols: [1],
      },
      {
        type: 'combo',
        count: 4,
        multiplier: 2.5,
      },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onPlace).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).toHaveBeenCalledWith(2, 4);
  });

  test('calls onClear with default combo 1 if no combo event is present', () => {
    const events = [
      {
        type: 'cleared',
        linesCount: 1,
        rows: [3],
        cols: [],
      },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onClear).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).toHaveBeenCalledWith(1, 1);
  });

  test('calculates linesCount from rows and cols if linesCount is omitted', () => {
    const events = [
      {
        type: 'cleared',
        rows: [1, 2],
        cols: [3],
      },
      {
        type: 'combo',
        count: 2,
      },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onClear).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).toHaveBeenCalledWith(3, 2);
  });

  test('calls onPerfectClear when perfectClear event is present', () => {
    const events = [
      { type: 'placed' },
      { type: 'cleared', linesCount: 1 },
      { type: 'combo', count: 1 },
      { type: 'perfectClear' },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onPlace).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).toHaveBeenCalledWith(1, 1);
    expect(feedbackService.onPerfectClear).toHaveBeenCalledTimes(1);
  });

  test('calls onGameOver when gameOver event is present', () => {
    const events = [
      { type: 'placed' },
      { type: 'gameOver', reason: 'noMoves' },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onPlace).toHaveBeenCalledTimes(1);
    expect(feedbackService.onGameOver).toHaveBeenCalledTimes(1);
  });

  test('handles multiple events including scored and trayRefilled gracefully', () => {
    const events = [
      { type: 'placed', pieceId: 'sq_2x2', cells: [0, 1, 8, 9], color: 3 },
      { type: 'scored', delta: 104, total: 104 },
      { type: 'trayRefilled', pieces: [] },
    ];

    playFeedbackForEvents(events);

    expect(feedbackService.onPlace).toHaveBeenCalledTimes(1);
    expect(feedbackService.onClear).not.toHaveBeenCalled();
    expect(feedbackService.onPerfectClear).not.toHaveBeenCalled();
    expect(feedbackService.onGameOver).not.toHaveBeenCalled();
  });

  test('supports dependency-injected mock feedback object', () => {
    const customFeedback = {
      onPlace: jest.fn(),
      onClear: jest.fn(),
      onPerfectClear: jest.fn(),
      onGameOver: jest.fn(),
    };

    const events = [
      { type: 'placed' },
      { type: 'cleared', linesCount: 3 },
      { type: 'combo', count: 5 },
      { type: 'perfectClear' },
      { type: 'gameOver' },
    ];

    playFeedbackForEvents(events, customFeedback);

    expect(customFeedback.onPlace).toHaveBeenCalledTimes(1);
    expect(customFeedback.onClear).toHaveBeenCalledWith(3, 5);
    expect(customFeedback.onPerfectClear).toHaveBeenCalledTimes(1);
    expect(customFeedback.onGameOver).toHaveBeenCalledTimes(1);

    expect(feedbackService.onPlace).not.toHaveBeenCalled();
  });

  test('does nothing safely for null, undefined, or empty events array', () => {
    expect(() => playFeedbackForEvents(null)).not.toThrow();
    expect(() => playFeedbackForEvents(undefined)).not.toThrow();
    expect(() => playFeedbackForEvents([])).not.toThrow();
    expect(feedbackService.onPlace).not.toHaveBeenCalled();
    expect(feedbackService.onClear).not.toHaveBeenCalled();
  });
});
