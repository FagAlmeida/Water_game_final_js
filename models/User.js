const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definição do esquema de usuário
const UserSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Nome de usuário é obrigatório'], // Mensagem personalizada de erro
        unique: true
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'], // Mensagem personalizada de erro
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'] // Mensagem personalizada de erro
    },
    totalAgua: {
        type: Number,
        default: 0 // Inicializa o total de água como 0
    }
});

// Exportar o modelo
module.exports = mongoose.model('User', UserSchema);
