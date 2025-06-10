document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('sand-canvas');
    const ctx = canvas.getContext('2d');
    const resetBtn = document.getElementById('reset-btn');
    const palettePicker = document.getElementById('palette-picker');
    const gravitySlider = document.getElementById('gravity-slider');
    const windSlider = document.getElementById('wind-slider');

    // --- Simulation State ---
    let width, height, cols, rows;
    let grid, animationFrameId, colorIntervalId;
    let frameCount = 0;
    let itemDropIntervalId;
    let windDirection = 0;
    let windStrength = 0;

    // --- Item Shape Definitions & Palettes (unchanged) ---
    const CACTUS_SHAPE = [ [0, 1, 0, 1, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0] ];
    const SHELL_SHAPE = [ [0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1] ];
    const LEAF_SHAPE = [ [0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 0, 1, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0] ];
    const PYRAMID_SHAPE = [ [0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1] ];
    const LAVA_ROCK_SHAPE = [ [0, 1, 1, 0], [1, 1, 1, 1], [0, 1, 1, 0] ];
    const palettes = {
        desert: { colors: ['#f4a460', '#cd853f', '#d2b48c', '#a0522d'], items: [CACTUS_SHAPE, PYRAMID_SHAPE] },
        beach: { colors: ['#f5deb3', '#f0e68c', '#add8e6', '#6495ed'], items: [SHELL_SHAPE] },
        forest: { colors: ['#228b22', '#006400', '#556b2f', '#8b4513'], items: [LEAF_SHAPE] },
        synthwave: { colors: ['#ff00ff', '#00ffff', '#ff69b4', '#9400d3'], items: [PYRAMID_SHAPE] },
        lava: { colors: ['#ff4500', '#ff0000', '#ffd700', '#4d0000'], items: [LAVA_ROCK_SHAPE] }
    };
    let currentPalette = palettes.desert;
    let currentColor;

    // --- Interaction State ---
    let isDragging = false;
    let draggedSand = [];
    let mouse = { x: 0, y: 0, radius: 20 };

    const setup = () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (colorIntervalId) clearInterval(colorIntervalId);
        if (itemDropIntervalId) clearInterval(itemDropIntervalId);

        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        const cellSize = 4;
        cols = Math.floor(width / cellSize);
        rows = Math.floor(height / cellSize);
        grid = Array(cols).fill(null).map(() => Array(rows).fill(null));
        frameCount = 0;
        updateCurrentColor();
        colorIntervalId = setInterval(updateCurrentColor, 2000);
        itemDropIntervalId = setInterval(dropRandomItem, 20000);

        // --- UPDATED: Ensure slider starts with the correct style ---
        updateWindFromSlider(windSlider.value);
        
        animate();
    };
    
    // The rest of the functions like dropRandomItem, updateCurrentColor, animate...
    // ... remain the same as the previous version. The only changes are in the listeners.
    const dropRandomItem = () => {
        const itemScale = 2;
        const items = currentPalette.items;
        if (!items || items.length === 0) return;
        const itemShape = items[Math.floor(Math.random() * items.length)];
        const itemColor = currentPalette.colors[Math.floor(Math.random() * currentPalette.colors.length)];
        const itemHeight = itemShape.length * itemScale;
        const itemWidth = itemShape[0].length * itemScale;
        const startCol = Math.floor(Math.random() * (cols - itemWidth));
        for (let y = 0; y < itemShape.length; y++) {
            for (let x = 0; x < itemShape[y].length; x++) {
                if (itemShape[y][x] === 1) {
                    for(let scaleY = 0; scaleY < itemScale; scaleY++){
                        for(let scaleX = 0; scaleX < itemScale; scaleX++){
                            const gridCol = startCol + (x * itemScale) + scaleX;
                            const gridRow = (y * itemScale) + scaleY + 2;
                            if (gridCol < cols && gridRow < rows) {
                                grid[gridCol][gridRow] = { color: itemColor };
                            }
                        }
                    }
                }
            }
        }
    };
    const updateCurrentColor = () => {
        currentColor = currentPalette.colors[Math.floor(Math.random() * currentPalette.colors.length)];
    };
    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                if (grid[i][j]) {
                    ctx.fillStyle = grid[i][j].color;
                    const cellSize = width / cols;
                    ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
                }
            }
        }
        if (isDragging) {
            draggedSand.forEach(grain => {
                ctx.fillStyle = grain.color;
                const cellSize = width / cols;
                const x = (Math.floor(mouse.x / cellSize) + grain.relX) * cellSize;
                const y = (Math.floor(mouse.y / cellSize) + grain.relY) * cellSize;
                ctx.fillRect(x, y, cellSize, cellSize);
            });
        }
        frameCount++;
        if (frameCount % gravitySlider.value === 0) {
            if (!isDragging) {
                for (let i = 0; i < 10; i++) {
                    const randomCol = Math.floor(Math.random() * cols);
                    if (grid[randomCol][0] === null) {
                        grid[randomCol][0] = { color: currentColor };
                    }
                }
            }
            const nextGrid = Array(cols).fill(null).map(() => Array(rows).fill(null));
            for (let i = 0; i < cols; i++) {
                for (let j = rows - 1; j >= 0; j--) {
                    const state = grid[i][j];
                    if (state) {
                        const below = j + 1;
                        if (below < rows) {
                            if (grid[i][below] === null) {
                                if (windDirection !== 0 && Math.random() < windStrength) {
                                    const windTargetCol = i + windDirection;
                                    if (windTargetCol >= 0 && windTargetCol < cols && grid[windTargetCol][below] === null) {
                                        nextGrid[windTargetCol][below] = state;
                                        continue;
                                    }
                                }
                                nextGrid[i][below] = state;
                                continue;
                            }
                            const dir = Math.random() < 0.5 ? 1 : -1;
                            if (i + dir >= 0 && i + dir < cols && grid[i + dir][below] === null) {
                                nextGrid[i + dir][below] = state;
                                continue;
                            }
                            if (i - dir >= 0 && i - dir < cols && grid[i - dir][below] === null) {
                                nextGrid[i - dir][below] = state;
                                continue;
                            }
                        }
                        nextGrid[i][j] = state;
                    }
                }
            }
            grid = nextGrid;
        }
        animationFrameId = requestAnimationFrame(animate);
    };

    // --- NEW: Helper function to update wind state and style from the slider ---
    const updateWindFromSlider = (value) => {
        const numValue = parseInt(value);
        windDirection = Math.sign(numValue);
        windStrength = Math.abs(numValue) / 100;

        // Add/remove class for visual feedback
        if (numValue === 0) {
            windSlider.classList.add('is-off');
        } else {
            windSlider.classList.remove('is-off');
        }
    };
    
    // --- Event Listeners ---
    resetBtn.addEventListener('click', setup);
    
    palettePicker.addEventListener('change', (e) => {
        currentPalette = palettes[e.target.value];
        updateCurrentColor();
    });

    // UPDATED: The wind slider now has two listeners
    windSlider.addEventListener('input', (e) => {
        // This updates the physics and style LIVE as you drag
        updateWindFromSlider(e.target.value);
    });

    windSlider.addEventListener('change', (e) => {
        // This listener SNAPS the slider to the center when you release the mouse
        const snapThreshold = 10; // How close to the center to snap from
        const value = parseInt(e.target.value);

        if (Math.abs(value) <= snapThreshold) {
            e.target.value = 0; // Set slider value to 0
            updateWindFromSlider(0); // Update physics and style to match
        }
    });

    // Mouse listeners for dragging sand (unchanged)
    canvas.addEventListener('mousedown', (e) => {
        const cellSize = width / cols;
        const startCol = Math.floor(e.clientX / cellSize);
        const startRow = Math.floor(e.clientY / cellSize);
        if(grid[startCol] && grid[startCol][startRow]){
            isDragging = true;
            draggedSand = [];
            const radius = Math.floor(mouse.radius / cellSize);
            for(let i = -radius; i <= radius; i++){
                for(let j = -radius; j <= radius; j++){
                    if(i*i + j*j < radius*radius){
                        const col = startCol + i;
                        const row = startRow + j;
                        if(col >= 0 && col < cols && row >= 0 && row < rows && grid[col][row]){
                            draggedSand.push({ ...grid[col][row], relX: i, relY: j });
                            grid[col][row] = null;
                        }
                    }
                }
            }
        }
    });
    canvas.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            const cellSize = width / cols;
            draggedSand.forEach(grain => {
                const col = Math.floor(mouse.x / cellSize) + grain.relX;
                const row = Math.floor(mouse.y / cellSize) + grain.relY;
                if (col >= 0 && col < cols && row >= 0 && row < rows) {
                    if(grid[col] && grid[col][row] === null) {
                       grid[col][row] = { color: grain.color };
                    }
                }
            });
            draggedSand = [];
        }
    });

    window.addEventListener('resize', setup);
    setup();
});