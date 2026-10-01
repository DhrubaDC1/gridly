import { adaptPiece, adaptTray } from '../adapter';

describe('Piece adapter', () => {
  test('adaptPiece returns null for null or invalid input', () => {
    expect(adaptPiece(null)).toBeNull();
    expect(adaptPiece(undefined)).toBeNull();
    expect(adaptPiece({})).toBeNull();
    expect(adaptPiece({ id: '' })).toBeNull();
    expect(adaptPiece('not-an-object')).toBeNull();
  });

  test('adaptPiece returns null for unknown piece id', () => {
    expect(adaptPiece({ id: 'nonexistent_shape_123', color: 1 })).toBeNull();
  });

  test('adaptPiece looks up cells from catalog by piece id', () => {
    const adapted = adaptPiece({ id: 'line_1x3', color: 2 });
    expect(adapted).toEqual({
      id: 'line_1x3',
      color: 2,
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
    });
  });

  test('adaptPiece handles multi-dimensional shapes (e.g. square_2x2, t_0)', () => {
    const adaptedSquare = adaptPiece({ id: 'square_2x2', color: 0 });
    expect(adaptedSquare).toEqual({
      id: 'square_2x2',
      color: 0,
      cells: [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ],
    });

    const adaptedT = adaptPiece({ id: 't_0', color: 4 });
    expect(adaptedT).toEqual({
      id: 't_0',
      color: 4,
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
      ],
    });
  });

  test('adaptPiece preserves cells if pieceRef already has custom cells and not in catalog', () => {
    const custom = {
      id: 'custom_piece',
      color: 5,
      cells: [
        [0, 0],
        [1, 1],
      ],
    };
    expect(adaptPiece(custom)).toEqual(custom);
  });

  test('adaptTray returns [null, null, null] for null or non-array input', () => {
    expect(adaptTray(null)).toEqual([null, null, null]);
    expect(adaptTray(undefined)).toEqual([null, null, null]);
    expect(adaptTray('invalid')).toEqual([null, null, null]);
  });

  test('adaptTray converts an array of piece refs into adapted pieces and preserves nulls', () => {
    const tray = [
      { id: 'line_1x1', color: 1 },
      null,
      { id: 'line_2x1', color: 3 },
    ];
    const adapted = adaptTray(tray);
    expect(adapted).toEqual([
      { id: 'line_1x1', color: 1, cells: [[0, 0]] },
      null,
      {
        id: 'line_2x1',
        color: 3,
        cells: [
          [0, 0],
          [1, 0],
        ],
      },
    ]);
  });
});
