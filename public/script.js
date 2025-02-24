

const socket = io();

// DOM Elements
const joinContainer = document.getElementById('join-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room-number');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');
const usersList = document.getElementById('users-list');
const roomIdSpan = document.getElementById('room-id');

let currentUsername = '';
let currentRoom = '';

// Join Room
joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();

    if (!username || !room) {
        alert('Please enter both username and room number');
        return;
    }

    currentUsername = username;
    currentRoom = room;
    roomIdSpan.textContent = room;

    socket.emit('joinRoom', { username, room });
    joinContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
});

// Leave Room
leaveBtn.addEventListener('click', () => {
    socket.emit('leaveRoom');
    chatContainer.classList.add('hidden');
    joinContainer.classList.remove('hidden');
    messagesDiv.innerHTML = '';
    usersList.innerHTML = '';
    messageInput.value = '';
});

// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    socket.emit('chatMessage', message);
    messageInput.value = '';
}

// Socket event handlers
socket.on('message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    if (data.username === 'System') {
        messageDiv.className += ' system';
        messageDiv.textContent = data.message;
    } else {
        messageDiv.className += data.username === currentUsername ? ' sent' : ' received';
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = `${data.username === currentUsername ? '' : data.username + ': '}${data.message}`;
        messageDiv.appendChild(content);
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on('roomUsers', ({ users }) => {
    usersList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        usersList.appendChild(li);
    });
});