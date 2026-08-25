import random
import string

def generate_word_search(words, grid_size=12):
    # Initialize an empty grid with spaces
    grid = [[' ' for _ in range(grid_size)] for _ in range(grid_size)]
    placed_words = []
    locations = {}
    
    # Sort words by length descending (places the longest words first for better packing)
    sorted_words = sorted([w.upper().strip() for w in words if w.strip()], key=len, reverse=True)
    
    # All 8 directions (Horizontal, Vertical, Diagonal - forwards & backwards)
    directions = [
        (0, 1), (1, 0), (1, 1), (-1, 1), 
        (0, -1), (-1, 0), (-1, -1), (1, -1)
    ]
    
    for word in sorted_words:
        placed = False
        attempts = 0
        
        while not placed and attempts < 200:
            dr, dc = random.choice(directions)
            
            # Determine valid starting boundaries so the word doesn't fall off the grid
            min_r = 0 if dr >= 0 else len(word) - 1
            max_r = grid_size - len(word) if dr >= 0 else grid_size - 1
            if dr == 0: min_r, max_r = 0, grid_size - 1
                
            min_c = 0 if dc >= 0 else len(word) - 1
            max_c = grid_size - len(word) if dc >= 0 else grid_size - 1
            if dc == 0: min_c, max_c = 0, grid_size - 1
            
            if min_r > max_r or min_c > max_c:
                attempts += 1
                continue
                
            r = random.randint(min_r, max_r)
            c = random.randint(min_c, max_c)
            
            # Check for overlaps (Valid if cell is empty OR has the exact same letter)
            valid = True
            for i, char in enumerate(word):
                nr, nc = r + i*dr, c + i*dc
                if grid[nr][nc] != ' ' and grid[nr][nc] != char:
                    valid = False
                    break
                    
            if valid:
                locs = []
                for i, char in enumerate(word):
                    nr, nc = r + i*dr, c + i*dc
                    grid[nr][nc] = char
                    locs.append([nr, nc])
                locations[word] = locs
                placed_words.append(word)
                placed = True
                
            attempts += 1

    # Fill remaining blank spaces with random letters
    for r in range(grid_size):
        for c in range(grid_size):
            if grid[r][c] == ' ':
                grid[r][c] = random.choice(string.ascii_uppercase)
                
    return grid, placed_words, locations