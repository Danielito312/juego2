const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const questions = require('./questions'); // Archivo con las preguntas organizadas por categoría

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const QUESTIONS_PER_ROUND = 6; // Número de preguntas por ronda
let currentQuestion = null;
let timeLeft = 10;
let interval = null;
let players = {};
let questionCount = 0;
let selectedCategory = null;
let gameStarted = false;
let host = null;

app.use(express.static('public'));

// Manejo de la conexión de los jugadores
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Asignar el primer usuario como el host
    if (host === null) {
        host = socket.id;
        io.to(socket.id).emit("isHost", true); // Indicar al cliente que es el host
    } else {
        io.to(socket.id).emit("isHost", false);
    }

    players[socket.id] = { score: 0, answered: false };

    // Iniciar el juego y seleccionar una categoría al azar (solo si el usuario es el host)
    socket.on('startGame', (category) => {
        if (socket.id !== host || gameStarted) {
            return; // Solo el host puede iniciar el juego, y solo si no ha empezado
        }

        if (!questions[category]) {
            socket.emit("error", { message: "Categoría no encontrada" });
            return;
        }

        // Resetear el estado del juego
        gameStarted = true;
        selectedCategory = category;
        currentQuestion = null;
        timeLeft = 10;
        questionCount = 0;
        Object.values(players).forEach(player => player.answered = false);

        // Emitir la categoría seleccionada y comenzar la ronda para todos los jugadores
        io.emit("categorySelected", { category });
        startRound();
    });

    // Manejo de respuestas de los jugadores
    socket.on('answer', (data) => {
        if (!currentQuestion) return;

        const player = players[socket.id];
        if (player.answered) return; // Evitar múltiples respuestas

        player.answered = true;
        const isCorrect = data.answer === currentQuestion.answer;
        const points = isCorrect ? Math.max(100 - (10 - timeLeft) * 10, 0) : 0;

        if (isCorrect) {
            player.score += points;
            socket.emit("feedback", { message: `¡Correcto! Ganaste ${points} puntos.` });
        } else {
            socket.emit("feedback", { message: `Incorrecto. La respuesta correcta era: ${currentQuestion.answer}` });
        }

        // Verificar si todos los jugadores han respondido a la pregunta actual
        if (Object.values(players).every(player => player.answered)) {
            clearInterval(interval);
            setTimeout(() => nextQuestion(), 2000);
        }
    });

    // Manejo de la desconexión de jugadores
    socket.on('disconnect', () => {
        console.log(`Usuario desconectado: ${socket.id}`);
        delete players[socket.id];

        // Si el host se desconecta, asignar un nuevo host
        if (socket.id === host) {
            const playerIds = Object.keys(players);
            host = playerIds.length > 0 ? playerIds[0] : null;
            if (host) {
                io.to(host).emit("isHost", true);
            }
        }
    });
});

// Iniciar una nueva ronda de preguntas
function startRound() {
    io.emit("newRound"); 
    nextQuestion();
}

// Función para seleccionar y emitir una nueva pregunta
function nextQuestion() {
    // Verificar si ya se han hecho todas las preguntas de la ronda
    if (questionCount >= QUESTIONS_PER_ROUND) {
        endGame();
        return;
    }

    // Reiniciar respuestas de los jugadores para la nueva pregunta
    Object.values(players).forEach(player => player.answered = false);

    const categoryQuestions = questions[selectedCategory];
    if (!categoryQuestions || categoryQuestions.length === 0) {
        endGame();
        return;
    }

    // Seleccionar una pregunta aleatoria y asignarla a currentQuestion
    currentQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
    questionCount++; // Incrementar el contador de preguntas

    // Enviar la pregunta a todos los jugadores
    if (currentQuestion) {
        io.emit("newQuestion", { question: currentQuestion.question, options: currentQuestion.options });
    } else {
        console.log("Error: No se pudo seleccionar una pregunta.");
        endGame();
        return;
    }

    timeLeft = 10;
    interval = setInterval(() => {
        timeLeft--;
        io.emit("timeUpdate", { timeLeft });

        if (timeLeft <= 0) {
            clearInterval(interval);

            // Asignar puntaje 0 a jugadores que no respondieron
            Object.values(players).forEach(player => {
                if (!player.answered) {
                    player.answered = true;
                    io.to(Object.keys(players).find(id => players[id] === player)).emit("feedback", { message: "No respondiste a tiempo. Ganaste 0 puntos." });
                }
            });

            io.emit("timeUp", { correctAnswer: currentQuestion.answer });
            setTimeout(() => nextQuestion(), 2000);
        }
    }, 1000);
}

// Función para finalizar el juego y mostrar el puntaje individual a cada jugador
function endGame() {
    // Enviar el puntaje final solo al jugador correspondiente
    Object.keys(players).forEach(socketId => {
        const player = players[socketId];
        io.to(socketId).emit("showResults", { score: player.score });
    });

    // Reiniciar el juego para la siguiente ronda si es necesario
    currentQuestion = null;
    timeLeft = 10;
    questionCount = 0;
    selectedCategory = null;
    gameStarted = false;
    Object.values(players).forEach(player => player.answered = false);
}

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
