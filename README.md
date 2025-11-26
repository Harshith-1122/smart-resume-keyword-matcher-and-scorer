# Resume Matcher

A web application that analyzes how well a resume matches a job description by comparing keywords and calculating a match score.

## Features

- Upload resume and job description in PDF, DOCX, or TXT format
- View match percentage and detailed analysis
- See matched and missing keywords
- Clean, responsive UI with drag-and-drop support
- Real-time processing with progress indication

## Prerequisites

- Python 3.7+
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd resume-matcher
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Start the Flask development server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Upload your resume and job description files
4. Click "Analyze Match" to see the results

## How It Works

1. The application extracts text from the uploaded files
2. It processes the text by:
   - Converting to lowercase
   - Removing special characters and digits
   - Tokenizing the text
   - Removing stopwords
   - Lemmatizing words
3. It calculates the match score based on the intersection of keywords
4. The results are displayed with matched and missing keywords

## File Structure

- `app.py` - Main Flask application
- `templates/` - HTML templates
  - `index.html` - Main application interface
- `static/` - Static files (CSS, JS, images)
- `requirements.txt` - Python dependencies

## License

This project is licensed under the MIT License.
