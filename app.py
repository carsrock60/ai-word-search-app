from flask import Flask, render_template, request, jsonify
from groq import Groq
from pydantic import BaseModel
import os
import json
from word_search import generate_word_search

app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class WordList(BaseModel):
    words: list[str]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/themes')
def themes():
    return render_template('themes.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/api/generate-manual', methods=['POST'])
def generate_manual():
    data = request.get_json()
    words = data.get('words', [])
    size = int(data.get('size', 12))
    
    if not words: 
        return jsonify({"error": "No words provided"}), 400
        
    grid, placed_words, locations = generate_word_search(words, grid_size=size)
    return jsonify({"grid": grid, "words": placed_words, "locations": locations})

@app.route('/api/generate-ai', methods=['POST'])
def generate_ai():
    data = request.get_json()
    category = data.get('category', '')
    size = int(data.get('size', 12))
    
    if not category: 
        return jsonify({"error": "No category provided"}), 400

    try:
        prompt = f"Generate 10 single words related to the category: '{category}'."
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {"role": "system", "content": f"You generate word search lists. Respond with JSON matching: {json.dumps(WordList.model_json_schema())}"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        validated_data = WordList.model_validate_json(completion.choices[0].message.content)
        ai_words = [w.strip() for w in validated_data.words if w.strip()]
        
        grid, placed_words, locations = generate_word_search(ai_words, grid_size=size)
        return jsonify({"grid": grid, "words": placed_words, "locations": locations})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)