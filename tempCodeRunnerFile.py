from flask import render_template, Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os
import uuid
import PyPDF2
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
import json

# Load environment variables
load_dotenv()

# Initialize Groq LLM
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    temperature=0.7
)

# Create a Flask app
app = Flask(__name__)

# Configure upload folder
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Store conversation history, PDF content, and user business profiles
conversations = {}
pdf_contents = {}
business_profiles = {}

# Function to extract text from PDF
def extract_text_from_pdf(file_path):
    text = ""
    with open(file_path, "rb") as file:
        pdf_reader = PyPDF2.PdfReader(file)
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    return text

# Function to extract business details from user messages
def extract_business_details(message, session_id):
    if session_id not in business_profiles:
        business_profiles[session_id] = {
            "business_type": None,
            "industry": None,
            "revenue_range": None,
            "tax_filing_status": None,
            "compliance_concerns": [],
            "last_filing_date": None,
            "gst_number": None,
            "location": None
        }
    
    # Use the LLM to extract business details
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a business profile analyzer. Extract relevant business information from the user message.
         Return ONLY a JSON object with these fields (leave as null if not mentioned):
         - business_type: The type of business (e.g., sole proprietorship, LLC, corporation)
         - industry: The industry the business operates in
         - revenue_range: Annual revenue range (e.g., "under 20 lakhs", "20-50 lakhs", "50 lakhs - 1 crore", "above 1 crore")
         - tax_filing_status: Current tax filing status or concerns
         - compliance_concerns: Array of specific compliance concerns mentioned
         - last_filing_date: Last tax filing date if mentioned
         - gst_number: GST registration number if mentioned
         - location: Business location if mentioned"""),
        ("user", f"Extract business information from this message: {message}")
    ])
    
    parser = JsonOutputParser()
    chain = prompt | llm | parser
    
    try:
        result = chain.invoke({})
        
        # Update business profile with non-null values
        for key, value in result.items():
            if value is not None and value != "":
                if key == "compliance_concerns" and isinstance(value, list) and value:
                    # Append new concerns without duplicates
                    for concern in value:
                        if concern not in business_profiles[session_id]["compliance_concerns"]:
                            business_profiles[session_id]["compliance_concerns"].append(concern)
                else:
                    business_profiles[session_id][key] = value
    except Exception as e:
        print(f"Error extracting business details: {str(e)}")
    
    return business_profiles[session_id]

# API endpoint for PDF upload
@app.route("/api/upload-pdf", methods=["POST"])
def upload_pdf():
    if 'pdf' not in request.files:
        return jsonify({"error": "No PDF file uploaded."}), 400
    
    file = request.files['pdf']
    if file.filename == "":
        return jsonify({"error": "No selected file."}), 400
    
    if file and file.filename.endswith('.pdf'):
        session_id = request.form.get('sessionId', str(uuid.uuid4()))
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        pdf_text = extract_text_from_pdf(file_path)
        pdf_contents[session_id] = pdf_text
        
        # Update or create conversation history
        if session_id not in conversations:
            conversations[session_id] = []
            
        # Set or update system message
        system_message = {
            "role": "system",
            "content": f"""You are a knowledgeable tax advisor specializing in GST (Goods and Services Tax) and other business tax regulations.
            Provide accurate tax advice, compliance guidance, and tax optimization strategies for business owners.
            You have access to the following document content: {pdf_text[:1000]}... (and more).
            Answer questions based on this document when relevant."""
        }
        
        # Add or update system message
        if not conversations[session_id] or conversations[session_id][0]["role"] != "system":
            conversations[session_id].insert(0, system_message)
        else:
            conversations[session_id][0] = system_message
            
        return jsonify({
            "success": True,
            "message": "PDF uploaded and processed successfully.",
            "sessionId": session_id,
            "filename": filename
        })
    else:
        return jsonify({"error": "Only PDF files are allowed!"}), 400

# API endpoint for chat messages
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message")
    session_id = data.get("sessionId", str(uuid.uuid4()))
    
    if not user_message:
        return jsonify({"error": "Message is required."}), 400
    
    # Extract business details from user message
    business_profile = extract_business_details(user_message, session_id)
    
    # Initialize conversation if needed
    if session_id not in conversations:
        conversations[session_id] = [{
            "role": "system",
            "content": """You are a knowledgeable tax advisor specializing in GST (Goods and Services Tax) and other business tax regulations.
            Provide accurate tax advice, compliance guidance, and tax optimization strategies for business owners.
            Remember to always provide disclaimers when appropriate, encouraging users to consult with a professional tax advisor for final decisions."""
        }]
    
    # Enhance user message with context
    enhanced_message = user_message
    
    # Add business profile context
    profile_context = ""
    if business_profile:
        profile_context = f"""
        Business Profile Information:
        - Business Type: {business_profile.get('business_type', 'Unknown')}
        - Industry: {business_profile.get('industry', 'Unknown')}
        - Revenue Range: {business_profile.get('revenue_range', 'Unknown')}
        - Tax Filing Status: {business_profile.get('tax_filing_status', 'Unknown')}
        - Compliance Concerns: {', '.join(business_profile.get('compliance_concerns', [])) if business_profile.get('compliance_concerns') else 'None'}
        - Last Filing Date: {business_profile.get('last_filing_date', 'Unknown')}
        - GST Number: {business_profile.get('gst_number', 'Unknown')}
        - Location: {business_profile.get('location', 'Unknown')}
        """
    
    # Add document context if available
    doc_context = ""
    if session_id in pdf_contents:
        doc_context = f"\n\nRelevant document content: {pdf_contents[session_id][:5000]}"
    
    # Combine all context
    enhanced_message = f"User question: {user_message}\n\n{profile_context}{doc_context}"
    
    # Store the original user message in conversations
    conversations[session_id].append({"role": "user", "content": user_message})
    
    try:
        # Get latest tax info system prompt
        tax_info_prompt = """You are a knowledgeable tax advisor specializing in GST (Goods and Services Tax) and other business tax regulations.
        Provide accurate tax advice, compliance guidance, and tax optimization strategies for business owners.
        
        Current GST knowledge (as of October 2024):
        - Regular GST filing deadlines: GSTR-1 by 11th, GSTR-3B by 20th of each month
        - Composition scheme: Quarterly returns (CMP-08) by 18th of month following quarter end
        - Annual return (GSTR-9) by December 31st
        - Current GST slabs: 0%, 5%, 12%, 18%, and 28%
        - E-invoicing mandatory for businesses with turnover >Rs.5 crore
        - Input Tax Credit (ITC) must be claimed within specified time limits
        
        Remember to always provide disclaimers when appropriate, encouraging users to consult with a professional tax advisor for final decisions.
        
        If you know the user's business details from previous conversations, use that information to personalize your response.
        """
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", tax_info_prompt),
            ("user", enhanced_message)
        ])
        
        chain = prompt | llm
        response = chain.invoke({})
        
        # Extract content from AIMessage object
        if hasattr(response, 'content'):
            reply = response.content
        else:
            reply = str(response)
        
        # Store the AI response
        conversations[session_id].append({"role": "assistant", "content": reply})
        
        # Limit conversation history size
        if len(conversations[session_id]) > 20:
            conversations[session_id] = [conversations[session_id][0]] + conversations[session_id][-19:]
        
        return jsonify({"reply": reply, "sessionId": session_id})
    except Exception as e:
        return jsonify({"error": f"Failed to fetch chat completion: {str(e)}"}), 500

# API endpoint to reset conversation while preserving business profile
@app.route("/api/reset", methods=["POST"])
def reset_conversation():
    session_id = request.json.get("sessionId", "default")
    
    # Keep business profile but reset conversation
    if session_id in conversations:
        system_message = conversations[session_id][0] if conversations[session_id] and conversations[session_id][0]["role"] == "system" else {
            "role": "system",
            "content": """You are a knowledgeable tax advisor specializing in GST (Goods and Services Tax) and other business tax regulations.
            Provide accurate tax advice, compliance guidance, and tax optimization strategies for business owners.
            Remember to always provide disclaimers when appropriate, encouraging users to consult with a professional tax advisor for final decisions."""
        }
        conversations[session_id] = [system_message]
    
    if session_id in pdf_contents:
        del pdf_contents[session_id]
        
    return jsonify({"message": "Conversation history cleared, but business profile preserved."})

# API endpoint to get business profile
@app.route("/api/business-profile", methods=["GET"])
def get_business_profile():
    session_id = request.args.get("sessionId", "default")
    if session_id in business_profiles:
        return jsonify(business_profiles[session_id])
    else:
        return jsonify({}), 404

# API endpoint to update business profile directly
@app.route("/api/business-profile", methods=["POST"])
def update_business_profile():
    data = request.json
    session_id = data.get("sessionId", "default")
    profile_updates = data.get("profile", {})
    
    if not profile_updates:
        return jsonify({"error": "No profile updates provided."}), 400
    
    if session_id not in business_profiles:
        business_profiles[session_id] = {
            "business_type": None,
            "industry": None,
            "revenue_range": None,
            "tax_filing_status": None,
            "compliance_concerns": [],
            "last_filing_date": None,
            "gst_number": None,
            "location": None
        }
    
    # Update profile with new values
    for key, value in profile_updates.items():
        if key in business_profiles[session_id]:
            if key == "compliance_concerns" and isinstance(value, list):
                # For arrays, we might want to append rather than replace
                business_profiles[session_id][key] = list(set(business_profiles[session_id][key] + value))
            else:
                business_profiles[session_id][key] = value
    
    return jsonify({"message": "Business profile updated successfully.", "profile": business_profiles[session_id]})

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/<filename>")
def serve_static(filename):
    return send_from_directory("static", filename)

if __name__ == "__main__":
    app.run(debug=True)