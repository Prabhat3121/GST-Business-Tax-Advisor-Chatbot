// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const uploadPdfBtn = document.getElementById('uploadPdfBtn');
const newChatBtn = document.getElementById('newChatBtn');
const editProfileBtn = document.getElementById('editProfileBtn');

// Modal Elements
const pdfModal = document.getElementById('pdfModal');
const profileModal = document.getElementById('profileModal');
const closeButtons = document.querySelectorAll('.close');
const cancelButtons = document.querySelectorAll('.cancel-btn');
const pdfUploadForm = document.getElementById('pdfUploadForm');
const profileForm = document.getElementById('profileForm');
const pdfFileInput = document.getElementById('pdfFile');
const selectedFileName = document.getElementById('selectedFileName');

// Profile Display Elements
const businessTypeDisplay = document.getElementById('businessType');
const industryDisplay = document.getElementById('industry');
const revenueRangeDisplay = document.getElementById('revenueRange');
const gstNumberDisplay = document.getElementById('gstNumber');
const locationDisplay = document.getElementById('location');

// Business profile data
let businessProfile = {
    businessType: '',
    industry: '',
    revenueRange: '',
    gstNumber: '',
    location: ''
};

// Chat history
let chatHistory = [];

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load data from localStorage if available
    loadFromLocalStorage();
    
    // Set up event listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    clearChatBtn.addEventListener('click', clearChat);
    uploadPdfBtn.addEventListener('click', () => openModal(pdfModal));
    newChatBtn.addEventListener('click', startNewChat);
    editProfileBtn.addEventListener('click', () => openModal(profileModal));
    
    // Close modal events
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });
    
    // Form submissions
    pdfUploadForm.addEventListener('submit', handlePdfUpload);
    profileForm.addEventListener('submit', handleProfileUpdate);
    
    // File input change
    pdfFileInput.addEventListener('change', updateSelectedFileName);
    
    // Populate profile form if data exists
    populateProfileForm();
});

// Functions
function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Add user message to chat UI
    addMessageToChat('user', message);
    
    // Clear input
    userInput.value = '';
    
    // Show loading indicator
    showLoading();
    
    // Simulate AI response after delay
    setTimeout(() => {
        // Generate AI response based on user input
        const aiResponse = generateResponse(message);
        
        // Hide loading indicator and add AI response
        hideLoading();
        addMessageToChat('bot', aiResponse);
        
        // Save chat history
        saveToLocalStorage();
        
        // Scroll to bottom
        scrollToBottom();
    }, 1500);
}

function addMessageToChat(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Convert newlines to <br> and handle basic formatting
    const formattedContent = formatMessage(content);
    messageContent.innerHTML = formattedContent;
    
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);
    
    // Add to chat history
    chatHistory.push({
        sender: sender,
        content: content,
        timestamp: new Date().toISOString()
    });
    
    // Scroll to the bottom
    scrollToBottom();
}

function formatMessage(content) {
    // Convert URLs to links
    let formatted = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    // Handle basic markdown-like formatting
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

function showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message loading';
    loadingDiv.id = 'loadingIndicator';
    
    const loadingContent = document.createElement('div');
    loadingContent.className = 'loading-dots';
    loadingContent.innerHTML = '<span></span><span></span><span></span>';
    
    loadingDiv.appendChild(loadingContent);
    chatContainer.appendChild(loadingDiv);
    
    scrollToBottom();
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        // Keep only the first welcome message
        const welcomeMessage = chatContainer.querySelector('.message');
        chatContainer.innerHTML = '';
        if (welcomeMessage) {
            chatContainer.appendChild(welcomeMessage);
        }
        
        // Clear chat history except for welcome message
        if (chatHistory.length > 0) {
            const welcomeMsg = chatHistory[0];
            chatHistory = [welcomeMsg];
        } else {
            chatHistory = [];
        }
        
        // Save to localStorage
        saveToLocalStorage();
    }
}

function startNewChat() {
    clearChat();
    // We could add additional logic here if needed
}

function openModal(modal) {
    closeAllModals();
    modal.style.display = 'block';
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function updateSelectedFileName() {
    if (pdfFileInput.files.length > 0) {
        selectedFileName.textContent = pdfFileInput.files[0].name;
    } else {
        selectedFileName.textContent = 'No file selected';
    }
}

function handlePdfUpload(e) {
    e.preventDefault();
    
    if (pdfFileInput.files.length === 0) {
        alert('Please select a file to upload.');
        return;
    }
    
    const file = pdfFileInput.files[0];
    
    // Here you would typically upload to a server
    // For now, we'll just simulate success
    
    // Close the modal
    closeAllModals();
    
    // Add a message about the upload
    const botResponse = `Thank you for uploading "${file.name}". I've analyzed this document and can assist you with any questions about it.`;
    addMessageToChat('bot', botResponse);
    
    // Reset form
    pdfUploadForm.reset();
    selectedFileName.textContent = 'No file selected';
    
    // Save chat history
    saveToLocalStorage();
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    // Update business profile
    businessProfile = {
        businessType: document.getElementById('profileBusinessType').value,
        industry: document.getElementById('profileIndustry').value,
        revenueRange: document.getElementById('profileRevenueRange').value,
        gstNumber: document.getElementById('profileGstNumber').value,
        location: document.getElementById('profileLocation').value
    };
    
    // Update display
    updateProfileDisplay();
    
    // Close modal
    closeAllModals();
    
    // Add confirmation message to chat
    let confirmationMessage = 'Business profile updated successfully! ';
    if (!chatHistory.some(msg => msg.sender === 'bot' && msg.content.includes('profile'))) {
        confirmationMessage += "I'll use this information to provide you with more personalized tax advice.";
    }
    
    addMessageToChat('bot', confirmationMessage);
    
    // Save to localStorage
    saveToLocalStorage();
}

function updateProfileDisplay() {
    businessTypeDisplay.textContent = businessProfile.businessType || 'Not specified';
    industryDisplay.textContent = businessProfile.industry || 'Not specified';
    revenueRangeDisplay.textContent = businessProfile.revenueRange || 'Not specified';
    gstNumberDisplay.textContent = businessProfile.gstNumber || 'Not specified';
    locationDisplay.textContent = businessProfile.location || 'Not specified';
}

function populateProfileForm() {
    document.getElementById('profileBusinessType').value = businessProfile.businessType;
    document.getElementById('profileIndustry').value = businessProfile.industry;
    document.getElementById('profileRevenueRange').value = businessProfile.revenueRange;
    document.getElementById('profileGstNumber').value = businessProfile.gstNumber;
    document.getElementById('profileLocation').value = businessProfile.location;
}

function generateResponse(userMessage) {
    // Basic response generation logic
    // In a real app, this would connect to an AI backend
    
    userMessage = userMessage.toLowerCase();
    
    // Check for specific keywords/patterns
    if (userMessage.includes('gst') && userMessage.includes('deadline')) {
        return "GST filing deadlines depend on your business type. For normal taxpayers, GSTR-1 is due by the 11th of the following month, and GSTR-3B by the 20th. If your turnover is below ₹5 crore, you may be eligible for quarterly filing.";
    }
    
    if (userMessage.includes('tax calendar') || userMessage.includes('upcoming deadlines')) {
        return "Here are your upcoming tax deadlines:\n\n" + 
               "• April 20: GSTR-3B filing for March\n" +
               "• April 25: GST payment deadline\n" +
               "• May 11: GSTR-1 filing for April\n\n" +
               "Would you like me to set up reminders for these dates?";
    }
    
    if (userMessage.includes('input tax credit') || userMessage.includes('itc')) {
        return "Input Tax Credit (ITC) allows you to claim credit for taxes paid on purchases used for business purposes. To claim ITC, ensure you have valid tax invoices, your supplier has filed returns, and you've filed your GSTR-3B. Remember that certain items like food, beverages, and personal use items have ITC restrictions.";
    }
    
    if (userMessage.includes('section 80') || userMessage.includes('deduction')) {
        return "Several deductions are available under Section 80 of the Income Tax Act. Common ones include:\n\n" +
               "• 80C: Investments up to ₹1.5 lakh (PPF, ELSS, etc.)\n" +
               "• 80D: Health insurance premiums\n" +
               "• 80G: Charitable donations\n\n" +
               "For your business type, you might also consider deductions under Section 35AD for specified businesses.";
    }
    
    if (userMessage.includes('invoice')) {
        return "For GST-compliant invoices, ensure they include:\n\n" +
               "• Your business name, address, and GSTIN\n" +
               "• Customer details including GSTIN for B2B\n" +
               "• Unique invoice number and date\n" +
               "• HSN/SAC code for goods/services\n" +
               "• Taxable value and GST rates\n\n" +
               "Would you like me to provide an invoice template?";
    }
    
    if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
        return "Hello! How can I assist you with tax-related matters today?";
    }
    
    // Default response with personalized elements
    let businessTypeInfo = businessProfile.businessType ? ` As a ${businessProfile.businessType},` : '';
    let industryInfo = businessProfile.industry ? ` in the ${businessProfile.industry} industry,` : '';
    
    return `Thank you for your question${businessTypeInfo}${industryInfo} I'd be happy to help. Could you provide more specific details about your tax concern so I can give you the most accurate advice?`;
}

function saveToLocalStorage() {
    // Save chat history and business profile to localStorage
    localStorage.setItem('taxAdvisorChat', JSON.stringify(chatHistory));
    localStorage.setItem('taxAdvisorProfile', JSON.stringify(businessProfile));
}

function loadFromLocalStorage() {
    // Load chat history
    const savedChat = localStorage.getItem('taxAdvisorChat');
    if (savedChat) {
        chatHistory = JSON.parse(savedChat);
        
        // Render saved messages
        chatContainer.innerHTML = ''; // Clear default welcome message
        chatHistory.forEach(msg => {
            addMessageToChat(msg.sender, msg.content);
        });
    }
    
    // Load business profile
    const savedProfile = localStorage.getItem('taxAdvisorProfile');
    if (savedProfile) {
        businessProfile = JSON.parse(savedProfile);
        updateProfileDisplay();
    }
}

// Close modals when clicking outside of them
window.onclick = function(event) {
    if (event.target === pdfModal) {
        pdfModal.style.display = 'none';
    }
    if (event.target === profileModal) {
        profileModal.style.display = 'none';
    }
};