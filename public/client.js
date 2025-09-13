const captions = window.document.getElementById("captions");

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
  };

  microphone.onstop = () => {
    console.log("client: microphone closed");
    document.body.classList.remove("recording");
  };

  microphone.ondataavailable = (e) => {
    const data = e.data;
    console.log("client: sent data to websocket");
    socket.send(data);
  };
}

async function closeMicrophone(microphone) {
  microphone.stop();
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

      if (transcript !== "")
        captions.innerHTML = transcript ? `<span>${transcript}</span>` : "";
    });

    socket.on("error", (e) => console.error(e));

    socket.on("warning", (e) => console.warn(e));

    socket.on("Metadata", (e) => console.log(e));

    socket.on("close", (e) => console.log(e));

    await start(socket);
  });
});
