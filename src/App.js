import './App.css';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, createRef } from 'react';
const socket = io("https://0ed3-3-110-41-87.ngrok.io")

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
            console.log("Offer Made")
            await pc.setRemoteDescription(desc);
            while(queue.length!=0){
              pc.addIceCandidate(queue.shift());
            }
            const stream =
              await navigator.mediaDevices.getUserMedia(constraints);
            stream.getTracks().forEach((track) =>
              pc.addTrack(track, stream));
            await pc.setLocalDescription(await pc.createAnswer());
            console.log(pc.localDescription)
            socket.emit('message', { desc: pc.localDescription,"roomId": roomName});
          } else if (desc.type === 'answer') {
            console.log("Answered")
            await pc.setRemoteDescription(desc);
          } else {
            console.log('Unsupported SDP type.');
          }
        } else if (candidate) {
          if (!pc || !pc.remoteDescription) {
            queue.push(candidate);
          } else {
            await pc.addIceCandidate(candidate);
          }
        }
      } catch (err) {
        console.error(err);
      }
    })
    pc.ontrack = (event) => {
      if (remoteView.current.srcObject || !pc.remoteDescription) return;
      console.log("Remote Stream: ",event.streams)
      remoteView.current.srcObject = event.streams[0];
    }
    return () => {
      socket.emit("unsubscribe", roomName)
    }
  }, []);
  async function start() {
    try {
      // Get local stream, show it in self-view, and add it to be sent.
      var stream =
        await navigator.mediaDevices.getUserMedia({
          audio:false,
          video:true
        });
      stream.getTracks().forEach((track) =>
        pc.addTrack(track, stream));
      console.log("My Stream: ",stream);
      // stream =
      //   await navigator.mediaDevices.getUserMedia({
      //     audio: false,
      //     video: true
      //   });
      selfView.current.srcObject = stream;
    } catch (err) {
      console.error(err);
    }
  }
  return (<>
    <h2>In progress</h2>
    <video autoPlay playsInline ref={remoteView}></video>
    <video autoPlay playsInline ref={selfView}></video>
    <button onClick={start}>Start</button>
  </>)
}

export default App;
