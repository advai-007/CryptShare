// import { socket, setRoomId, channel } from "./common.js";

// sessionStorage.setItem("role", "receiver");

// // -------------------------------
// // JOIN ROOM
// // -------------------------------
// function joinRoom(room) {
//     if (!room.trim()) {
//         alert("Please enter a room code");
//         return;
//     }

//     setRoomId(room);

//     const payload = JSON.stringify({
//         type: "join",
//         roomId: room
//     });

//     if (socket.readyState === WebSocket.OPEN) {
//         socket.send(payload);
//     } else {
//         socket.addEventListener("open", () => socket.send(payload), { once: true });
//     }
// }

// // Join button
// document.getElementById("connectBtn").onclick = () => {
//     const room = document.getElementById("roomInput").value;
//     document.getElementById("roomDisplay").value = room;
//     joinRoom(room);
// };



// // ================================================
// // FILE RECEIVING LOGIC
// // ================================================

// // Channel becomes available LATER, not immediately
// // So wait until DataChannel is created & open
// let waitChannel = setInterval(() => {
//     if (channel && channel.readyState === "open") {
//         console.log("Receiver: DataChannel ready!");
//         clearInterval(waitChannel);
//         setupReceiver();
//     }
// }, 200);


// function setupReceiver() {
//     console.log("Receiver listening for file data...");

//     let incomingFile = null;
//     let fileBuffer = [];
//     let receivedBytes = 0;

//     channel.onmessage = (event) => {

//         // -------------------------
//         // TEXT MESSAGES (metadata)
//         // -------------------------
//         if (typeof event.data === "string") {
//             const msg = JSON.parse(event.data);

//             // File starting
//             if (msg.type === "file-meta") {
//                 incomingFile = msg;        // { name, size }
//                 fileBuffer = [];
//                 receivedBytes = 0;

//                 console.log(`Receiving file: ${msg.name} (${msg.size} bytes)`);
//                 return;
//             }

//             // File finished
//             if (msg.type === "file-end") {
//                 const blob = new Blob(fileBuffer);
//                 const link = document.createElement("a");
//                 link.href = URL.createObjectURL(blob);
//                 link.download = incomingFile.name;
//                 link.click();

//                 console.log("File download complete:", incomingFile.name);
//                 return;
//             }

//             return;
//         }

//         // -------------------------
//         // BINARY CHUNK
//         // -------------------------
//         fileBuffer.push(event.data);
//         receivedBytes += event.data.byteLength;

//         const percent = Math.floor((receivedBytes / incomingFile.size) * 100);
//         console.log(`Receiver Progress: ${percent}%`);
//     };
// }

import { socket, setRoomId, channel } from "./common.js";

sessionStorage.setItem("role", "receiver");

// JOIN ROOM
document.getElementById("connectBtn").onclick = () => {
    const room = document.getElementById("roomInput").value;
    document.getElementById("roomDisplay").value = room;
    joinRoom(room);
};

function joinRoom(room) {
    if (!room.trim()) return alert("Please enter a room code");

    setRoomId(room);

    const payload = JSON.stringify({ type: "join", roomId: room });

    if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    else socket.addEventListener("open", () => socket.send(payload), { once: true });
}


// WAIT FOR CHANNEL OPENED BY common.js
let waitChannel = setInterval(() => {
    if (channel && channel.readyState === "open") {
        console.log("Receiver: DataChannel ready!");
        clearInterval(waitChannel);

        setupReceiver();
    }
}, 200);


// MAIN RECEIVE LOGIC
function setupReceiver() {
    console.log("Receiver listening for file data...");

    // SELECT UI ELEMENTS (now visible)
    const bar   = document.getElementById("receiveProgressBar");
    const text  = document.getElementById("receiveProgressText");

    let incomingFile = null;
    let fileBuffer = [];
    let receivedBytes = 0;

    channel.onmessage = (event) => {

        if (typeof event.data === "string") {
            const msg = JSON.parse(event.data);

            // File meta
            if (msg.type === "file-meta") {
                incomingFile = msg;
                fileBuffer = [];
                receivedBytes = 0;

                bar.style.width = "0%";
                text.textContent = "0% received";

                return;
            }

            // File end
            if (msg.type === "file-end") {
                const blob = new Blob(fileBuffer);
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = incomingFile.name;
                link.click();

                bar.style.width = "100%";
                text.textContent = "100% received";

                return;
            }
            return;
        }

        // BINARY chunk
        fileBuffer.push(event.data);
        receivedBytes += event.data.byteLength;

        const percent = Math.floor((receivedBytes / incomingFile.size) * 100);
        bar.style.width = percent + "%";
        text.textContent = percent + "% received";
    };
}

