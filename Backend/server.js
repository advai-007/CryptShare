const WebSocket = require("ws");
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

console.log("Starting Signaling Server...");

const rooms = {};

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);
        const { type, roomId } = data;

        if (!rooms[roomId]) rooms[roomId] = { a: null, b: null };
        const room = rooms[roomId];

        if (type === "join") {
            if (!room.a) {
                room.a = ws;
                ws.role = "a";
                console.log(`Peer A joined room ${roomId}`);
            } else if (!room.b) {
                room.b = ws;
                ws.role = "b";
                console.log(`Peer B joined room ${roomId}`);

                if (room.a.readyState === WebSocket.OPEN) {
                    room.a.send(JSON.stringify({ type: "ready" }));
                }
            }
            return;
        }

        if (type === "offer" && room.b?.readyState === WebSocket.OPEN) room.b.send(msg);
        if (type === "answer" && room.a?.readyState === WebSocket.OPEN) room.a.send(msg);

        if (type === "ice") {
            if (ws.role === "a" && room.b?.readyState === WebSocket.OPEN) room.b.send(msg);
            if (ws.role === "b" && room.a?.readyState === WebSocket.OPEN) room.a.send(msg);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        for (const [roomId, room] of Object.entries(rooms)) {
            if (room.a === ws) {
                room.a = null;
                console.log(`Peer A left ${roomId}`);
                if (room.b?.readyState === WebSocket.OPEN)
                    room.b.send(JSON.stringify({ type: "peer-left", role: "a" }));
            }
            if (room.b === ws) {
                room.b = null;
                console.log(`Peer B left ${roomId}`);
                if (room.a?.readyState === WebSocket.OPEN)
                    room.a.send(JSON.stringify({ type: "peer-left", role: "b" }));
            }
            if (!room.a && !room.b) delete rooms[roomId];
        }
    });
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Signaling server running on port ${PORT}`);
});
