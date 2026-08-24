from flask import Flask, render_template, request, jsonify
import os
import json

# AI Providers
from groq import Groq
import google.generativeai as genai
from openai import OpenAI

# Web Search
from duckduckgo_search import DDGS

from word_search import generate_word_search

app = Flask(__name__)

# --- Initialize AI Clients (Graceful Failures if missing) ---
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", "dummy")) if os.environ.get("GROQ_API_KEY") else None

gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY", "dummy")) if os.environ.get("OPENAI_API_KEY") else None


# --- The Fallback AI Chain ---
def call_ai_chain(prompt):
    """Tries Groq -> Gemini -> OpenAI in order."""
    system_prompt = """You generate word search lists. Respond in pure JSON format:
    {
        "needs_search": boolean,
        "search_query": "string (the google search query if needs_search is true, else empty)",
        "words": ["list", "of", "up", "to", "10", "single", "words"]
    }"""
    
    # 1. Primary: Groq (Fastest)
    if groq_client and os.environ.get("GROQ_API_KEY"):
        try:
            completion = groq_client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"Groq failed: {e}")

    # 2. Backup: Gemini Flash Lite 2.5
    if gemini_key:
        try:
            model = genai.GenerativeModel('gemini-3.5-flash-lite')
            resp = model.generate_content(
                f"{system_prompt}\n\n{prompt}",
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            return json.loads(resp.text)
        except Exception as e:
            print(f"Gemini failed: {e}")

    # 3. Emergency: OpenAI (GPT-4.1-nano equivalent)
    if openai_client and os.environ.get("OPENAI_API_KEY"):
        try:
            completion = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI failed: {e}")
            
    raise Exception("All AI models failed. Please try again later.")


# --- Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/themes')
def themes():
    return render_template('themes.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/solve')
def solve():
    return render_template('solve.html')

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
        # Phase 1: Ask AI if it knows the topic or needs to search
        initial_prompt = f"Topic: '{category}'. If this is a very niche/obscure topic where you might guess wrong, set 'needs_search' to true and provide a 'search_query'. Otherwise set 'needs_search' to false and generate 10 single words."
        
        ai_resp = call_ai_chain(initial_prompt)
        
        # Phase 2: Agentic Web Search Fallback
        if ai_resp.get("needs_search"):
            print(f"Topic is niche! Searching web for: {ai_resp.get('search_query')}")
            query = ai_resp.get("search_query", category)
            try:
                # DuckDuckGo free search
                results = DDGS().text(query, max_results=3)
                context = " ".join([r['body'] for r in results])
            except Exception as e:
                context = "Could not fetch web results."
            
            # Re-prompt the AI with the live web context
            context_prompt = f"Topic: '{category}'. Here is web context: {context}. Generate 10 accurate single words based on this context. Set needs_search to false."
            ai_resp = call_ai_chain(context_prompt)

        # Clean the words and generate grid
        words = [w.strip().upper() for w in ai_resp.get("words", []) if w.strip()]
        if not words:
            raise Exception("AI failed to generate words.")
            
        grid, placed_words, locations = generate_word_search(words, grid_size=size)
        return jsonify({"grid": grid, "words": placed_words, "locations": locations})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)