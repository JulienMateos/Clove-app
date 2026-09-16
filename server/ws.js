// ---------------------------------------------------------------------------
// Minimal RFC 6455 WebSocket server — zero dependencies (Node built-ins only).
// Supports text frames, ping/pong, and close. Enough for Clove's realtime push.
// ---------------------------------------------------------------------------
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class CloveSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.OPEN = 1;
    this.readyState = 1;
    this._buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => {
      this.readyState = 3;
      this.emit('close');
    });
    socket.on('error', (err) => this.emit('error', err));
  }

  _onData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
    // Parse as many complete frames as we have.
    while (true) {
      const frame = this._parseFrame();
      if (!frame) break;
      const { opcode, payload } = frame;
      if (opcode === 0x8) {
        // close
        this.close();
        return;
      } else if (opcode === 0x9) {
        // ping -> pong
        this._send(0xa, payload);
      } else if (opcode === 0x1) {
        // text
        this.emit('message', payload.toString('utf8'));
      }
      // ignore continuation/binary for our use-case
    }
  }

  _parseFrame() {
    const buf = this._buffer;
    if (buf.length < 2) return null;
    const b0 = buf[0];
    const b1 = buf[1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) === 0x80;
    let len = b1 & 0x7f;
    let offset = 2;

    if (len === 126) {
      if (buf.length < offset + 2) return null;
      len = buf.readUInt16BE(offset);
      offset += 2;
    } else if (len === 127) {
      if (buf.length < offset + 8) return null;
      // We only handle up to 32-bit lengths (plenty for our payloads).
      len = Number(buf.readBigUInt64BE(offset));
      offset += 8;
    }

    let maskKey;
    if (masked) {
      if (buf.length < offset + 4) return null;
      maskKey = buf.subarray(offset, offset + 4);
      offset += 4;
    }

    if (buf.length < offset + len) return null;

    let payload = buf.subarray(offset, offset + len);
    if (masked) {
      const unmasked = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) unmasked[i] = payload[i] ^ maskKey[i & 3];
      payload = unmasked;
    }

    this._buffer = buf.subarray(offset + len);
    return { opcode, payload };
  }

  _send(opcode, payload) {
    if (this.readyState !== 1) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    try {
      this.socket.write(Buffer.concat([header, payload]));
    } catch {
      this.close();
    }
  }

  send(data) {
    this._send(0x1, Buffer.from(String(data), 'utf8'));
  }

  close() {
    if (this.readyState === 3) return;
    try {
      this._send(0x8, Buffer.alloc(0));
      this.socket.end();
    } catch {}
    this.readyState = 3;
  }
}

// Attach a WebSocket handler to an http.Server for a given path.
export function attachWebSocket(server, path, onConnection) {
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== path) {
      socket.destroy();
      return;
    }
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    const ws = new CloveSocket(socket);
    onConnection(ws, req);
  });
}
