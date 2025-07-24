import React, { useState, useEffect } from 'react';

const CustomChessboard = ({ game, boardOrientation, onMove }) => {
    // We use a state to force re-render when the board changes.
    const [board, setBoard] = useState(game.board());

    useEffect(() => {
        setBoard(game.board());
    }, [game]);

    const [draggedPiece, setDraggedPiece] = useState(null);

    const handleDragStart = (e, piece, from) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedPiece({ piece, from });
    };

    const handleDrop = (e, to) => {
        e.preventDefault();
        if (draggedPiece) {
            onMove(draggedPiece.from, to);
            setDraggedPiece(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const unicodePieces = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
        P: "♟", R: "♜", N: "♞", B: "♝", Q: "♛", K: "♚",
    };

    const boardToRender = boardOrientation === 'white' ? board : board.map(row => [...row].reverse()).reverse();

    return (
        <div className="w-full h-full">
  <div className="grid grid-cols-8 grid-rows-8 w-full h-full ">

            {boardToRender.map((row, i) =>
                row.map((sq, j) => {
                    const rank = boardOrientation === 'white' ? 8 - i : i + 1;
                    const fileIndex = boardOrientation === 'white' ? j : 7 - j;
                    const file = String.fromCharCode(97 + fileIndex);
                    const squareId = `${file}${rank}`;
                    
                    const isLight = (i + j) % 2 === 0;
                    const pieceSymbol = sq ? (sq.color === 'w' ? sq.type.toUpperCase() : sq.type) : null;
                    
                    const isDraggable = 
                        sq &&
                        game.turn() === sq.color &&
                        boardOrientation[0] === sq.color;

                    return (
                        <div
                            key={squareId}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, squareId)}
                            className={`flex items-center justify-center ${isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]"}`}
                        >
                            {sq && (
                                <div
                                    draggable={isDraggable}
                                    onDragStart={(e) => handleDragStart(e, sq, squareId)}
                                    className={`text-4xl md:text-5xl cursor-grab transition-transform duration-100 ${isDraggable ? 'hover:scale-110' : 'cursor-not-allowed'}`}
                                    style={{ color: sq.color === 'w' ? '#FFFFFF' : '#000000' }}
                                >
                                    {unicodePieces[pieceSymbol]}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
        </div>
    );
};

export default CustomChessboard;