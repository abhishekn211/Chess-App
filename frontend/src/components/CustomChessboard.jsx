// CustomChessboard.js

import React, { useState, useEffect } from 'react';

const CustomChessboard = ({ game, boardOrientation, onMove }) => {
    const [board, setBoard] = useState(game.board());
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    
    useEffect(() => {
        setBoard(game.board());
    }, [game]);

    const unicodePieces = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
        P: "♟", R: "♜", N: "♞", B: "♝", Q: "♛", K: "♚",
    };

    const clearSelection = () => {
        setSelectedSquare(null);
        setLegalMoves([]);
    };

    // +++ REPLACED with improved logic +++
    const handleSquareClick = (squareId, clickedPiece) => {
        // If a piece is already selected...
        if (selectedSquare) {
            const isLegalMove = legalMoves.find(move => move.to === squareId);
            // Case 1: The new click is a valid move for the selected piece.
            if (isLegalMove) {
                onMove(selectedSquare, squareId);
                clearSelection();
                return;
            }
        }

        // Case 2: The new click is on another one of your own pieces.
        // This will "switch" the selection to the new piece.
        if (clickedPiece && clickedPiece.color === game.turn() && clickedPiece.color === boardOrientation[0]) {
            const moves = game.moves({ square: squareId, verbose: true });
            setSelectedSquare(squareId);
            setLegalMoves(moves);
        } 
        // Case 3: The click is on an empty square or an opponent's piece (and not a legal move).
        else {
            clearSelection();
        }
    };

    const handleDragStart = (e, piece, from) => {
        clearSelection();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ piece, from }));
    };

    const handleDrop = (e, to) => {
        e.preventDefault();
        const fromData = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (fromData) {
            onMove(fromData.from, to);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const boardToRender = boardOrientation === 'white' ? board : board.map(row => [...row].reverse()).reverse();

    return (
        <div className="w-full h-full">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {boardToRender.map((row, i) =>
                    row.map((sq, j) => {
                        const rank = boardOrientation === 'white' ? 8 - i : i + 1;
                        const fileIndex = boardOrientation === 'white' ? j : 7 - j;
                        const file = String.fromCharCode(97 + fileIndex);
                        const squareId = `${file}${rank}`;
                        
                        const isLight = (i + j) % 2 === 0;
                        const pieceSymbol = sq ? (sq.color === 'w' ? sq.type.toUpperCase() : sq.type) : null;
                        
                        const isDraggable = sq && game.turn() === sq.color && boardOrientation[0] === sq.color;
                        
                        const legalMove = legalMoves.find(move => move.to === squareId);

                        return (
                            <div
                                key={squareId}
                                onClick={() => handleSquareClick(squareId, sq)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, squareId)}
                                className={`relative flex items-center justify-center ${
                                    isLight ? "bg-[#f0d9b5]" : "bg-[#b58863]"
                                }`}
                            >
                                {selectedSquare === squareId && (
                                    <div className="absolute inset-0 bg-green-500/40"></div>
                                )}

                                {sq && (
                                    <div
                                        draggable={isDraggable}
                                        onDragStart={(e) => handleDragStart(e, sq, squareId)}
                                        className={`relative text-4xl md:text-5xl transition-transform duration-100 z-10 ${
                                            isDraggable ? 'cursor-grab hover:scale-110' : 'cursor-not-allowed'
                                        }`}
                                        style={{ color: sq.color === 'w' ? '#FFFFFF' : '#000000' }}
                                    >
                                        {unicodePieces[pieceSymbol]}
                                    </div>
                                )}

                                {legalMove && (
                                    <div className="absolute w-full h-full flex items-center justify-center pointer-events-none z-20">
                                        {/* +++ UPDATED to use .captured instead of deprecated .flags +++ */}
                                        {legalMove.captured ? (
                                            <div className="w-full h-full border-[6px] border-gray-900/25 rounded-sm"></div>
                                        ) : (
                                            <div className="w-1/3 h-1/3 rounded-full bg-gray-900/25"></div>
                                        )}
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