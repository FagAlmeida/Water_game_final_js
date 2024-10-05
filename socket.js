// socket.js
const { Server } = require('socket.io');

function setupSocket(server) {
    const io = new Server(server);

    io.on('connection', (socket) => {
        console.log('Um usuário se conectou');

        // Evento quando um participante entra em uma sala
        socket.on('joinRoom', (roomToken) => {
            socket.join(roomToken);
            console.log(`Usuário entrou na sala: ${roomToken}`);
        });

        // Evento quando um participante adiciona água
        socket.on('waterAdded', (data) => {
            console.log(`${data.username} adicionou ${data.amount} ml de água na sala ${data.roomToken}.`);
            
            // Envia a atualização para todos os participantes da sala, incluindo o próprio usuário
            io.to(data.roomToken).emit('waterUpdate', data);
        });

        // Evento de desconexão
        socket.on('disconnect', () => {
            console.log('Um usuário se desconectou');
        });
    });

    return io; // Retorna a instância do Socket.IO para uso no servidor
}

module.exports = setupSocket;
