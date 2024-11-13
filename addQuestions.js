// addQuestions.js
require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Conectado a MongoDB para agregar preguntas");
}).catch(err => {
  console.error("Error al conectar a MongoDB:", err);
  process.exit(1);
});

// Preguntas de ejemplo
const questions = [
  {
    question: "¿Cuál es la capital de Francia?",
    options: ["Madrid", "París", "Roma", "Londres"],
    correctAnswer: 1
  },
  {
    question: "¿Cuál es el planeta más cercano al sol?",
    options: ["Venus", "Tierra", "Mercurio", "Marte"],
    correctAnswer: 2
  },
  {
    question: "¿En qué año llegó el hombre a la Luna?",
    options: ["1969", "1955", "1971", "1963"],
    correctAnswer: 0
  }
];

// Función para insertar preguntas
const addQuestions = async () => {
  try {
    await Question.insertMany(questions);
    console.log("Preguntas agregadas correctamente");
  } catch (err) {
    console.error("Error al agregar preguntas:", err);
  } finally {
    mongoose.connection.close(); // Cierra la conexión a la base de datos
  }
};

addQuestions();