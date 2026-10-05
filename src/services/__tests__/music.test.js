import { AppState } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { startBackgroundMusic, setMusicTrack, trackForPath } from '../music';
import { useSettings } from '../../store/useSettings';

function fakePlayer(source) {
  return { source, play: jest.fn(), pause: jest.fn(), remove: jest.fn() };
}

describe('background music', () => {
  let onAppState;
  let stop;

  beforeEach(async () => {
    jest.clearAllMocks();
    createAudioPlayer.mockImplementation(fakePlayer);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, cb) => {
      onAppState = cb;
      return { remove: jest.fn() };
    });
    await useSettings.persist.rehydrate();
    useSettings.getState().resetSettings();
    setMusicTrack('home');
  });

  afterEach(() => stop?.());

  test('maps routes to tracks', () => {
    expect(trackForPath('/')).toBe('home');
    expect(trackForPath('/classic')).toBe('home');
    expect(trackForPath('/stats')).toBe('home');
    expect(trackForPath('/blitz')).toBe('blitz');
    expect(trackForPath('/adventure')).toBe('adventure');
    expect(trackForPath('/adventure/12')).toBe('adventure');
    expect(trackForPath(null)).toBe('home');
  });

  test('loops one player, follows settings and app lifecycle, never duplicates', () => {
    stop = startBackgroundMusic({ home: 1, blitz: 2 });
    expect(startBackgroundMusic({ home: 1, blitz: 2 })).toBe(stop);
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    const home = createAudioPlayer.mock.results[0].value;
    expect(home.loop).toBe(true);
    expect(home.volume).toBe(0.6);
    expect(home.play).toHaveBeenCalled();

    useSettings.getState().setMusicVolume(0.3);
    expect(home.volume).toBe(0.3);

    home.play.mockClear();
    onAppState('background');
    expect(home.pause).toHaveBeenCalled();
    onAppState('active');
    expect(home.play).toHaveBeenCalled();

    home.pause.mockClear();
    useSettings.getState().setMusic(false);
    expect(home.pause).toHaveBeenCalled();
  });

  test('switching tracks pauses the old one and resumes it on return', () => {
    stop = startBackgroundMusic({ home: 1, blitz: 2 });
    const home = createAudioPlayer.mock.results[0].value;

    setMusicTrack('blitz');
    const blitz = createAudioPlayer.mock.results[1].value;
    expect(blitz.source).toBe(2);
    expect(blitz.loop).toBe(true);
    expect(blitz.play).toHaveBeenCalled();
    expect(home.pause).toHaveBeenCalled();

    home.play.mockClear();
    setMusicTrack('home');
    expect(createAudioPlayer).toHaveBeenCalledTimes(2); // reused, not recreated
    expect(home.play).toHaveBeenCalled();
    expect(blitz.pause).toHaveBeenCalled();

    stop();
    stop = null;
    expect(home.remove).toHaveBeenCalled();
    expect(blitz.remove).toHaveBeenCalled();
  });

  test('a track with no asset stays silent', () => {
    stop = startBackgroundMusic({ home: 1 });
    const home = createAudioPlayer.mock.results[0].value;
    setMusicTrack('adventure');
    expect(home.pause).toHaveBeenCalled();
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
  });
});
