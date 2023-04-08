let mediaRecorder: MediaRecorder;
const recordedChunks: BlobPart[] = [];

export const getAudioStream = async (): Promise<MediaStream | null> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

export const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve) => {
        mediaRecorder.addEventListener("stop", () => {
            const blob = new Blob(recordedChunks, { type: "audio/webm" });
            recordedChunks.length = 0;
            resolve(blob);
        });
        mediaRecorder.stop();
    });
};
