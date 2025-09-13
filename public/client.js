const captions = window.document.getElementById("captions");

let fullTranscriptText = "";
let startTime;
let timerInterval;

function updateWordCount() {
  const words = fullTranscriptText.trim().split(/\s+/).filter(word => word.length > 0).length;
  document.getElementById("word-count").innerText = `Words: ${words}`;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
  if (startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("timer").innerText = formatTime(elapsed);
  }
}

async function getMicrophone() {
  const userMedia = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  return new MediaRecorder(userMedia);
}

async function openMicrophone(microphone, socket) {
  await microphone.start(500);

  microphone.onstart = () => {
    console.log("client: microphone opened");
    document.body.classList.add("recording");
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  };

  microphone.onstop = () => {
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
    clearInterval(timerInterval);
  };

  microphone.ondataavailable = (e) => {
    const data = e.data;
    console.log("client: sent data to websocket");
    socket.send(data);
  };
}

async function closeMicrophone(microphone) {
  microphone.stop();
  clearInterval(timerInterval);
  document.getElementById("timer").innerText = "00:00:00";
}

async function start(socket) {
  const listenButton = document.getElementById("record");
  let microphone;

  console.log("client: waiting to open microphone");

  listenButton.addEventListener("click", async () => {
    if (!microphone) {
      // open and close the microphone
      microphone = await getMicrophone();
      await openMicrophone(microphone, socket);
    } else {
      await closeMicrophone(microphone);
      microphone = undefined;
    }
  });
}

async function getTempToken() {
  const result = await fetch("/token");
  const json = await result.json();

  return json.access_token;
}

window.addEventListener("load", async () => {
  const token = await getTempToken();

  const { createClient } = deepgram;
  const _deepgram = createClient({ accessToken: token });

  const socket = _deepgram.listen.live({ model: "nova-3", smart_format: true });

  socket.on("open", async () => {
    console.log("client: connected to websocket");

    socket.on("Results", (data) => {
      console.log(data);

      const transcript = data.channel.alternatives[0].transcript;

      if (transcript !== "") {
        captions.innerHTML = transcript ? `<span>${transcript}</span>` : "";
        fullTranscriptText += transcript + " ";
        document.getElementById("full-transcript").innerText = fullTranscriptText;
        updateWordCount();
        // Auto-scroll to bottom
        const transcriptDiv = document.getElementById("full-transcript");
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
      }
    });

    socket.on("error", (e) => console.error(e));

    socket.on("warning", (e) => console.warn(e));

    socket.on("Metadata", (e) => console.log(e));

    socket.on("close", (e) => console.log(e));

    await start(socket);
  });

  document.getElementById("copy-btn").addEventListener("click", async () => {
    const text = fullTranscriptText;
    try {
      await navigator.clipboard.writeText(text);
      alert("Transcript copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    fullTranscriptText = "";
    document.getElementById("full-transcript").innerText = "";
    document.getElementById("word-count").innerText = "Words: 0";
  });

  document.getElementById("save-btn").addEventListener("click", () => {
    const text = fullTranscriptText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
