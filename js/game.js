document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const status = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    const scoreX = document.getElementById('scoreX');
    const scoreO = document.getElementById('scoreO');
    const aiMode = document.getElementById('aiMode');
    const aiStatus = document.getElementById('aiStatus');

    let currentPlayer = 'X';
    let isAIEnabled = false;
    let isAIThinking = false;
    let gameBoard = Array(9).fill('');
    let gameActive = true;
    let scores = { X: 0, O: 0 };
    let moveHistory = { X: [], O: [] };
    const MAX_PIECES = 3;

    const winningCombos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    // Position values for strategic importance
    const positionValues = [
        3, 2, 3, // Corners and edges have different strategic values
        2, 4, 2, // Center has highest value
        3, 2, 3
    ];

    // Function to evaluate board state for a player
    const evaluateBoard = (player) => {
        let score = 0;
        const opponent = player === 'O' ? 'X' : 'O';

        // Check for immediate win opportunities
        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            const boardPositions = [gameBoard[a], gameBoard[b], gameBoard[c]];
            const playerPieces = boardPositions.filter(cell => cell === player).length;
            const opponentPieces = boardPositions.filter(cell => cell === opponent).length;

            if (playerPieces === 2 && opponentPieces === 0) score += 10;
            if (opponentPieces === 2 && playerPieces === 0) score -= 8;
        }

        // Add position-based scoring
        gameBoard.forEach((cell, index) => {
            if (cell === player) {
                score += positionValues[index];
            } else if (cell === opponent) {
                score -= positionValues[index];
            }
        });

        return score;
    };

    const updateRemovalIndicator = () => {
        // Clear all indicators
        cells.forEach(cell => {
            cell.classList.remove('piece-next-remove');
            cell.classList.remove('piece');
        });

        // Add piece class to all occupied cells
        gameBoard.forEach((value, index) => {
            if (value) {
                cells[index].classList.add('piece');
            }
        });

        // Show indicator for current player's oldest piece if they have max pieces
        if (moveHistory[currentPlayer].length === MAX_PIECES) {
            const oldestMove = moveHistory[currentPlayer][0];
            cells[oldestMove].classList.add('piece-next-remove');
        }
    };

    const removeOldestPiece = (player) => {
        const oldestMove = moveHistory[player][0];
        const cell = cells[oldestMove];
        gameBoard[oldestMove] = '';
        cell.textContent = '';
        cell.className = 'cell w-full h-24 bg-white rounded-lg shadow-md text-4xl font-bold hover:bg-gray-50 transition-colors';
        moveHistory[player].shift();
        updateRemovalIndicator();
    };

    const checkWinner = () => {
        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
                highlightWinningCombo(combo);
                return gameBoard[a];
            }
        }
        return null;
    };

    const highlightWinningCombo = (combo) => {
        combo.forEach(index => {
            cells[index].classList.add(
                currentPlayer === 'X' ? 'text-blue-600' : 'text-red-600',
                'bg-gray-100'
            );
        });
    };

    const evaluateMove = (index) => {
        let score = 0;
        const originalValue = gameBoard[index];
        const player = 'O';
        const opponent = 'X';

        // Simulate the move
        gameBoard[index] = player;

        // Base position value
        score += positionValues[index] * 2;

        // Evaluate threats and defenses
        for (const combo of winningCombos) {
            if (combo.includes(index)) {
                const others = combo.filter(pos => pos !== index);
                const ownPieces = others.filter(pos => gameBoard[pos] === player).length;
                const opponentPieces = others.filter(pos => gameBoard[pos] === opponent).length;

                // Weight for creating winning threats
                score += ownPieces * 6;

                // Defensive bonus for blocking opponent threats
                if (opponentPieces === 1) score += 4;
            }
        }

        // Consider piece removal impact
        if (moveHistory[player].length >= MAX_PIECES - 1) {
            const oldestPieceIndex = moveHistory[player][0];
            if (oldestPieceIndex !== undefined && positionValues[oldestPieceIndex] >= 3) {
                score -= 4; // Penalty for losing strategic positions
            }
        }

        // Restore the original board state
        gameBoard[index] = originalValue;
        return score;
    };

    const getAIMove = () => {
        // Check for immediate winning move
        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            const boardPositions = [gameBoard[a], gameBoard[b], gameBoard[c]];
            const ownPieces = boardPositions.filter(cell => cell === 'O').length;
            const empty = boardPositions.filter(cell => cell === '').length;

            if (ownPieces === 2 && empty === 1) {
                return combo[boardPositions.indexOf('')];
            }
        }

        // Block opponent's immediate win
        for (const combo of winningCombos) {
            const [a, b, c] = combo;
            const boardPositions = [gameBoard[a], gameBoard[b], gameBoard[c]];
            const opponentPieces = boardPositions.filter(cell => cell === 'X').length;
            const empty = boardPositions.filter(cell => cell === '').length;

            if (opponentPieces === 2 && empty === 1) {
                return combo[boardPositions.indexOf('')];
            }
        }

        // Enhanced move evaluation
        const possibleMoves = [];
        gameBoard.forEach((cell, index) => {
            if (cell === '') {
                const moveScore = evaluateMove(index);
                possibleMoves.push({
                    index,
                    score: moveScore + evaluateBoard('O')
                });
            }
        });

        // Sort moves by score
        possibleMoves.sort((a, b) => b.score - a.score);

        // Strategic randomization based on score differences
        const topMoves = [];
        const bestScore = possibleMoves[0]?.score || 0;

        // Only consider moves within 30% of the best score
        for (const move of possibleMoves) {
            if (move.score >= bestScore * 0.7) {
                topMoves.push(move);
            } else {
                break;
            }
        }

        // Select from top moves with weighted randomization
        const randomIndex = Math.floor(Math.random() * Math.min(3, topMoves.length));
        return topMoves[randomIndex].index;
    };

    const handleClick = (index) => {
        if (!gameActive || isAIThinking) return;

        // Only allow moves to empty positions
        if (gameBoard[index]) return;

        // Remove oldest piece if player has reached the limit
        if (moveHistory[currentPlayer].length >= MAX_PIECES) {
            removeOldestPiece(currentPlayer);
        }

        // Make the move
        gameBoard[index] = currentPlayer;
        cells[index].textContent = currentPlayer;
        cells[index].className = 'cell w-full h-24 bg-white rounded-lg shadow-md text-4xl font-bold hover:bg-gray-50 transition-colors';
        cells[index].classList.add(currentPlayer === 'X' ? 'text-blue-600' : 'text-red-600');
        moveHistory[currentPlayer].push(index);
        updateRemovalIndicator();

        const result = checkWinner();
        if (result) {
            handleGameEnd(result);
            return;
        }

        // AI's move
        if (isAIEnabled && currentPlayer === 'X') {
            currentPlayer = 'O';
            status.textContent = "AI's Turn";
            isAIThinking = true;
            aiStatus.classList.remove('hidden');

            setTimeout(() => {
                const aiMove = getAIMove();
                if (aiMove !== -1) {
                    // Remove AI's oldest piece if at limit
                    if (moveHistory['O'].length >= MAX_PIECES) {
                        removeOldestPiece('O');
                    }

                    gameBoard[aiMove] = 'O';
                    cells[aiMove].textContent = 'O';
                    cells[aiMove].className = 'cell w-full h-24 bg-white rounded-lg shadow-md text-4xl font-bold hover:bg-gray-50 transition-colors text-red-600';
                    moveHistory['O'].push(aiMove);

                    const aiResult = checkWinner();
                    if (aiResult) {
                        handleGameEnd(aiResult);
                    } else {
                        currentPlayer = 'X';
                        status.textContent = "Player X's Turn";
                        updateRemovalIndicator();
                    }
                }

                isAIThinking = false;
                aiStatus.classList.add('hidden');
            }, 500);
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            status.textContent = `Player ${currentPlayer}'s Turn`;
            updateRemovalIndicator();
        }
    };

    const updateScores = () => {
        scoreX.textContent = scores.X;
        scoreO.textContent = scores.O;
    };

    const celebrateWin = (winner) => {
        const colors = winner === 'X' ? ['#3B82F6', '#60A5FA', '#93C5FD'] : ['#EF4444', '#F87171', '#FCA5A5'];
        const end = Date.now() + 1000; // Celebration duration: 1 second

        // Create multiple bursts of confetti
        const frame = () => {
            confetti({
                particleCount: 30,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.8 },
                colors: colors
            });
            confetti({
                particleCount: 30,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.8 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    };

    const handleGameEnd = (result) => {
        gameActive = false;
        if (result === 'draw') {
            status.textContent = "It's a Draw!";
        } else {
            status.textContent = result === 'X' ? 'Player X Wins!' : (isAIEnabled ? 'AI Wins!' : 'Player O Wins!');
            scores[result]++;
            updateScores();
            celebrateWin(result);
        }
        // Clear removal indicators
        cells.forEach(cell => {
            cell.classList.remove('piece-next-remove');
            cell.classList.remove('piece');
        });
    };

    const resetGame = () => {
        gameBoard = Array(9).fill('');
        gameActive = true;
        currentPlayer = 'X';
        isAIThinking = false;
        aiStatus.classList.add('hidden');
        moveHistory = { X: [], O: [] };
        status.textContent = "Player X's Turn";

        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell w-full h-24 bg-white rounded-lg shadow-md text-4xl font-bold hover:bg-gray-50 transition-colors';
        });
    };

    // AI mode toggle handler
    aiMode.addEventListener('change', (e) => {
        isAIEnabled = e.target.checked;
        resetGame();
    });

    // Event Listeners
    cells.forEach((cell, index) => {
        cell.addEventListener('click', () => handleClick(index));
    });

    resetBtn.addEventListener('click', resetGame);
});
