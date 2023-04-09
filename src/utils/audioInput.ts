let mediaRecorder: MediaRecorder;
const recordedChunks: BlobPart[] = [];
const audioContext = new window.AudioContext({ sampleRate: 16000 }); // whisper-rs expects 16bit, 16KHz, mono audio

export const getAudioStream = async (): Promise<MediaStream | null> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {
            // whisper-rs expects 16bit, 16KHz, mono audio
            channelCount: 1,
            sampleRate: 16000,
            sampleSize: 16,
        } });
        return stream;
    } catch (error) {
        console.error("Error accessing the microphone:", error);
        return null;
    }
};

export const startRecording = (stream: MediaStream): void => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    });
    mediaRecorder.start();
};

export const stopRecording = (): Promise<Float32Array> => {
    return new Promise((resolve) => {
        mediaRecorder.addEventListener("stop", () => {
            const blob = new Blob(recordedChunks, { type: "audio/webm" });
            recordedChunks.length = 0;
            
            const reader = new FileReader();
            reader.readAsArrayBuffer(blob);
            reader.onload = () => {
                audioContext.decodeAudioData(reader.result as ArrayBuffer).then((audioBuffer) => {
                    const audioData = audioBuffer.getChannelData(0);
                    resolve(audioData);
                });
            }
        });
        mediaRecorder.stop();
    });
};
