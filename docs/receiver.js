// import { socket, setRoomId, channel } from "./common.js";

// sessionStorage.setItem("role", "receiver");

// // JOIN ROOM
// document.getElementById("connectBtn").onclick = () => {
//     document.getElementById("connectingIndicator").classList.remove("hidden");
//     const room = document.getElementById("roomInput").value;
//     document.getElementById("roomDisplay").value = room;
//     joinRoom(room);
// };

// function joinRoom(room) {
//     if (!room.trim()) return alert("Please enter a room code");

//     setRoomId(room);

//     const payload = JSON.stringify({ type: "join", roomId: room });

//     if (socket.readyState === WebSocket.OPEN) socket.send(payload);
//     else socket.addEventListener("open", () => socket.send(payload), { once: true });
// }


// // WAIT FOR CHANNEL OPENED BY common.js
// let waitChannel = setInterval(() => {
//     if (channel && channel.readyState === "open") {
//         console.log("Receiver: DataChannel ready!");
//         clearInterval(waitChannel);

//         setupReceiver();
//     }
// }, 200);


// // MAIN RECEIVE LOGIC
// async function setupReceiver() {
//     console.log("Receiver listening for file data...");

//     // SELECT UI ELEMENTS
//     const bar = document.getElementById("receiveProgressBar");
//     const text = document.getElementById("receiveProgressText");

//     let incomingFile = null;
//     let receivedBytes = 0;

//     // Streaming variables
//     let fileHandle = null;
//     let writable = null;

//     // Fallback variables (RAM buffer)
//     let fileBuffer = [];
//     let useFallback = false;

//     channel.onmessage = async (event) => {

//         if (typeof event.data === "string") {
//             const msg = JSON.parse(event.data);

//             // File meta
//             if (msg.type === "file-meta") {
//                 incomingFile = msg;
//                 receivedBytes = 0;
//                 fileBuffer = []; // Reset buffer

//                 // Check API support
//                 if (!window.showSaveFilePicker) {
//                     useFallback = true;
//                     console.warn("FileSystem API not supported. Using RAM fallback.");

//                     if (!window.isSecureContext) {
//                         alert("⚠️ Warning: Your connection is not secure (HTTP). Using RAM compatibility mode.\n\nFiles larger than ~500MB may crash the browser.");
//                     } else {
//                         // Secure context but API not supported (e.g., Firefox, Safari, Android Chrome)
//                         console.log("Browser does not support FileSystem API. Using RAM fallback.");
//                     }
//                 } else {
//                     useFallback = false;
//                 }

//                 bar.style.width = "0%";
//                 text.textContent = `Ready to download: ${incomingFile.name} (${(incomingFile.size / (1024 * 1024)).toFixed(2)} MB)`;

//                 const acceptBtn = document.getElementById("acceptFileBtn");
//                 acceptBtn.classList.remove("hidden");
//                 acceptBtn.textContent = "Download " + incomingFile.name;

//                 acceptBtn.onclick = async () => {
//                     try {
//                         if (!useFallback) {
//                             // STREAMING MODE
//                             fileHandle = await window.showSaveFilePicker({
//                                 suggestedName: incomingFile.name,
//                             });
//                             writable = await fileHandle.createWritable();
//                             console.log("File stream opened.");
//                         } else {
//                             // FALLBACK MODE
//                             console.log("Using RAM buffer.");
//                         }

//                         // Hide button & Start
//                         acceptBtn.classList.add("hidden");
//                         text.textContent = "Starting transfer...";
//                         channel.send(JSON.stringify({ type: "file-accept" }));

//                     } catch (err) {
//                         console.error("File save error:", err);
//                         alert("Error: " + err.message);
//                     }
//                 };

//                 return;
//             }

//             // File end
//             if (msg.type === "file-end") {
//                 if (!useFallback) {
//                     // STREAMING: Close stream
//                     if (writable) await writable.close();
//                 } else {
//                     // FALLBACK: Create Blob and Download
//                     const blob = new Blob(fileBuffer);
//                     const link = document.createElement("a");
//                     link.href = URL.createObjectURL(blob);
//                     link.download = incomingFile.name;
//                     link.click();
//                 }

//                 bar.style.width = "100%";
//                 text.textContent = "100% received (Done)";
//                 return;
//             }
//             return;
//         }

//         // BINARY chunk
//         receivedBytes += event.data.byteLength;
//         const percent = Math.floor((receivedBytes / incomingFile.size) * 100);
//         bar.style.width = percent + "%";
//         text.textContent = percent + "% received";

//         if (!useFallback) {
//             // STREAMING: Write to disk
//             if (writable) await writable.write(event.data);
//         } else {
//             // FALLBACK: Store in RAM
//             fileBuffer.push(event.data);
//         }
//     };
// }

import { socket, setRoomId, channel } from "./common.js";

sessionStorage.setItem("role", "receiver");

// JOIN ROOM
document.getElementById("connectBtn").onclick = () => {

    document.getElementById("connectingIndicator").classList.remove("hidden");

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
async function setupReceiver() {
    console.log("Receiver listening for file data...");

    // SELECT UI ELEMENTS
    const bar = document.getElementById("receiveProgressBar");
    const text = document.getElementById("receiveProgressText");

    let incomingFile = null;
    let receivedBytes = 0;

    // Streaming variables
    let fileHandle = null;
    let writable = null;

    // Fallback variables (RAM buffer)
    let fileBuffer = [];
    let useFallback = false;

    channel.onmessage = async (event) => {

        if (typeof event.data === "string") {
            const msg = JSON.parse(event.data);

            // File meta
            if (msg.type === "file-meta") {
                incomingFile = msg;
                receivedBytes = 0;
                fileBuffer = []; // Reset buffer

                // Check API support
                console.log("Debug: isSecureContext =", window.isSecureContext);
                console.log("Debug: showSaveFilePicker =", !!window.showSaveFilePicker);

                if (!window.showSaveFilePicker) {
                    useFallback = true;
                    console.warn("FileSystem API not supported. Using RAM fallback.");

                    if (!window.isSecureContext) {
                        alert("⚠️ Warning: Your connection is not secure (HTTP). Using RAM compatibility mode.\n\nFiles larger than ~500MB may crash the browser.");
                    } else {
                        // Secure context but API not supported (e.g., Firefox, Safari, Android Chrome)
                        console.log("Browser does not support FileSystem API. Using RAM fallback.");
                    }
                } else {
                    useFallback = false;
                }

                bar.style.width = "0%";
                text.textContent = `Ready to download: ${incomingFile.name} (${(incomingFile.size / (1024 * 1024)).toFixed(2)} MB)`;

                const acceptBtn = document.getElementById("acceptFileBtn");
                acceptBtn.classList.remove("hidden");
                acceptBtn.textContent = "Download " + incomingFile.name;

                acceptBtn.onclick = async () => {
                    try {
                        if (!useFallback) {
                            // STREAMING MODE
                            fileHandle = await window.showSaveFilePicker({
                                suggestedName: incomingFile.name,
                            });
                            writable = await fileHandle.createWritable();
                            console.log("File stream opened.");
                        } else {
                            // FALLBACK MODE
                            console.log("Using RAM buffer.");
                        }

                        // Hide button & Start
                        acceptBtn.classList.add("hidden");
                        text.textContent = "Starting transfer...";
                        channel.send(JSON.stringify({ type: "file-accept" }));

                    } catch (err) {
                        console.error("File save error:", err);
                        alert("Error: " + err.message);
                    }
                };

                return;
            }

            // File end
            if (msg.type === "file-end") {
                if (!useFallback) {
                    // STREAMING: Close stream
                    if (writable) await writable.close();
                } else {
                    // FALLBACK: Create Blob and Download
                    const blob = new Blob(fileBuffer);
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = incomingFile.name;
                    link.click();
                }

                bar.style.width = "100%";
                text.textContent = "100% received (Done)";
                return;
            }
            return;
        }

        // BINARY chunk
        receivedBytes += event.data.byteLength;
        const percent = Math.floor((receivedBytes / incomingFile.size) * 100);
        bar.style.width = percent + "%";
        text.textContent = percent + "% received";

        if (!useFallback) {
            // STREAMING: Write to disk
            if (writable) await writable.write(event.data);
        } else {
            // FALLBACK: Store in RAM
            fileBuffer.push(event.data);
        }
    };
}
