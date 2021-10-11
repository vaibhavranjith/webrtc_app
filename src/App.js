import './App.css';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, createRef } from 'react';
const socket = io("https://58a7-3-110-41-87.ngrok.io")

function App() {
  var userId = uuidv4();
  var roomName = "room1";
  var remoteView = createRef()
  var selfView = createRef()
  var queue = [];
  var constraints = { audio: false, video: true };
  var configuration = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      {
        urls: ['turn:numb.viagenie.ca'],
        username: "vaibhavranjith98@gmail.com",
        credential: "waxNest"
      }
    ]
  };
  var pc = new RTCPeerConnection(configuration);
  useEffect(() => {
    socket.on('log', (log) => {
      console.log(log)
    })
    socket.emit('create or join', roomName);
    pc.onicecandidate = ({ candidate }) => socket.emit('message', { candidate, "roomId": roomName, });
    pc.onnegotiationneeded = async () => {
      try {
        await pc.setLocalDescription(await pc.createOffer());
        socket.emit('message', {
          "comments": `Message from ${userId}`,
          "roomId": roomName,
          "desc": pc.localDescription
        });
      } catch (err) {
        console.error(err);
      }
    };

    socket.on("reply", async ({ desc, candidate }) => {
      try {
        if (desc) {
          // If you get an offer, you need to reply with an answer.
          console.log("Reply for RTC connection recieved");
          if (desc.type === 'offer') {
            await pc.setRemoteDescription(desc);
            while(queue.length!=0){
              pc.addIceCandidate(queue.shift());
            }
            const stream =
              await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach((track) =>
              pc.addTrack(track, stream));
            await pc.setLocalDescription(await pc.createAnswer());
            socket.emit({ desc: pc.localDescription });
          } else if (desc.type === 'answer') {
            await pc.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          if (!pc || !pc.remoteDescription) {
            queue.push(candidate);
          } else {
            console.log(candidate);
            await pc.addIceCandidate(candidate);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })
    return () => {
      socket.emit("unsubscribe", roomName)
    }
  }, []);
  async function start() {
    try {
      // Get local stream, show it in self-view, and add it to be sent.
      const stream =
        await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) =>
        pc.addTrack(track, stream));
      console.log(stream);
      selfView.current.srcObject = stream;
    } catch (err) {
      console.error(err);
    }
  }
  pc.ontrack = (event) => {
    if (remoteView.current.srcObject || !pc.remoteDescription) return;
    console.log(event.streams[0])
    remoteView.current.srcObject = event.streams[0];
  }
  return (<>
    <h2>In progress</h2>
    <video autoPlay ref={remoteView}></video>
    <video autoPlay ref={selfView}></video>
    <button onClick={start}>Start</button>
  </>)
}

export default App;
