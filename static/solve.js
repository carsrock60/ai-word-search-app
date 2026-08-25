let puzzleGrid = [];
let puzzleWords = [];
let puzzleLocations = {};
let foundWords = new Set();
let firstTap = null;
let size = 12;

// Fixed Timer State
let elapsedSeconds = 0;
let isPaused = false;
let timerInterval = null;

window.addEventListener('DOMContentLoaded', () => {
    if (!window.SHARED_PAYLOAD) {
        alert("No puzzle loaded. Redirecting to Create page.");
        window.location.href = '/create';
        return;
    }

    // Decode and fetch puzzle
    const decodedStr = decodeURIComponent(atob(window.SHARED_PAYLOAD));
    const data = JSON.parse(decodedStr);
    
    document.getElementById('solve-title').textContent = (data.t || "Custom") + " Puzzle";
    
    fetch('/api/generate-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: data.w, size: data.s || 12 })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.error) throw new Error(resData.error);
        puzzleGrid = resData.grid;
        puzzleWords = resData.words;
        puzzleLocations = resData.locations;
        size = resData.grid.length;
        initGame();
    })
    .catch(() => {
        alert("Failed to load puzzle.");
        window.location.href = '/create';
    });
});

function initGame() {
    renderSolveGrid();
    renderSolveWords();
    updateProgress();
    
    elapsedSeconds = 0;
    isPaused = false;
    document.getElementById('timer').textContent = "00:00";
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (isPaused) return; // Completely skips the increment if paused
    
    elapsedSeconds++;
    let m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    let s = (elapsedSeconds % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById('pause-btn');
    const container = document.getElementById('print-area');
    
    if (isPaused) {
        btn.innerHTML = '▶ Resume';
        btn.classList.add('active');
        container.classList.add('paused-blur');
        // Stop the JS interval completely to save CPU
        clearInterval(timerInterval); 
    } else {
        btn.innerHTML = '⏸ Pause';
        btn.classList.remove('active');
        container.classList.remove('paused-blur');
        // Restart the interval
        timerInterval = setInterval(updateTimer, 1000);
    }
}

// Ensure you clear the SVG lines when rendering the grid!
// Update your renderSolveGrid() function to include this line:
function renderSolveGrid() {
    const container = document.getElementById('solve-grid');
    const svgLines = document.getElementById('solve-lines');
    if (svgLines) svgLines.innerHTML = ''; // Clear previous lines
    
    // ... rest of your existing renderSolveGrid code ...
}

// Add the visual SVG Highlighter Line Function
function drawStrikethrough(coords) {
    const svg = document.getElementById('solve-lines');
    if (!svg) return;

    const start = coords[0];
    const end = coords[coords.length - 1];

    // Using percentages so the lines scale perfectly on phones and desktops!
    const x1 = ((start[1] + 0.5) / size) * 100;
    const y1 = ((start[0] + 0.5) / size) * 100;
    const x2 = ((end[1] + 0.5) / size) * 100;
    const y2 = ((end[0] + 0.5) / size) * 100;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${x1}`);
    line.setAttribute('y1', `${y1}`);
    line.setAttribute('x2', `${x2}`);
    line.setAttribute('y2', `${y2}`);
    
    // Transparent bright green highlighter stroke
    line.setAttribute('stroke', 'rgba(16, 185, 129, 0.45)'); 
    line.setAttribute('stroke-width', `${100 / size * 0.6}`); // 60% of cell width
    line.setAttribute('stroke-linecap', 'round');
    
    svg.appendChild(line);
}
window.addEventListener('DOMContentLoaded', () => {
    try {
        if (window.SHARED_PAYLOAD) {
            // It's a shared link! Decode and fetch the puzzle.
            const decodedStr = decodeURIComponent(atob(window.SHARED_PAYLOAD));
            const data = JSON.parse(decodedStr);
            
            document.getElementById('solve-title').textContent = (data.t || "Shared") + " Puzzle";
            
            fetch('/api/generate-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: data.w, size: data.s || 12 })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData.error) throw new Error(resData.error);
                puzzleGrid = resData.grid;
                puzzleWords = resData.words;
                puzzleLocations = resData.locations;
                size = resData.grid.length;
                initGame();
            })
            .catch(e => {
                alert("Failed to load shared puzzle.");
                window.location.href = '/';
            });
            return;
        }

        // --- Standard LocalStorage Load (Not Shared) ---
        const gridData = localStorage.getItem('wordgen_grid');
        const wordsData = localStorage.getItem('wordgen_words');
        const locData = localStorage.getItem('wordgen_locations');

        if (!gridData || !wordsData || !locData) {
            window.location.href = '/';
            return;
        }

        puzzleGrid = JSON.parse(gridData);
        puzzleWords = JSON.parse(wordsData);
        puzzleLocations = JSON.parse(locData);
        size = puzzleGrid.length;
        initGame();

    } catch (err) {
        window.location.href = '/';
    }
});

function initGame() {
    renderSolveGrid();
    renderSolveWords();
    updateProgress();
    
    startTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

function renderSolveGrid() {
    const container = document.getElementById('solve-grid');
    if (!container) return;

    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    container.innerHTML = '';

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.className = 'solve-cell';
            cell.textContent = puzzleGrid[r][c];
            cell.id = `cell-${r}-${c}`;
            cell.addEventListener('click', () => handleCellClick(r, c));
            container.appendChild(cell);
        }
    }
}

function renderSolveWords() {
    const list = document.getElementById('solve-word-list');
    if (!list) return;

    list.innerHTML = '';
    
    puzzleWords.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        li.id = `word-${word}`;
        list.appendChild(li);
    });
}

function handleCellClick(r, c) {
    document.querySelectorAll('.glow').forEach(el => el.classList.remove('glow'));

    if (!firstTap) {
        firstTap = { r, c };
        const el = document.getElementById(`cell-${r}-${c}`);
        if (el) el.classList.add('selected');
    } else {
        let r1 = firstTap.r;
        let c1 = firstTap.c;
        let r2 = r;
        let c2 = c;
        
        const firstEl = document.getElementById(`cell-${r1}-${c1}`);
        if (firstEl) firstEl.classList.remove('selected');
        firstTap = null;

        let match = checkMatch(r1, c1, r2, c2);
        
        if (match) {
            foundWords.add(match.word);
            
            // Highlight text slightly
            match.coords.forEach(coord => {
                const cell = document.getElementById(`cell-${coord[0]}-${coord[1]}`);
                if (cell) cell.classList.add('found');
            });
            
            // DRAW THE HIGHLIGHTER LINE!
            drawStrikethrough(match.coords);
            
            // Strike through the word list
            const wordLi = document.getElementById(`word-${match.word}`);
            if (wordLi) wordLi.classList.add('found');

            updateProgress();
        }
    }
}

function checkMatch(r1, c1, r2, c2) {
    let dr = r2 - r1;
    let dc = c2 - c1;
    
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;

    let steps = Math.max(Math.abs(dr), Math.abs(dc));
    let stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    let stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    let selectedCoords = [];
    for (let i = 0; i <= steps; i++) {
        selectedCoords.push([r1 + i * stepR, c1 + i * stepC]);
    }

    for (let word of Object.keys(puzzleLocations)) {
        if (foundWords.has(word)) continue;
        let locs = puzzleLocations[word];

        if (locs.length === selectedCoords.length) {
            let matchFwd = true, matchRev = true;
            for (let i = 0; i < locs.length; i++) {
                if (locs[i][0] !== selectedCoords[i][0] || locs[i][1] !== selectedCoords[i][1]) matchFwd = false;
                let revIdx = locs.length - 1 - i;
                if (locs[i][0] !== selectedCoords[revIdx][0] || locs[i][1] !== selectedCoords[revIdx][1]) matchRev = false;
            }
            if (matchFwd || matchRev) return { word, coords: locs };
        }
    }
    return null;
}

function updateProgress() {
    let total = puzzleWords.length;
    let found = foundWords.size;
    
    const progText = document.getElementById('progress-text');
    const progFill = document.getElementById('progress-fill');

    if (progText) progText.textContent = `${found} / ${total}`;
    if (progFill) progFill.style.width = total > 0 ? `${(found / total) * 100}%` : '0%';

    if (found === total && total > 0) triggerWin();
}

function updateTimer() {
    let diff = Math.floor((Date.now() - startTime) / 1000);
    let m = Math.floor(diff / 60).toString().padStart(2, '0');
    let s = (diff % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('timer');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
}

function triggerWin() {
    clearInterval(timerInterval);
    
    if (typeof confetti === 'function') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] });
    }

    setTimeout(() => {
        const timerText = document.getElementById('timer')?.textContent || '00:00';
        const finalTimeEl = document.getElementById('final-time');
        const winModal = document.getElementById('win-modal');

        if (finalTimeEl) finalTimeEl.textContent = timerText;
        if (winModal) winModal.classList.add('active');
    }, 1000);
}

function giveHint() {
    for (let word of puzzleWords) {
        if (!foundWords.has(word)) {
            let startCoord = puzzleLocations[word][0];
            let cell = document.getElementById(`cell-${startCoord[0]}-${startCoord[1]}`);
            if (cell) {
                cell.classList.add('glow');
                setTimeout(() => cell.classList.remove('glow'), 3000);
            }
            break;
        }
    }
}