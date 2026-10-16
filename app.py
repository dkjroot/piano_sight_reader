"""Local browser-based piano practice. No MIDI or manuscript data leaves this server."""
import argparse

from flask import Flask, render_template

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    app.run(host="127.0.0.1", port=args.port, debug=False)
