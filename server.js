const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const questions = require('./questions'); // Asegúrate de que existe y tiene las preguntas correctas.

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const QUESTIONS_PER_ROUND = 6;
let currentQuestion = null;
let timeLeft = 10;
let interval = null;
let players = {};
let questionCount = 0;
let selectedCategory = null;
let gameStarted = false;
let host = null;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Asignar host si es el primer usuario en conectarse
    if (!host) {
        host = socket.id;
        io.to(socket.id).emit("isHost", true);
    } else {
        io.to(socket.id).emit("isHost", false);
    }

    players[socket.id] = { score: 0, answered: false };

    // Iniciar juego
    socket.on('startGame', (category) => {
        if (socket.id !== host || gameStarted) {
            return;
        }
        if (!questions[category]) {
            socket.emit("error", { message: "Categoría no encontrada" });
            return;
        }

        gameStarted = true;
        selectedCategory = category;
        questionCount = 0;
        Object.values(players).forEach(player => player.answered = false);

        io.emit("categorySelected", { category });
        startRound();
    });

    socket.on('answer', (data) => {
        if (!currentQuestion) return;
        const player = players[socket.id];
        if (player.answered) return;

        player.answered = true;
        const isCorrect = data.answer === currentQuestion.answer;
        const points = isCorrect ? Math.max(100 - (10 - timeLeft) * 10, 0) : 0;

        if (isCorrect) {
            player.score += points;
            socket.emit("feedback", { message: `¡Correcto! Ganaste ${points} puntos.` });
        } else {
            socket.emit("feedback", { message: `Incorrecto. La respuesta correcta era: ${currentQuestion.answer}` });
        }

        if (Object.values(players).every(player => player.answered)) {
            clearInterval(interval);
            setTimeout(() => nextQuestion(), 2000);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        delete players[socket.id];

        if (socket.id === host) {
            const playerIds = Object.keys(players);
            host = playerIds.length > 0 ? playerIds[0] : null;
            if (host) {
                io.to(host).emit("isHost", true);
            }
        }
    });
});

function startRound() {
    io.emit("newRound");
    nextQuestion();
}

function nextQuestion() {
    if (questionCount >= QUESTIONS_PER_ROUND) {
        endGame();
        return;
    }

    Object.values(players).forEach(player => player.answered = false);

    const categoryQuestions = questions[selectedCategory];
    currentQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
    questionCount++;

    io.emit("newQuestion", { question: currentQuestion.question, options: currentQuestion.options });

    timeLeft = 10;
    interval = setInterval(() => {
        timeLeft--;
        io.emit("timeUpdate", { timeLeft });
        if (timeLeft <= 0) {
            clearInterval(interval);
            io.emit("timeUp", { correctAnswer: currentQuestion.answer });
            setTimeout(() => nextQuestion(), 2000);
        }
    }, 1000);
}

function endGame() {
    Object.keys(players).forEach(socketId => {
        const player = players[socketId];
        io.to(socketId).emit("showResults", { score: player.score });
    });

    currentQuestion = null;
    timeLeft = 10;
    questionCount = 0;
    selectedCategory = null;
    gameStarted = false;
    Object.values(players).forEach(player => player.answered = false);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
