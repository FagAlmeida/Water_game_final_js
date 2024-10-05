const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIO = require('socket.io');
const User = require('./models/User');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configurações do servidor
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Conexão com o MongoDB
mongoose.connect('mongodb+srv://fagalmeida2:buceta@cluster0.ypgke.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao se conectar ao MongoDB:', err));

// Configurações da sessão
app.use(session({
    secret: 'seu-segredo', // Substitua por um segredo seguro
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mude para true se usar HTTPS
}));

// Middleware de autenticação
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Rota da página inicial
app.get('/', (req, res) => {
    res.render('index', { title: 'Water Game' });
});

// Rota para exibir o formulário de registro
app.get('/register', (req, res) => {
    res.render('register', { title: 'Registrar Usuário' });
});

// Rota de registro
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const userExistente = await User.findOne({ email });
        if (userExistente) {
            return res.send('Usuário já registrado');
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        const novoUsuario = new User({
            username,
            email,
            password: senhaHash
        });

        await novoUsuario.save();
        res.send('Usuário registrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).send('Erro ao registrar usuário');
    }
});

// Rota da página de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Rota de autenticação
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send('Usuário não encontrado');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Senha inválida');
        }

        req.session.userId = user._id;
        req.session.username = user.username; // Adiciona o username à sessão
        req.session.totalAgua = 0; // Inicializa a quantidade de água na sessão
        res.redirect('/rooms');
    } catch (error) {
        console.error('Erro ao autenticar usuário:', error);
        res.status(500).send('Erro no login');
    }
});

// Rota para a tela de salas
app.get('/rooms', isAuthenticated, (req, res) => {
    res.render('rooms');
});

// Criar uma sala
app.post('/rooms/create', isAuthenticated, async (req, res) => {
    const token = uuidv4();

    try {
        const novaSala = new Room({
            token,
            users: [req.session.userId]
        });
        await novaSala.save();

        req.session.token = token;
        res.redirect('/game');
    } catch (error) {
        console.error('Erro ao criar sala:', error);
        res.status(500).send('Erro ao criar sala');
    }
});

// Entrar em uma sala existente
app.post('/rooms/join', isAuthenticated, async (req, res) => {
    const { token } = req.body;

    try {
        const sala = await Room.findOne({ token });
        if (!sala) {
            return res.status(400).send('Sala não encontrada');
        }

        sala.users.push(req.session.userId);
        await sala.save();

        req.session.token = token;
        res.redirect('/game');
    } catch (error) {
        console.error('Erro ao entrar na sala:', error);
        res.status(500).send('Erro ao entrar na sala');
    }
});

// Rota para o jogo
app.get('/game', isAuthenticated, async (req, res) => {
    try {
        const sala = await Room.findOne({ token: req.session.token }).populate('users');
        if (!sala) {
            return res.status(404).send('Sala não encontrada');
        }

        const participantes = await Promise.all(sala.users.map(async (userId) => {
            const user = await User.findById(userId);
            return { username: user.username, totalAgua: user.totalAgua };
        }));

        res.render('game', {
            totalAgua: req.session.totalAgua || 0,
            roomToken: sala.token || 'Nenhum token gerado',
            participantes,
            username: req.session.username // Passa o username ao template
        });
    } catch (error) {
        console.error('Erro ao carregar jogo:', error);
        res.status(500).send('Erro ao carregar jogo');
    }
});

// Rota para adicionar água
app.post('/game/add-water', isAuthenticated, async (req, res) => {
    const { quantidade } = req.body;

    try {
        const user = await User.findById(req.session.userId);
        user.totalAgua += parseInt(quantidade);
        await user.save();

        req.session.totalAgua = user.totalAgua;

        if (req.session.totalAgua >= 1000) {
            const litros = (req.session.totalAgua / 1000).toFixed(2);
            console.log(`Total de água: ${litros} L`);
        }

        res.redirect('/game');
    } catch (error) {
        console.error('Erro ao adicionar água:', error);
        res.status(500).send('Erro ao adicionar água');
    }
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
    console.log('Um usuário se conectou');

    socket.on('waterAdded', async (data) => {
        console.log(`${data.username} adicionou ${data.amount} ml de água.`);

        const user = await User.findOne({ username: data.username });
        user.totalAgua += data.amount;
        await user.save();

        io.emit('waterUpdate', {
            username: data.username,
            totalAgua: user.totalAgua
        });
    });

    socket.on('disconnect', () => {
        console.log('Um usuário se desconectou');
    });
});

// Porta e inicialização do servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
