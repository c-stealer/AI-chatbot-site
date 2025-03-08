document.addEventListener('DOMContentLoaded', () => {
    const apiEndpointInput = document.getElementById('api-endpoint');
    const botIdentifierInput = document.getElementById('bot-identifier');
    const apiKeyInput = document.getElementById('api-key');
    const userMessageInput = document.getElementById('user-message');
    const sendButton = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const newChatButton = document.getElementById('new-chat-btn');
    const totalTokensDisplay = document.getElementById('total-tokens');
    const imageUploadInput = document.getElementById('image-upload');
    const uploadedImage = document.getElementById('uploaded-image');
    const removeImageButton = document.getElementById('remove-image');
    let currentUploadedImage = null;

    // Conversation Management
    class ConversationManager {
        constructor() {
            this.conversations = [];
            this.currentConversation = this.createNewConversation();
        }

        createNewConversation() {
            const conversation = {
                id: Date.now(),
                messages: [],
                context: [],
                totalTokens: 0
            };
            this.conversations.push(conversation);
            return conversation;
        }

        addMessage(role, content, tokens = { prompt: 0, completion: 0 }) {
            const message = { 
                role, 
                content, 
                tokens,
                timestamp: Date.now() 
            };
            this.currentConversation.messages.push(message);
            
            // Update total tokens
            this.currentConversation.totalTokens += (tokens.prompt + tokens.completion);
            
            // Maintain context (last 10 messages)
            this.currentConversation.context = this.currentConversation.messages
                .slice(-10)
                .map(msg => ({ 
                    role: msg.role, 
                    content: msg.content 
                }));

            return message;
        }

        getCurrentContext() {
            return this.currentConversation.context;
        }

        getTotalTokens() {
            return this.currentConversation.totalTokens;
        }

        startNewChat() {
            this.currentConversation = this.createNewConversation();
            return this.currentConversation;
        }
    }

    // Initialize Conversation Manager
    const conversationManager = new ConversationManager();

    // Dark Mode Functionality
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    }

    // Check for saved dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // Add dark mode toggle event listener
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // New Chat Functionality
    newChatButton.addEventListener('click', () => {
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Start a new conversation
        conversationManager.startNewChat();
        
        // Reset total tokens display
        totalTokensDisplay.textContent = 'Total Tokens: 0';
    });

    // Image Upload Functionality
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage.src = e.target.result;
                uploadedImage.style.display = 'block';
                removeImageButton.style.display = 'block';
                currentUploadedImage = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove Image Functionality
    removeImageButton.addEventListener('click', () => {
        uploadedImage.src = '';
        uploadedImage.style.display = 'none';
        removeImageButton.style.display = 'none';
        currentUploadedImage = null;
        imageUploadInput.value = ''; // Reset file input
    });

    sendButton.addEventListener('click', sendMessage);
    userMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const apiEndpoint = apiEndpointInput.value.trim();
        const botIdentifier = botIdentifierInput.value.trim();
        const apiKey = apiKeyInput.value.trim();
        const userMessage = userMessageInput.value.trim();

        if (!apiEndpoint || !botIdentifier || !userMessage) {
            alert('Please fill in the API Endpoint and AI Chatbot Identifier');
            return;
        }

        // Show loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        // Estimate user message tokens (simple approximation)
        const userMessageTokens = Math.ceil(userMessage.length / 4);

        // Prepare messages array with optional image
        const messages = [
            ...conversationManager.getCurrentContext(),
            { 
                role: 'user', 
                content: currentUploadedImage 
                    ? [
                        { type: 'text', text: userMessage },
                        { type: 'image_url', image_url: { url: currentUploadedImage } }
                    ]
                    : userMessage 
            }
        ];

        // Add user message to chat and conversation context
        const userMessageElement = addMessageToChatWindow(
            currentUploadedImage 
                ? `${userMessage} (with image)` 
                : userMessage, 
            'user', { 
                prompt: userMessageTokens, 
                completion: 0 
            }
        );

        // If an image is uploaded, display it in the chat
        if (currentUploadedImage) {
            const imageMessageElement = document.createElement('div');
            imageMessageElement.classList.add('message', 'user-message', 'image-message');
            const imagePreview = document.createElement('img');
            imagePreview.src = currentUploadedImage;
            imagePreview.style.maxWidth = '300px';
            imagePreview.style.maxHeight = '300px';
            imageMessageElement.appendChild(imagePreview);
            chatMessages.appendChild(imageMessageElement);
        }

        conversationManager.addMessage('user', userMessage, { 
            prompt: userMessageTokens, 
            completion: 0 
        });

        // Clear user input
        userMessageInput.value = '';

        // Prepare fetch options
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: botIdentifier,