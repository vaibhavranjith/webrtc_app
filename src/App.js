import './App.css';
import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, createRef } from 'react';
const socket = io("http://3.110.41.87:3001/")

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
  var dataChannel= pc.createDataChannel("Local channel");
  useEffect(() => {
    socket.on('log', (log) => {
      console.log(log)
    })
    socket.emit('create or join', roomName);
    pc.ondatachannel = function (event) {
      var channel = event.channel;
      channel.onopen = function (event) {
        channel.send('Hi back!')
      }
      channel.onmessage = function (event) {
        console.log(event.data);
      }
    }
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
            while(queue.length!=0)
              pc.addIceCandidate(queue.shift());
            dataChannel.onopen = function (event) {
              console.log("local data channel opened")
              dataChannel.send('Hi you!');
            }
            dataChannel.onmessage = function (event) {
              console.log("Got message")
              console.log(event.data);
            }
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
    return () => {
      socket.emit("unsubscribe", roomName)
    }
  }, []);
  async function start() {
    try {
      pc.onnegotiationneeded();
    } catch (err) {
      console.error(err);
    }
  }
  return (<>
    <h2>In progress</h2>
    <video autoPlay playsInline ref={remoteView}></video>
    <video autoPlay playsInline ref={selfView}></video>
    <button onClick={start}>Start</button>
    <button disabled={dataChannel.readyState} onClick={()=>dataChannel.send("SEND")}>Send Message</button>
  </>)
}

export default App;
