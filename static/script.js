// Global State
let currentGrid = null;
let currentWords = [];
let currentLocations = {};
let currentTheme = "Custom";
let currentDifficulty = "Medium";
let currentSize = 12;

// Check URL for theme selection on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        const input = document.getElementById('category-input');
        if (input) {
            input.value = categoryParam;
            generateAI();
        }
    }
});

// Generate from Home Page (AI)
async function generateAI() {
    const input = document.getElementById('category-input');
    if (!input) return;
    
    const category = input.value.trim();
    if (!category) return alert("Please enter a category.");
    
    currentTheme = category;
    currentDifficulty = "Medium"; 
    currentSize = 12; 
    
    fetchPuzzle('/api/generate-ai', { category: category, size: currentSize });
}

// Generate from Home Page (Manual)
async function generateManual() {
    const wordsInput = document.getElementById('manual-words').value;
    const words = wordsInput.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (words.length === 0) return alert("Please enter some words.");
    
    currentTheme = "Custom Words";
    currentDifficulty = "N/A";
    currentSize = 12;
    
    fetchPuzzle('/api/generate-manual', { words: words, size: currentSize });
}

// Core Fetch
async function fetchPuzzle(endpoint, payload) {
    document.getElementById('loading-message').style.display = 'block';
    document.getElementById('print-area').style.display = 'none';
    
    const downloadBtn = document.getElementById('download-btn');
    const playBtn = document.getElementById('play-btn');
    if (downloadBtn) downloadBtn.style.display = 'none';
    if (playBtn) playBtn.style.display = 'none';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        currentGrid = data.grid;
        currentWords = data.words;
        currentLocations = data.locations;
        
        renderGrid(currentGrid, currentWords);
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        document.getElementById('loading-message').style.display = 'none';
    }
}

// Render to Screen
function renderGrid(grid, words) {
    const container = document.getElementById('grid-container');
    if (!container) return; // Safety check

    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${currentSize}, minmax(20px, 40px))`;
    
    grid.forEach(row => {
        row.forEach(letter => {
            const div = document.createElement('div');
            div.className = 'cell';
            div.textContent = letter;
            container.appendChild(div);
        });
    });

    const wordList = document.getElementById('word-list');
    wordList.innerHTML = '';
    words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        wordList.appendChild(li);
    });

    // Update Stats
    document.getElementById('stat-size').textContent = `Size: ${currentSize}x${currentSize}`;
    document.getElementById('stat-difficulty').textContent = `Difficulty: ${currentDifficulty}`;
    document.getElementById('stat-words').textContent = `Words: ${words.length}`;

    // Show puzzle and buttons
    document.getElementById('print-area').style.display = 'block';
    
    const downloadBtn = document.getElementById('download-btn');
    const playBtn = document.getElementById('play-btn');
    
    // Using block styling instead of flex to ensure buttons show properly
    if (downloadBtn) downloadBtn.style.display = 'block';
    if (playBtn) playBtn.style.display = 'block';
}

// Play Online Integration
function playOnline() {
    if (!currentGrid || !currentWords || !currentLocations) {
        alert("Please generate a puzzle first!");
        return;
    }
    localStorage.setItem('wordgen_grid', JSON.stringify(currentGrid));
    localStorage.setItem('wordgen_words', JSON.stringify(currentWords));
    localStorage.setItem('wordgen_locations', JSON.stringify(currentLocations));
    localStorage.setItem('wordgen_theme', currentTheme);
    window.location.href = '/solve';
}

// Professional PDF Exporter
function downloadPDF() {
    if (!currentGrid || !currentWords) return;

    const cellSize = currentSize > 15 ? 24 : 32; 
    const gridWidth = currentSize * cellSize;
    const gridHeight = currentSize * cellSize;

    const printElement = document.createElement('div');
    printElement.style.fontFamily = 'Arial, sans-serif';
    printElement.style.color = '#000';

    const createPage = (title, content, isAnswerKey = false) => `
        <div style="padding: 20px; page-break-after: ${isAnswerKey ? 'auto' : 'always'};">
            <div style="border: 3px solid #1e293b; border-radius: 12px; padding: 30px; min-height: 900px; box-sizing: border-box; position: relative;">
                <div style="background: #3b82f6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center;">
                    <h1 style="margin: 0 0 10px 0; font-size: 28px; letter-spacing: 2px;">🧩 ${title}</h1>
                    <div style="font-size: 16px; font-weight: bold;">
                        <span>Theme: ${currentTheme.toUpperCase()}</span> 
                        <span style="margin: 0 15px;">|</span> 
                        <span>Difficulty: ${currentDifficulty.toUpperCase()}</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(${currentSize}, ${cellSize}px); grid-template-rows: repeat(${currentSize}, ${cellSize}px); gap: 0; margin: 0 auto 40px auto; width: ${gridWidth}px; border: 2px solid #000; position: relative;">
                    ${content}
                </div>
                ${!isAnswerKey ? `
                <h3 style="text-align: center; margin-bottom: 20px; font-size: 20px;">✓ Find These Words</h3>
                <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; max-width: 600px; margin: 0 auto;">
                    ${currentWords.map(word => `
                        <li style="font-size: 16px; font-weight: bold; display: flex; align-items: center;">
                            <div style="width: 14px; height: 14px; border: 2px solid #334155; margin-right: 8px; border-radius: 3px;"></div>
                            ${word}
                        </li>
                    `).join('')}
                </ul>
                ` : ''}
                <div style="position: absolute; bottom: 30px; left: 0; width: 100%; text-align: center; color: #64748b; font-size: 14px;">
                    <strong>Generated with WordGen</strong><br>wordgen.com
                </div>
            </div>
        </div>
    `;

    let page1Content = '';
    let page2Content = '';
    
    currentGrid.forEach(row => {
        row.forEach(letter => {
            page1Content += `<div style="width: ${cellSize}px; height: ${cellSize}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${cellSize * 0.55}px; border: 1px solid #ddd;">${letter}</div>`;
            page2Content += `<div style="width: ${cellSize}px; height: ${cellSize}px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: ${cellSize * 0.55}px; border: 1px solid #eee; color: #94a3b8;">${letter}</div>`;
        });
    });

    page2Content += `<svg width="${gridWidth}" height="${gridHeight}" style="position: absolute; top: 0; left: 0; pointer-events: none;">`;
    
    if (currentLocations) {
        Object.keys(currentLocations).forEach(word => {
            const coords = currentLocations[word];
            if (coords && coords.length > 0) {
                const start = coords[0];
                const end = coords[coords.length - 1];
                const x1 = Math.floor((start[1] + 0.5) * cellSize);
                const y1 = Math.floor((start[0] + 0.5) * cellSize);
                const x2 = Math.floor((end[1] + 0.5) * cellSize);
                const y2 = Math.floor((end[0] + 0.5) * cellSize);
                page2Content += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(59, 130, 246, 0.45)" stroke-width="${cellSize * 0.65}" stroke-linecap="round" />`;
            }
        });
    }
    page2Content += `</svg>`;

    printElement.innerHTML = createPage('WORD SEARCH', page1Content, false) + createPage('ANSWER KEY', page2Content, true);

    const opt = {
        margin:       [0.2, 0.2, 0.2, 0.2],
        filename:     `WordGen_${currentTheme.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
    };

    html2pdf().set(opt).from(printElement).save();
}