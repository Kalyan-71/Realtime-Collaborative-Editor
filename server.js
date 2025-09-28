import express from 'express'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import {Server} from 'socket.io';
import ACTIONS from './src/Actions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.static('build'));///for deployment static html file
app.use((req,res,next)=>{
    res.sendFile(path.join(__dirname,'build' , 'index.html'));
})

const io = new Server(server);


///stores all users connected ws
const userSocketMap = {
    ///example
    // "sdfsdgddfggfgdfgdfdf":"rajesh hh "  ///socket id : username
};


function getAllConnectedClients(roomId){
    //to use Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId)=>{
            return {
                socketId,
                username:userSocketMap[socketId],
            };
        },
    );
}

io.on('connection' , (socket)=>{
    // console.log(`socket connected` , socket.id);


    socket.on(ACTIONS.JOIN ,({roomId , username})=>{
        userSocketMap[socket.id] = username;

        socket.join(roomId);//join to same room

        const clients = getAllConnectedClients(roomId);
        // console.log(clients);

        clients.forEach(({socketId})=>{
            io.to(socketId).emit(ACTIONS.JOINED ,{//io.to only to that client
                clients,
                username,
                socketId:socket.id,
            })
        })
    });

    socket.on('disconnecting' , ()=>{
        const rooms = [...socket.rooms];
        
        rooms.forEach((roomId) =>{
            socket.in(roomId).emit(ACTIONS.DISCONNECTED,{///socket.in for that room
                socketId:socket.id,
                username:userSocketMap[socket.id],
            });
        })

        delete userSocketMap[socket.id];
        socket.leave();
    })

    socket.on(ACTIONS.CODE_CHANGE,({code , roomId})=>{///socket.on to listen event in room
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE , {code});
    });

    socket.on(ACTIONS.SYNC_CODE , ({socketId , code})=>{
        io.to(socketId).emit(ACTIONS.CODE_CHANGE , {code});
    })
})


const PORT = process.env.PORT || 8000;
server.listen(PORT , () => console.log(`Listening on port ${PORT}`));

