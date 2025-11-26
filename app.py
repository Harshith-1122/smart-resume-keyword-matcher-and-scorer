from flask import Flask, render_template, request, jsonify, make_response
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import re
import nltk
import traceback
import sys
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
import PyPDF2
from docx import Document
from pptx import Presentation
import io
import datetime

# Download required NLTK data
def download_nltk_data():
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
        nltk.data.find('corpora/wordnet')
        nltk.data.find('tokenizers/punkt_tab')
    except LookupError:
        print("Downloading NLTK data...")
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        nltk.download('wordnet', quiet=True)
        try:
            nltk.download('punkt_tab', quiet=True)
        except:
            print("punkt_tab not found, using default tokenizer")
            
# Initialize NLTK data
download_nltk_data()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize NLTK components
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def extract_name_from_filename(filename):
    """Extract candidate name from filename"""
    # Remove file extension
    name = os.path.splitext(filename)[0]
    # Replace common separators with spaces
    name = re.sub(r'[_-]', ' ', name)
    # Title case the name
    name = name.title()
    return name

def extract_degree(text):
    """Extract degree information from text"""
    degree_keywords = [
        'bachelor', 'bs', 'bsc', 'b.tech', 'btech', 'be', 'b.e', 'b.eng', 'beng',
        'master', 'ms', 'msc', 'm.tech', 'mtech', 'me', 'm.e', 'meng', 'm.eng',
        'phd', 'ph.d', 'doctorate', 'mba', 'bca', 'mca', 'bca', 'b.b.a', 'bba',
        'b.com', 'bcom', 'm.com', 'mcom'
    ]
    
    found_degrees = set()
    text_lower = text.lower()
    
    # Look for common degree patterns
    for degree in degree_keywords:
        if degree in text_lower:
            # Format the degree nicely
            pretty_degree = degree.upper() if len(degree) <= 4 else degree.title()
            found_degrees.add(pretty_degree)
    
    return list(found_degrees) if found_degrees else ['Not Specified']

def preprocess_text(text):
    try:
        # Convert to lowercase
        text = text.lower()
        # Remove special characters and digits
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Try using word_tokenize, fall back to simple split if it fails
        try:
            tokens = word_tokenize(text)
        except LookupError:
            # Fallback to simple whitespace tokenizer
            tokens = text.split()
            
        # Remove stopwords and lemmatize
        tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
        return set(tokens)  # Using set for faster lookups
        
    except Exception as e:
        print(f"Error in preprocess_text: {str(e)}")
        # Return empty set if there's an error
        return set()

def extract_text_from_file(file):
    if not file or not file.filename:
        print("No file or filename provided")
        return None
        
    try:
        # Get file extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        print(f"Processing file: {file.filename}, Type: {file_extension}")
        
        # Read file content
        file_content = file.read()
        file.seek(0)  # Reset file pointer for potential reuse
        
        if not file_content:
            print(f"Empty file: {file.filename}")
            return None
            
        if file_extension == '.pdf':
            try:
                # Create a file-like object from the bytes
                pdf_file = io.BytesIO(file_content)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text = ''
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
                return text if text.strip() else None
            except Exception as e:
                print(f"Error reading PDF: {e}")
                return None
                
        elif file_extension == '.docx':
            try:
                # Create a file-like object from the bytes
                docx_file = io.BytesIO(file_content)
                doc = Document(docx_file)
                return '\n'.join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
            except Exception as e:
                print(f"Error reading DOCX: {e}")
                return None
                
        elif file_extension == '.txt':
            try:
                # Try to decode as UTF-8 first, then try other encodings if that fails
                try:
                    return file_content.decode('utf-8')
                except UnicodeDecodeError:
                    return file_content.decode('latin-1')
            except Exception as e:
                print(f"Error reading TXT: {e}")
                return None
        else:
            print(f"Unsupported file format: {file_extension}")
            return None
            
    except Exception as e:
        print(f"Error processing file: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/match', methods=['POST'])
def match_resume():
    start_time = datetime.datetime.now()
    try:
        print("\n=== New Request ===")
        print("Method:", request.method)
        print("Content-Type:", request.content_type)
        print("Content-Length:", request.content_length)
        
        # Print form data
        print("\n=== Form Data ===")
        for key, value in request.form.items():
            print(f"{key}: {value[:100]}{'...' if len(value) > 100 else ''}")
            
        # Print files
        print("\n=== Files ===")
        for key in request.files:
            file = request.files[key]
            print(f"File field: {key}")
            print(f"  Filename: {file.filename}")
            print(f"  Content-Type: {file.content_type}")
            print(f"  Content-Length: {file.content_length if hasattr(file, 'content_length') else 'N/A'}")
            print(f"  File object: {file}")
            
        # Get all files from any field that starts with 'resumes'
        resume_files = []
        for key in request.files:
            if key.startswith('resumes'):
                files = request.files.getlist(key)
                print(f"Found {len(files)} files in field '{key}'")
                resume_files.extend([f for f in files if f.filename])  # Only add files with names
        
        print(f"Total valid files found: {len(resume_files)}")
        
        # Check if files were actually received
        if not resume_files:
            error_msg = 'No valid files were uploaded. Please select at least one valid file (PDF, DOCX, or TXT).'
            print(f"Error: {error_msg}")
            print("Available file fields:", list(request.files.keys()))
            return jsonify({
                'error': error_msg,
                'status': 'error',
                'available_fields': list(request.files.keys())
            }), 400
        
        # Log form data
        print("\n=== Form Data ===")
        for key, value in request.form.items():
            print(f"{key}: {value[:100]}{'...' if len(value) > 100 else ''}")
            
        # Log files
        print("\n=== File Details ===")
        for i, file in enumerate(resume_files, 1):
            if file and file.filename:
                file_data = file.read()
                file.seek(0)  # Reset file pointer
                print(f"File {i}: {file.filename}, Size: {len(file_data)} bytes, Content-Type: {file.content_type}")
            else:
                print(f"File {i}: [Empty or invalid file]")
        
        # Check if we have a job description
        if not request.form.get('job_description'):
            error_msg = 'Please provide a job description'
            print(f"Validation error: {error_msg}")
            return jsonify({'error': error_msg, 'status': 'error'}), 400
        
        # Get job description from form data
        jd_text = request.form.get('job_description', '').strip()
        print(f"Job description length: {len(jd_text)}")  # Debug log
        if not jd_text:
            error_msg = 'Job description cannot be empty'
            print(f"Validation error: {error_msg}")
            return jsonify({'error': error_msg, 'status': 'error'}), 400
        
        # Filter out empty files and validate file types
        valid_extensions = ['.pdf', '.docx', '.txt']
        valid_files = []
        
        for file in resume_files:
            if not file or not file.filename:
                continue
                
            # Get file extension
            file_ext = os.path.splitext(file.filename)[1].lower()
            
            if file_ext not in valid_extensions:
                print(f"Skipping invalid file type: {file.filename}")
                continue
                
            valid_files.append(file)
        
        print(f"After validation, {len(valid_files)} valid files remain")
        
        if not valid_files:
            error_msg = 'Please upload at least one valid resume file (PDF, DOCX, or TXT)'
            print(f"Validation error: {error_msg}")
            return jsonify({'error': error_msg, 'status': 'error'}), 400
            
        resume_files = valid_files
        
        # Process all resumes
        results = []
        for resume_file in resume_files:
            if not resume_file or resume_file.filename == '':
                continue
                
            resume_ext = os.path.splitext(resume_file.filename)[1].lower()
            if resume_ext not in ['.pdf', '.docx', '.txt']:
                continue
            
            # Extract text from resume
            try:
                print(f"Processing file: {resume_file.filename}")
                resume_text = extract_text_from_file(resume_file)
                if not resume_text:
                    print(f"Warning: Could not extract text from {resume_file.filename}")
                    continue
            except Exception as e:
                print(f"Error processing {resume_file.filename}: {str(e)}")
                continue
            
            # Preprocess the texts
            resume_keywords = preprocess_text(resume_text)
            jd_keywords = preprocess_text(jd_text)
            
            if not jd_keywords:
                continue
            
            matched_keywords = resume_keywords.intersection(jd_keywords)
            match_percentage = (len(matched_keywords) / len(jd_keywords)) * 100 if jd_keywords else 0
            
            # Get missing keywords (present in JD but not in resume)
            missing_keywords = jd_keywords - resume_keywords
            
            # Calculate word counts
            resume_word_count = len(resume_text.split())
            jd_word_count = len(jd_text.split())
            
            # Extract degree information
            degrees = extract_degree(resume_text)
            
            # Determine eligibility (example: 50% match or higher is eligible)
            is_eligible = match_percentage >= 50
            
            # Extract candidate name from filename
            candidate_name = extract_name_from_filename(resume_file.filename)
            
            # Add result for this resume
            results.append({
                'filename': resume_file.filename,
                'name': candidate_name,
                'score': round(match_percentage, 2),
                'is_eligible': is_eligible,
                'eligibility_threshold': 70,  # 70% threshold for eligibility
                'degrees': degrees,
                'matched_keywords': sorted(list(matched_keywords))[:50],
                'missing_keywords': sorted(list(missing_keywords))[:50],
                'resume_word_count': resume_word_count,
                'jd_word_count': jd_word_count,
                'analysis_date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'status': 'Eligible' if is_eligible else 'Not Eligible',
                'strengths': {
                    'total_matched_keywords': len(matched_keywords),
                    'top_skills': sorted(list(matched_keywords))[:5]
                },
                'improvement_areas': {
                    'missing_keywords_count': len(missing_keywords),
                    'suggested_improvements': sorted(list(missing_keywords))[:5]
                }
            })
        
        if not results:
            return jsonify({'error': 'No valid resumes were processed'}), 400
        
        # Sort results by score (highest first)
        sorted_results = sorted(results, key=lambda x: x['score'], reverse=True)
        
        # Calculate statistics
        eligible_count = sum(1 for r in results if r['is_eligible'])
        avg_score = sum(r['score'] for r in results) / len(results) if results else 0
        
        # Prepare response
        response = {
            'results': sorted_results,
            'status': 'success',
            'total_resumes': len(results),
            'eligible_count': eligible_count,
            'ineligible_count': len(results) - eligible_count,
            'average_score': round(avg_score, 2),
            'analysis_date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'metadata': {
                'job_description_length': len(jd_text),
                'total_keywords_matched': sum(len(r['matched_keywords']) for r in results),
                'processing_time_seconds': (datetime.datetime.now() - start_time).total_seconds()
            }
        }
            
        # Create response and set CORS headers
        response = make_response(jsonify(response))
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
            
    except Exception as e:
        print("\n=== ERROR ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print("Traceback:")
        traceback.print_exc(file=sys.stdout)
        print("============\n")
        
        error_msg = f"An error occurred: {str(e)}"
        if 'resume' in str(e).lower():
            error_msg = "Error processing resume file. Please make sure the file is not password protected and is not corrupted."
            
        return jsonify({
            'error': error_msg,
            'status': 'error',
            'error_type': type(e).__name__,
            'error_details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
