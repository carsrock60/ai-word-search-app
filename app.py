from flask import Flask, render_template, request, jsonify
import os
import json
from datetime import datetime, timezone

from word_search import generate_word_search

app = Flask(__name__)

# --- Resilient AI Fallback Chain (Lazy Loaded for Vercel) ---
def call_ai_chain(prompt):
    system_prompt = """You generate word search lists. Respond ONLY in valid JSON format:
    {
        "words": ["WORD1", "WORD2", "WORD3", "WORD4", "WORD5", "WORD6", "WORD7", "WORD8", "WORD9", "WORD10"]
    }"""

    # 1. Primary: Groq
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            completion = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                timeout=10
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"Groq failed: {e}")

    # 2. Backup: Gemini 2.5 Flash
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
            resp = model.generate_content(
                f"{system_prompt}\n\n{prompt}",
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            return json.loads(resp.text)
        except Exception as e:
            print(f"Gemini failed: {e}")

    # 3. Emergency: OpenAI GPT-4o-mini
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                timeout=10
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI failed: {e}")

    # 4. Ultimate Failsafe (If all APIs are down)
    return {
        "words": ["SPACE", "GALAXY", "PLANET", "ROCKET", "COMET", "METEOR", "ASTEROID", "ORBIT", "GRAVITY", "NEBULA"]
    }


# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create')
def create():
    return render_template('create.html')

@app.route('/themes')
def themes():
    return render_template('themes.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/puzzle/<payload>')
def shared_puzzle(payload):
    return render_template('solve.html', payload=payload)

@app.route('/api/generate-manual', methods=['POST'])
def generate_manual():
    try:
        data = request.get_json() or {}
        words = data.get('words', [])
        size = int(data.get('size', 12))
        
        if not words: 
            return jsonify({"error": "No words provided"}), 400
            
        grid, placed_words, locations = generate_word_search(words, grid_size=size)
        return jsonify({"grid": grid, "words": placed_words, "locations": locations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-ai', methods=['POST'])
def generate_ai():
    try:
        data = request.get_json() or {}
        category = data.get('category', 'General')
        size = int(data.get('size', 12))

        # Request words from AI
        prompt = f"Topic: '{category}'. Generate 10 uppercase single words related to this topic."
        ai_resp = call_ai_chain(prompt)

        words = [w.strip().upper() for w in ai_resp.get("words", []) if isinstance(w, str) and w.strip()]
        if not words:
            words = ["PUZZLE", "GENERATE", "SEARCH", "WORD", "SOLVE"]

        grid, placed_words, locations = generate_word_search(words, grid_size=size)
        return jsonify({"grid": grid, "words": placed_words, "locations": locations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/daily-puzzle', methods=['GET'])
def daily_puzzle():
    try:
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        prompt = f"Date: {today_str}. Generate a hard, unique academic/niche word search topic and 12 long uppercase single words (8-14 letters)."
        
        ai_resp = call_ai_chain(prompt)
        topic = ai_resp.get("topic", "Astrophysics & Deep Space") # Note: if model doesn't return topic, falls back to default
        words = [w.strip().upper() for w in ai_resp.get("words", []) if isinstance(w, str) and w.strip()]
        
        if not words:
            words = ["ASTROPHYSICS", "GRAVITATIONAL", "EXOPLANET", "SUPERNOVA", "SINGULARITY", "SPECTROSCOPY"]

        grid, placed_words, locations = generate_word_search(words, grid_size=15)
        return jsonify({
            "date": today_str,
            "topic": topic,
            "grid": grid,
            "words": placed_words,
            "locations": locations
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)