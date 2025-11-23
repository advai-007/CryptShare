export const socket = new WebSocket("wss://cryptshare-ijwg.onrender.com");

let pc;
export let channel;
let roomId = null;

// --------------------------------------------------------
// ROOM ID SETTER
// --------------------------------------------------------
export function setRoomId(id) {
    roomId = id;
}

export function updateConnectionUI() {
    const connecting = document.getElementById("connectingIndicator");
    const connected = document.getElementById("connectedIndicator");

    if (connecting) connecting.style.display = "none";
    if (connected) connected.style.display = "block";

}

// --------------------------------------------------------
// WEBSOCKET SIGNALING MESSAGE HANDLER
// --------------------------------------------------------
socket.onmessage = async (event) => {
    let text = event.data;
    if (text instanceof Blob) text = await text.text();

    const data = JSON.parse(text);
    // ----------------------------------------------------
    // PEER A → "ready" from server
    // ----------------------------------------------------
    if (data.type === "ready") {
        await createPeer("A");
        createDataChannel();

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.send(JSON.stringify({
            type: "offer",
            roomId,
            offer
        }));

        return;
    }

    // ----------------------------------------------------
    // PEER B receives Offer
    // ----------------------------------------------------
    if (data.type === "offer") {
        await createPeer("B");

        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.send(JSON.stringify({
            type: "answer",
            roomId,
            answer
        }));

        return;
    }

    // ----------------------------------------------------
    // PEER A receives Answer
    // ----------------------------------------------------
    if (data.type === "answer") {
        await pc.setRemoteDescription(data.answer);
        return;
    }

    // ----------------------------------------------------
    // ICE Candidates
    // ----------------------------------------------------
    if (data.type === "ice") {
        if (data.candidate && pc) {
            await pc.addIceCandidate(data.candidate);
        }
    }
};

// --------------------------------------------------------
// CREATE PEER
// --------------------------------------------------------
async function createPeer(role) {
    pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                roomId,
                candidate: event.candidate
            }));
        }
    };

    // Receiver side creates channel here
    pc.ondatachannel = (event) => {
        channel = event.channel;

        channel.onopen = () => {
            console.log("DataChannel OPEN (Receiver)");
            updateConnectionUI();

            if (sessionStorage.getItem("role") === "receiver") {
                //safeShowTransferUI(); // SPA version
                console.log("Receiver ready to receive files.");
                document.getElementById("before-connecting").classList.add("hidden");
                document.getElementById("after-connecting").classList.remove("hidden");
            }
        };
    };
}



// --------------------------------------------------------
// SENDER CREATES DATACHANNEL
// --------------------------------------------------------
function createDataChannel() {
    channel = pc.createDataChannel("chat");

    channel.onopen = () => {
        console.log("DataChannel OPEN (Sender)");
        updateConnectionUI();

        if (sessionStorage.getItem("role") === "sender") {
            //safeShowTransferUI(); // 🔥 FIXED — No more null error
            console.log("Sender ready to transfer files.");
            document.getElementById("page-room").classList.add("hidden");
            document.getElementById("page-transfer").classList.remove("hidden");

        }
    };
}

