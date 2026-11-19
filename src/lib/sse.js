export async function* parseSSE(readableStream) {
  const decoder = new TextDecoder();
  let buf = "";

  for await (const chunk of readableStream) {
    buf += decoder.decode(chunk, { stream: true });

    const parts = buf.split(/\r?\n\r?\n/);
    buf = parts.pop();

    for (const block of parts) {
      const event = parseBlock(block);
      if (event) yield event;
    }
  }

  buf += decoder.decode();
  if (buf.trim()) {
    const event = parseBlock(buf);
    if (event) yield event;
  }
}

function parseBlock(block) {
  let eventType = "";
  const dataLines = [];

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(":")) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const field = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1).replace(/^ /, "");

    if (field === "event") {
      eventType = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0 && !eventType) return null;

  return {
    event: eventType,
    data: dataLines.join("\n")
  };
}
