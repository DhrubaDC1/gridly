import {
  createToastQueueState,
  enqueueToast,
  advanceToast,
  ToastQueue,
} from '../toastQueue';
import { useToast } from '../../store/useToast';

describe('toastQueue pure ordering', () => {
  test('initial state has null current and empty queue', () => {
    const state = createToastQueueState();
    expect(state.current).toBeNull();
    expect(state.queue).toEqual([]);
  });

  test('first enqueued item becomes current immediately', () => {
    const item1 = { id: '1', title: 'Achievement unlocked', message: 'First clear' };
    const state = enqueueToast(createToastQueueState(), item1);

    expect(state.current).toEqual(item1);
    expect(state.queue).toEqual([]);
  });

  test('subsequent enqueued items are appended to queue in FIFO order', () => {
    const item1 = { id: '1', message: 'First' };
    const item2 = { id: '2', message: 'Second' };
    const item3 = { id: '3', message: 'Third' };

    let state = enqueueToast(createToastQueueState(), item1);
    state = enqueueToast(state, item2);
    state = enqueueToast(state, item3);

    expect(state.current).toEqual(item1);
    expect(state.queue).toEqual([item2, item3]);
  });

  test('advanceToast promotes the next queued item to current in FIFO order', () => {
    const item1 = { id: '1', message: 'First' };
    const item2 = { id: '2', message: 'Second' };
    const item3 = { id: '3', message: 'Third' };

    let state = enqueueToast(createToastQueueState(), item1);
    state = enqueueToast(state, item2);
    state = enqueueToast(state, item3);

    // Advance 1: item2 becomes current
    state = advanceToast(state);
    expect(state.current).toEqual(item2);
    expect(state.queue).toEqual([item3]);

    // Advance 2: item3 becomes current
    state = advanceToast(state);
    expect(state.current).toEqual(item3);
    expect(state.queue).toEqual([]);

    // Advance 3: queue empty, current becomes null
    state = advanceToast(state);
    expect(state.current).toBeNull();
    expect(state.queue).toEqual([]);
  });

  test('advanceToast on empty queue remains null with empty queue', () => {
    const state = createToastQueueState();
    const advanced = advanceToast(state);
    expect(advanced.current).toBeNull();
    expect(advanced.queue).toEqual([]);
  });

  test('enqueueToast does not mutate previous state object', () => {
    const s1 = createToastQueueState();
    const item1 = { id: '1', message: 'A' };
    const s2 = enqueueToast(s1, item1);

    expect(s1.current).toBeNull();
    expect(s1.queue).toEqual([]);
    expect(s2.current).toEqual(item1);

    const item2 = { id: '2', message: 'B' };
    const s3 = enqueueToast(s2, item2);

    expect(s2.queue).toEqual([]);
    expect(s3.queue).toEqual([item2]);
  });

  test('advanceToast does not mutate previous state queue array', () => {
    const item1 = { id: '1', message: 'A' };
    const item2 = { id: '2', message: 'B' };

    let state = enqueueToast(createToastQueueState(), item1);
    state = enqueueToast(state, item2);

    const queueBefore = [...state.queue];
    const nextState = advanceToast(state);

    expect(state.queue).toEqual(queueBefore);
    expect(nextState.current).toEqual(item2);
    expect(nextState.queue).toEqual([]);
  });

  test('ToastQueue class handles operations statefully', () => {
    const q = new ToastQueue();
    expect(q.getCurrent()).toBeNull();
    expect(q.getQueue()).toEqual([]);

    q.enqueue({ id: 'a', message: 'Item A' });
    expect(q.getCurrent().id).toBe('a');
    expect(q.getQueue()).toHaveLength(0);

    q.enqueue({ id: 'b', message: 'Item B' });
    expect(q.getCurrent().id).toBe('a');
    expect(q.getQueue()).toHaveLength(1);
    expect(q.getQueue()[0].id).toBe('b');

    q.advance();
    expect(q.getCurrent().id).toBe('b');
    expect(q.getQueue()).toHaveLength(0);

    q.advance();
    expect(q.getCurrent()).toBeNull();
    expect(q.getQueue()).toHaveLength(0);

    q.enqueue({ id: 'c', message: 'Item C' });
    expect(q.getCurrent().id).toBe('c');

    q.clear();
    expect(q.getCurrent()).toBeNull();
    expect(q.getQueue()).toEqual([]);
  });

  test('useToast zustand store correctly enqueues and resolves achievement names', () => {
    useToast.getState().clearAll();
    expect(useToast.getState().current).toBeNull();

    // Enqueue via achievement ID
    useToast.getState().showAchievementToast('first_clear');
    expect(useToast.getState().current).not.toBeNull();
    expect(useToast.getState().current.title).toBe('Achievement unlocked');
    expect(useToast.getState().current.message).toBe('First clear');
    expect(useToast.getState().current.duration).toBe(2500);

    // Enqueue second achievement
    useToast.getState().showAchievementToast('perfect');
    expect(useToast.getState().queue).toHaveLength(1);
    expect(useToast.getState().queue[0].message).toBe('Clean sweep');

    // Dismiss first
    useToast.getState().dismissCurrent();
    expect(useToast.getState().current.message).toBe('Clean sweep');
    expect(useToast.getState().queue).toHaveLength(0);

    // Dismiss second
    useToast.getState().dismissCurrent();
    expect(useToast.getState().current).toBeNull();
  });
});
