import random
import string

def create_empty_grid(size):
    return [['' for _ in range(size)] for _ in range(size)]

def can_place_word(grid, word, row, col, d_row, d_col, size):
    for i in range(len(word)):
        r, c = row + i * d_row, col + i * d_col
        if r < 0 or r >= size or c < 0 or c >= size:
            return False
        if grid[r][c] != '' and grid[r][c] != word[i]:
            return False
    return True

def place_word(grid, word, row, col, d_row, d_col):
    positions = []
    for i in range(len(word)):
        r, c = row + i * d_row, col + i * d_col
        grid[r][c] = word[i]
        positions.append((r, c))
    return positions

def generate_word_search(words, grid_size=12):
    grid = create_empty_grid(grid_size)
    placed_words = []
    word_locations = {}

    # Group directions strictly by orientation
    horizontal_dirs = [(0, 1), (0, -1)]
    vertical_dirs = [(1, 0), (-1, 0)]
    diagonal_dirs = [(1, 1), (-1, 1), (1, -1), (-1, -1)]

    # Pool of direction types to rotate through (~33% each)
    orientation_pools = [diagonal_dirs, horizontal_dirs, vertical_dirs]

    clean_words = sorted([w.strip().upper() for w in words if w.strip()], key=len, reverse=True)

    for idx, word in enumerate(clean_words):
        if len(word) > grid_size:
            continue
            
        placed = False
        attempts = 0
        
        # Pick preferred orientation pool for this word index
        primary_pool = orientation_pools[idx % len(orientation_pools)]
        # Fallback pools if grid space is tight
        secondary_pools = [p for p in orientation_pools if p != primary_pool]
        all_ordered_pools = [primary_pool] + secondary_pools

        for pool in all_ordered_pools:
            if placed:
                break
                
            attempts = 0
            while not placed and attempts < 50:
                attempts += 1
                d_row, d_col = random.choice(pool)
                start_row = random.randint(0, grid_size - 1)
                start_col = random.randint(0, grid_size - 1)
                
                if can_place_word(grid, word, start_row, start_col, d_row, d_col, grid_size):
                    coords = place_word(grid, word, start_row, start_col, d_row, d_col)
                    placed_words.append(word)
                    word_locations[word] = coords
                    placed = True

    # Fill remaining empty spaces with random letters
    for r in range(grid_size):
        for c in range(grid_size):
            if grid[r][c] == '':
                grid[r][c] = random.choice(string.ascii_uppercase)
                
    return grid, placed_words, word_locations