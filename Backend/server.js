const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
console.log("Signaling server running on ws://localhost:3000");

const rooms = {}; // roomId → { a: ws, b: ws }

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);
        const { type, roomId } = data;

        if (!rooms[roomId]) rooms[roomId] = { a: null, b: null };
        const room = rooms[roomId];

        // Assign role on "join"
        if (type === "join") {
            if (!room.a) {
                room.a = ws;
                ws.role = "a";
                console.log(`Peer A joined room: ${roomId}`);
            } else if (!room.b) {
                room.b = ws;
                ws.role = "b";
                console.log(`Peer B joined room: ${roomId}`);

                // Notify A that B joined
                room.a.send(JSON.stringify({ type: "ready" }));
            }
            return;
        }

        // Forward signaling
        if (type === "offer" && room.b) room.b.send(msg);
        if (type === "answer" && room.a) room.a.send(msg);
        if (type === "ice") {
            if (ws.role === "a" && room.b) room.b.send(msg);
            if (ws.role === "b" && room.a) room.a.send(msg);
        }
    });

    // Remove stale peer on close
    ws.on("close", () => {
        console.log("Client disconnected");

        for (const [roomId, room] of Object.entries(rooms)) {
            if (room.a === ws) {
                console.log(`Peer A left room ${roomId}`);
                room.a = null;
                if (room.b)
                    room.b.send(JSON.stringify({ type: "peer-left", role: "a" }));
            }
            if (room.b === ws) {
                console.log(`Peer B left room ${roomId}`);
                room.b = null;
                if (room.a)
                    room.a.send(JSON.stringify({ type: "peer-left", role: "b" }));
            }

            // Delete room if empty
            if (!room.a && !room.b) delete rooms[roomId];
        }
    });
});
