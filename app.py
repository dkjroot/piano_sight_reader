"""Local piano practice. Live MIDI stays in the browser; file inspection stays on this computer."""
import argparse

from flask import Flask, render_template, request, redirect
from score_import import inspect_midi, ScoreError, MAX_BYTES

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_BYTES


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/help")
def help_page():
    return render_template("help.html")


@app.get("/notation-study")
def notation_study():
    study = 'notation-cases' if request.args.get('study') == 'notation-cases' else 'independent-voices'
    return redirect('/?view=study&study=' + study)


@app.post("/api/inspect-midi")
def inspect_local_midi():
    try:
        return inspect_midi(request.get_data(cache=False))
    except ScoreError as error:
        return {"error": str(error)}, 400


@app.errorhandler(413)
def file_too_large(error):
    return {"error": "Choose a MIDI file no larger than 256 KB."}, 413


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    app.run(host="127.0.0.1", port=args.port, debug=False)
