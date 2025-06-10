from flask import Flask, render_template

# Initialize the Flask application
app = Flask(__name__)

# Define the main route that serves the webpage
@app.route('/')
def index():
    """Renders the main page."""
    return render_template('index.html')

# This block allows you to run the app directly from the command line
if __name__ == '__main__':
    # host='0.0.0.0' makes the server accessible on your local network
    # debug=True allows for automatic reloading when you save changes
    app.run(host='0.0.0.0', port=5000, debug=True)