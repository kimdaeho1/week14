// src/App.js
import React, { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [myId, setMyId] = useState("");
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]); // 사용자 입장 알림 메시지 저장
  const [isMuted, setIsMuted] = useState(false); // 마이크 상태
  const myAudio = useRef();
  const peersRef = useRef([]);
  const audioStream = useRef(); // 마이크 스트림

  useEffect(() => {
    // 방에 참가
    socket.emit("join-room", "room1");

    socket.on("joined", (id) => {
      setMyId(id);

      // 오디오 스트림 얻기
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          audioStream.current = stream;
          myAudio.current.srcObject = stream;

          socket.on("signal", (data) => {
            const item = peersRef.current.find((p) => p.peerID === data.callerId);
            if (item) {
              item.peer.signal(data.signal);
            }
          });

          // 새로 들어온 사용자와 연결
          socket.on("user-connected", (userId) => {
            const peer = createPeer(userId, socket.id, stream);
            peersRef.current.push({
              peerID: userId,
              peer,
            });
            setPeers((users) => [...users, peer]);
          });

          // 사용자 연결 해제
          socket.on("user-disconnected", (userId) => {
            const peerObj = peersRef.current.find((p) => p.peerID === userId);
            if (peerObj) {
              peerObj.peer.destroy();
            }
            const peers = peersRef.current.filter((p) => p.peerID !== userId);
            peersRef.current = peers;
            setPeers(peers);
          });
        });
    });

    // 새로운 사용자가 들어왔을 때 알림 표시
    socket.on("user-joined", (data) => {
      setMessages((msgs) => [...msgs, `${data.userId} has joined the room`]);
    });
  }, []);

  // 새로 들어온 사용자와 연결하기 위한 Peer 객체 생성
  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", {
        target: userToSignal,
        callerId,
        signal,
      });
    });

    return peer;
  }

  // 마이크 켜기/끄기 기능
  const toggleMute = () => {
    if (audioStream.current) {
      audioStream.current.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div>
      <h1>WebRTC 음성 채팅</h1>
      <audio ref={myAudio} autoPlay muted />
      {peers.map((peer, index) => (
        <AudioPlayer key={index} peer={peer} />
      ))}

      {/* 마이크 켜기/끄기 버튼 */}
      <button onClick={toggleMute}>
        {isMuted ? "마이크 켜기" : "마이크 끄기"}
      </button>

      {/* 사용자 입장 알림 표시 */}
      <div>
        <h2>알림</h2>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 다른 사용자의 오디오를 재생하는 컴포넌트
function AudioPlayer({ peer }) {
  const audioRef = useRef();

  useEffect(() => {
    peer.on("stream", (stream) => {
      audioRef.current.srcObject = stream;
    });
  }, [peer]);

  return <audio ref={audioRef} autoPlay />;
}

export default App;
