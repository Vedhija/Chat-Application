const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Initialize Express and Socket.io
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/chat-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB Connected Successfully');
}).catch((err) => {
    console.error('MongoDB Connection Error:', err);
});

// Message Schema
const messageSchema = new mongoose.Schema({
    room: String,
    username: String,
    message: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Message = mongoose.model('Message', messageSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store active users
const users = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Join Room
    socket.on('joinRoom', async ({ username, room }) => {
        try {
            // Join the room
            socket.join(room);
            users.set(socket.id, { username, room });

            // Welcome message
            socket.emit('message', {
                username: 'System',
                message: `Welcome to room ${room}!`
            });

            // Broadcast user joined
            socket.to(room).emit('message', {
                username: 'System',
                message: `${username} has joined the chat`
            });

            // Get room users
            const roomUsers = Array.from(users.values())
                .filter(user => user.room === room)
                .map(user => user.username);

            // Send users list
            io.to(room).emit('roomUsers', {
                users: roomUsers
            });

            // Send previous messages
            const messages = await Message.find({ room })
                .sort({ timestamp: -1 })
                .limit(50);
            
            messages.reverse().forEach(msg => {
                socket.emit('message', {
                    username: msg.username,
                    message: msg.message
                });
            });
        } catch (err) {
            console.error('Join room error:', err);
        }
    });

    // Handle Messages
    socket.on('chatMessage', async (message) => {
        try {
            const user = users.get(socket.id);
            if (!user) return;

            // Save to database
            const newMessage = new Message({
                room: user.room,
                username: user.username,
                message: message
            });
            await newMessage.save();

            // Send to room
            io.to(user.room).emit('message', {
                username: user.username,
                message: message
            });
        } catch (err) {
            console.error('Message error:', err);
        }
    });

    // Handle Leaving Room
    socket.on('leaveRoom', () => {
        const user = users.get(socket.id);
        if (user) {
            handleUserLeaving(socket, user);
        }
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            handleUserLeaving(socket, user);
        }
    });
});

// Helper function for user leaving
function handleUserLeaving(socket, user) {
    socket.leave(user.room);
    users.delete(socket.id);

    // Send updated users list
    const roomUsers = Array.from(users.values())
        .filter(u => u.room === user.room)
        .map(u => u.username);

    io.to(user.room).emit('roomUsers', {
        users: roomUsers
    });

    // Notify room
    io.to(user.room).emit('message', {
        username: 'System',
        message: `${user.username} has left the chat`
    });
}

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});