const socket = io();

const startButton = document.getElementById("startButton");
const questionSection = document.getElementById("questionSection");
const categoryText = document.getElementById("categoryText");
const questionText = document.getElementById("questionText");
const optionsContainer = document.getElementById("optionsContainer");
const resultsSection = document.getElementById("resultsSection");
const resultsContainer = document.getElementById("resultsContainer");
const timeLeftDisplay = document.getElementById("timeLeft");

let isHost = false; // Indica si el jugador actual es el host
let hasAnswered = false;

// Mostrar el botón de "Iniciar Juego" solo para el host
socket.on("isHost", (status) => {
    isHost = status;
    if (isHost) {
        startButton.classList.remove("hidden");
    } else {
        startButton.classList.add("hidden");
    }
});

// Seleccionar categoría al azar y comenzar el juego (solo el host puede iniciar el juego)
startButton.addEventListener("click", () => {
    if (isHost) {
        const categories = ["Ciencia", "Cine", "Historia", "Geografía", "Deportes", "Música"];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        socket.emit("startGame", randomCategory);
    }
});

// Mostrar la categoría seleccionada y comenzar el juego
socket.on("categorySelected", (data) => {
    categoryText.textContent = `Categoría: ${data.category}`;
    questionSection.classList.remove("hidden");
    resultsSection.classList.add("hidden");
});

// Mostrar nueva pregunta y opciones
socket.on("newQuestion", (data) => {
    hasAnswered = false;
    questionText.textContent = data.question;
    optionsContainer.innerHTML = "";
    data.options.forEach(option => {
        const button = document.createElement("button");
        button.textContent = option;
        button.addEventListener("click", () => {
            if (!hasAnswered) {
                socket.emit("answer", { answer: option });
                hasAnswered = true;
            }
        });
        optionsContainer.appendChild(button);
    });
});

// Actualizar tiempo restante
socket.on("timeUpdate", (data) => {
    timeLeftDisplay.textContent = data.timeLeft;
});

// Mostrar mensaje cuando el tiempo se agota
socket.on("timeUp", (data) => {
    optionsContainer.innerHTML = "";
    questionText.textContent = `Tiempo agotado. La respuesta correcta era: ${data.correctAnswer}`;
});

// Mostrar feedback sobre la respuesta seleccionada
socket.on("feedback", (data) => {
    questionText.textContent = data.message;
});

// Mostrar resultados finales
socket.on("showResults", (data) => {
    questionSection.classList.add("hidden");
    resultsSection.classList.remove("hidden");
    resultsContainer.textContent = `Tu puntaje final es: ${data.score} puntos`;
});
