import { PIECES, getPiece, pieceSize } from '../pieces';

describe('Piece Catalog (§5)', () => {
  it('contains exactly 37 pieces matching the catalog categories', () => {
    expect(PIECES).toHaveLength(37);

    const linePieces = PIECES.filter(p => p.id.startsWith('line_'));
    const squarePieces = PIECES.filter(p => p.id.startsWith('square_'));
    const rectPieces = PIECES.filter(p => p.id.startsWith('rect_'));
    const smallLPieces = PIECES.filter(p => p.id.startsWith('small_l_'));
    const bigLPieces = PIECES.filter(p => p.id.startsWith('big_l_'));
    const lTetrominoes = PIECES.filter(p => p.id.startsWith('l_tetromino_'));
    const jTetrominoes = PIECES.filter(p => p.id.startsWith('j_tetromino_'));
    const tPieces = PIECES.filter(p => p.id.startsWith('t_'));
    const sPieces = PIECES.filter(p => p.id.startsWith('s_'));
    const zPieces = PIECES.filter(p => p.id.startsWith('z_'));

    expect(linePieces).toHaveLength(9);
    expect(squarePieces).toHaveLength(2);
    expect(rectPieces).toHaveLength(2);
    expect(smallLPieces).toHaveLength(4);
    expect(bigLPieces).toHaveLength(4);
    expect(lTetrominoes).toHaveLength(4);
    expect(jTetrominoes).toHaveLength(4);
    expect(tPieces).toHaveLength(4);
    expect(sPieces).toHaveLength(2);
    expect(zPieces).toHaveLength(2);
  });

  it('has unique IDs for every piece', () => {
    const ids = PIECES.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(PIECES.length);
  });

  it('normalizes every piece so min row and min col are 0', () => {
    for (const piece of PIECES) {
      expect(piece.cells.length).toBeGreaterThan(0);

      const rows = piece.cells.map(([r]) => r);
      const cols = piece.cells.map(([, c]) => c);

      const minRow = Math.min(...rows);
      const minCol = Math.min(...cols);

      expect(minRow).toBe(0);
      expect(minCol).toBe(0);

      // Coordinates must be non-negative integers
      for (const [r, c] of piece.cells) {
        expect(Number.isInteger(r)).toBe(true);
        expect(Number.isInteger(c)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(c).toBeGreaterThanOrEqual(0);
      }

      // No duplicate cells in a piece
      const coordSet = new Set(piece.cells.map(([r, c]) => `${r},${c}`));
      expect(coordSet.size).toBe(piece.cells.length);

      // Has positive weight
      expect(piece.weight).toBeGreaterThan(0);
    }
  });

  it('retrieves pieces correctly via getPiece(id)', () => {
    const p1 = getPiece('line_1x1');
    expect(p1).toBeDefined();
    expect(p1.id).toBe('line_1x1');
    expect(p1.cells).toEqual([[0, 0]]);

    const pSquare = getPiece('square_2x2');
    expect(pSquare).toBeDefined();
    expect(pSquare.cells).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);

    expect(getPiece('non_existent')).toBeNull();
  });

  it('computes accurate pieceSize { rows, cols }', () => {
    expect(pieceSize(getPiece('line_1x1'))).toEqual({ rows: 1, cols: 1 });
    expect(pieceSize(getPiece('line_1x5'))).toEqual({ rows: 1, cols: 5 });
    expect(pieceSize(getPiece('line_5x1'))).toEqual({ rows: 5, cols: 1 });
    expect(pieceSize(getPiece('square_2x2'))).toEqual({ rows: 2, cols: 2 });
    expect(pieceSize(getPiece('square_3x3'))).toEqual({ rows: 3, cols: 3 });
    expect(pieceSize(getPiece('rect_2x3'))).toEqual({ rows: 2, cols: 3 });
    expect(pieceSize(getPiece('rect_3x2'))).toEqual({ rows: 3, cols: 2 });
    expect(pieceSize(getPiece('l_tetromino_0'))).toEqual({ rows: 3, cols: 2 });
    expect(pieceSize(getPiece('l_tetromino_90'))).toEqual({ rows: 2, cols: 3 });

    expect(pieceSize(null)).toEqual({ rows: 0, cols: 0 });
    expect(pieceSize({ cells: [] })).toEqual({ rows: 0, cols: 0 });
  });
});
