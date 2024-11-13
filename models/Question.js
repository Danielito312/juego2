// models/Question.js
const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true }  // índice de la respuesta correcta en el array `options`
});

module.exports = mongoose.model('Question', QuestionSchema);