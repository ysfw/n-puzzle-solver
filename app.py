from flask import Flask, jsonify, render_template, request
from npuzzle.web_service import run_search

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16384


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/solve")
def solve():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Send a JSON object containing the puzzle tiles."), 400
    try:
        return jsonify(run_search(data))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
