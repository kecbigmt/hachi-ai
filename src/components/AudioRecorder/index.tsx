import React, { useState, useEffect, useRef } from 'react';
import { css } from '@emotion/react';

type Props = {
    onRecordingFinished: (audioData: Float32Array) => void;
};

const buttonStyle = css`
  background-color: #4caf50;
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  margin: 4px 2px;
  cursor: pointer;
  border-radius: 4px;
`;

const remainingTimeStyle = css`
  font-size: 14px;
  color: #333;
  margin-top: 10px;
  font-weight: bold;
`;

const AudioRecorder: React.FC<Props> = ({ onRecordingFinished }) => {
    const recording = useRef<boolean>(false);
    const [remainingTime, setRemainingTime] = useState(10);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const audioStream = useRef<MediaStream | null>(null);
 
    const maxRecordingTime = useRef<number>(10000); // 録音の最大時間 (ms)
    const startTime = useRef<number>(0);

    useEffect(() => {
        const timer = setInterval(() => {
            if (recording.current) {
                const timeElapsed = Date.now() - startTime.current;
                const remaining = Math.round((maxRecordingTime.current - timeElapsed) / 1000);
                setRemainingTime(remaining);

                if (timeElapsed >= maxRecordingTime.current) {
                    stopRecording();
                }
            }
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const startRecording = async () => {
        if (recording.current) return;

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                // whisper-rs expects 16bit, 16KHz, mono audio
                channelCount: 1,
                sampleRate: 16000,
                sampleSize: 16,
            }
        });

        const context = new AudioContext({ sampleRate: 16000 });
        const source = context.createMediaStreamSource(stream);

        // Prepare two analyzers, one with a short smoothing time and one with a long smoothing time
        // When user is speaking, the short one will pick up the volume change faster
        // Difference between the two will be used to detect silence
        const shortAnalyser = context.createAnalyser();
        shortAnalyser.fftSize = 2048;
        shortAnalyser.smoothingTimeConstant = 0.2;
        source.connect(shortAnalyser);

        const longAnalyser = context.createAnalyser();
        longAnalyser.fftSize = 2048;
        longAnalyser.smoothingTimeConstant = 0.8;
        source.connect(longAnalyser);

        const mediaRecorderInstance = new MediaRecorder(stream);
        mediaRecorder.current = mediaRecorderInstance;
        audioContext.current = context;
        audioStream.current = stream;

        mediaRecorderInstance.start();
        startTime.current = Date.now();
        recording.current = true;
        
        const checkVolume = () => {
            const shortDataArray = new Uint8Array(shortAnalyser.frequencyBinCount);
            shortAnalyser.getByteFrequencyData(shortDataArray);
            const shortSum = shortDataArray.reduce((acc, val) => acc + val, 0);
            const shortAvg = shortSum / shortAnalyser.frequencyBinCount;
            
            const longDataArray = new Uint8Array(longAnalyser.frequencyBinCount);
            longAnalyser.getByteFrequencyData(longDataArray);
            const longSum = longDataArray.reduce((acc, val) => acc + val, 0);
            const longAvg = longSum / longAnalyser.frequencyBinCount;

            console.log(`longAvg: ${longAvg}, shortAvg: ${shortAvg}`);

            const threshold = 1;

            if (recording.current && Math.abs(longAvg - shortAvg) < threshold) {
                stopRecording();
            }
        };

        const interval = setInterval(() => {
            if (recording.current) {
                checkVolume();
            } else {
                clearInterval(interval);
            }
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    };

    const stopRecording = () => {
        if (!recording.current || !mediaRecorder.current || !audioStream.current || !audioContext.current) return;
        const currentAudioContext = audioContext.current;

        mediaRecorder.current.stop();
        audioStream.current.getTracks().forEach((track) => track.stop());
        audioContext.current.close();

        mediaRecorder.current.ondataavailable = (e) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(e.data);
            reader.onload = () => {
                currentAudioContext.decodeAudioData(reader.result as ArrayBuffer).then((audioBuffer) => {
                    const audioData = audioBuffer.getChannelData(0);
                    onRecordingFinished(audioData);
                });
            }
        };

        recording.current = false;
        setRemainingTime(10);
        mediaRecorder.current = null;
        audioStream.current = null;
        audioContext.current = null;
    };

    return (
        <div>
            <button css={buttonStyle} onClick={recording.current ? stopRecording : startRecording}>
                {recording.current ? 'Stop Recording' : 'Start Recording'}
            </button>
            {recording.current && <div css={remainingTimeStyle}>Remaining time: {remainingTime}s</div>}
        </div>
    );
};

export default AudioRecorder;

