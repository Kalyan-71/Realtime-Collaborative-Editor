import React, { useEffect, useRef, useState } from 'react'
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import { 
  Navigate, 
  useLocation, 
  useNavigate, 
  useParams 
} from 'react-router-dom';
import toast from 'react-hot-toast';


const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const reactNavigator = useNavigate();
  const {roomId} = useParams();

  useEffect(()=>{
    const init = async () =>{
      socketRef.current = await initSocket();

      socketRef.current.on('connect_error' , (err)=> handleErrors(err));
      socketRef.current.on('connect_failed' , (err)=> handleErrors(err));

      function handleErrors(e){
        console.log('socket error' , e);
        toast.error('Socket connection failed , try again later.');
        reactNavigator('/');
      }


      socketRef.current.emit(ACTIONS.JOIN ,{
        roomId,
        username:location.state?.username,//from the home page through navigate route
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({clients , username , socketId}) =>{
          if(username !== location.state?.username){//remove self or echo of user joined 
              toast.success(`${username} joined the room.`);
              console.log(`${username} joined`);
          }

          setClients(clients);//client = {socketid : username} example

          socketRef.current.emit(ACTIONS.SYNC_CODE , {
            code : codeRef.current,
            socketId,
          });
        }
      )

      socketRef.current.on(
        ACTIONS.DISCONNECTED,
        ({socketId , username})=>{
          toast.success(`${username} left the room`);
          setClients((prev)=>{//remove icon who left user
            return prev.filter(
              (client) => client.socketId !== socketId
            );
          })
        }
      )


    };
    init();

    return ()=>{//cleaning function in use effect
      //remove data leaks
      socketRef.current.disconnect();//closing all events
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    }
  },[])

  const [clients, setClients] = useState([
    // {socketId: 1,username:'Rajesh M'},
    // {socketId: 2 ,username:'john doe'},
    // {socketId: 4 ,username:'john doe'},
    // {socketId: 5 ,username:'john doe'},
  ]);


  if(!location.state){
    return <Navigate to="/" />;///where usenavigate cannot use there Navigate comonent is used (like return)
  }


   async function copyRoomId(){
    try{
        await navigator.clipboard.writeText(roomId);
        toast.success('Room Id has been copied to your clipboard');
    }catch(err){
        toast.error('Could not copy the Room ID');
        console.error(err);
    }
  }

  function leaveRoom(){
    reactNavigator('/');
  }

  return (
    <div className='mainWrap'>
      <div className='aside'>
        <div className='asideInner'>
            <div className='logo'>
              <img 
                className='logoImage' 
                src='/realtime-editor.png' 
                alt='logo'
               />

            </div>
            <h3>Connected</h3>
            <div className='clientList'>
              {
                clients.map((client)=>(
                  <Client
                    key ={client.socketId}
                    username = {client.username}

                  />
                ))
              }

            </div>
        </div>
              
            <button className='btn copyBtn' onClick={copyRoomId}>Copy ROOM ID</button>
            <button className='btn leaveBtn' onClick={leaveRoom}>Leave</button>
        </div>

        <div className='editorWrap'>
          <Editor 
            socketRef={socketRef}  
            roomId = {roomId} 
            onCodeChange = {(code) => {
              codeRef.current = code;
            }}
          />
      </div>
    </div>
  )
}

export default EditorPage