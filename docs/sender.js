import { socket, setRoomId, channel } from "./common.js";

// Define role once
sessionStorage.setItem("role", "sender");

let room;

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

document.getElementById("copyCodeBtn").onclick = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(room);
    } else {
        // Fallback for HTTP or Android 
        const temp = document.createElement("textarea");
        temp.value = room;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
    }
};

function joinRoom(room) {
    setRoomId(room);

    const payload = JSON.stringify({ type: "join", roomId: room });

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
    } else {
        socket.addEventListener("open", () => socket.send(payload), { once: true });
    }
}

document.addEventListener("DOMContentLoaded", () => {

    if (!sessionStorage.getItem("roomGenerated")) {
        room = generateRoomId();
        sessionStorage.setItem("roomGenerated", room);
    } else {
        room = sessionStorage.getItem("roomGenerated");
    }

    document.getElementById("roomCode").textContent = room;
    joinRoom(room);

    document.getElementById("send-files-btn").onclick = () => {
        if (selectedFiles.length === 0) {
            alert("Please select files to send.");
            return;
        }

        selectedFiles.forEach(file => {
            sendFile(file);
        })
    }


    // ======================================================
    // FILE PICKER + DRAG & DROP
    // ======================================================
    let selectedFiles = [];

    const fileInput = document.getElementById("file-input");
    const chooseFileBtn = document.getElementById("choose-file-btn");
    const dropZone = document.getElementById("drop-zone");

    const fileList = document.getElementById("file-list");
    const emptyState = document.getElementById("state-empty");
    const selectedState = document.getElementById("state-selected");

    chooseFileBtn.onclick = () => fileInput.click();
    fileInput.onchange = () => addFiles([...fileInput.files]);

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add("border-primary");
    };
    dropZone.ondragleave = () => dropZone.classList.remove("border-primary");
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("border-primary");
        addFiles([...e.dataTransfer.files]);
    };

    function addFiles(files) {
        selectedFiles.push(...files);
        renderList();
        emptyState.classList.add("hidden");
        selectedState.classList.remove("hidden");
    }

    function renderList() {
        fileList.innerHTML = "";

        selectedFiles.forEach((file, i) => {
            const item = document.createElement("div");
            item.className = "flex items-center gap-4 bg-[#1a2632] p-3 rounded-lg justify-between";

            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

            item.innerHTML = `
                <div class="flex items-center gap-4 min-w-0">
                    <div class="size-10 flex items-center justify-center bg-gray-700 rounded-lg">
                        <span class="material-symbols-outlined">description</span>
                    </div>
                    <div class="min-w-0">
                        <p class="truncate">${file.name}</p>
                        <p class="text-sm text-gray-400">${sizeMB} MB</p>
                    </div>
                </div>
                <button data-index="${i}">
                    <span class="material-symbols-outlined text-gray-400 hover:text-white">close</span>
                </button>
            `;

            fileList.appendChild(item);
        });

        // remove file
        fileList.querySelectorAll("button").forEach(btn => {
            btn.onclick = () => {
                const index = btn.dataset.index;
                selectedFiles.splice(index, 1);
                if (selectedFiles.length === 0) {
                    emptyState.classList.remove("hidden");
                    selectedState.classList.add("hidden");
                }
                renderList();
            };
        });
    }

    // Add more files
    document.getElementById("add-more-files").onclick = () => fileInput.click();
});
// --------------------------------------------------------
// FILE SENDING LOGIC
// --------------------------------------------------------



function sendFile(file) {
    const CHUNK_SIZE = 16 * 1024; // 16 KB
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    const speedText = document.getElementById("speed-text");
    const progressState = document.getElementById("state-progress");

    progressState.classList.remove("hidden");

    let offset = 0;
    let bytesSent = 0;
    const startTime = Date.now(); // mark the start time

    const reader = new FileReader();

    // avoid buffer overflow
    channel.bufferedAmountLowThreshold = 64 * 1024;

    // Send metadata
    channel.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size
    }));

    channel.onbufferedamountlow = () => readNextChunk();

    reader.onload = (event) => {
        try {
            channel.send(event.target.result);
        } catch (err) {
            console.error("Send failed:", err);
            return;
        }

        offset += CHUNK_SIZE;
        bytesSent += CHUNK_SIZE;

        // progress
        const percent = Math.floor((offset / file.size) * 100);
        progressBar.style.width = percent + "%";
        progressText.textContent = `${percent}% complete`;

        // speed
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMB = (bytesSent / (1024 * 1024)) / elapsedSec;
        speedText.textContent = speedMB.toFixed(2) + " MB/s";

        if (offset < file.size) {
            readNextChunk();
        } else {
            channel.send(JSON.stringify({ type: "file-end" }));
            progressBar.style.width = "100%";
            progressText.textContent = "100% complete";
            speedText.textContent = "Done";
        }
    };

    function readNextChunk() {
        if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) return;

        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(chunk);
    }

    channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "file-accept") {
            readNextChunk();
        }
    };
}
