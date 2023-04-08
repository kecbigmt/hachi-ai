import { invoke } from '@tauri-apps/api'
import { useState } from 'react';

import { getAudioStream, startRecording, stopRecording } from './utils/audioInput';

export const App = () => {
  const [inputText, setInputText] = useState("");
  const [responseText, setResponseText] = useState("");

  const handleAudioInput = async (): Promise<void> => {
    const stream = await getAudioStream();
    if (!stream) return;

    startRecording(stream);

    setTimeout(async() => {
      const audioBlob = await stopRecording();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }, 5000);
  };

  return (
    <div className="App">
      <h1>ChatGPT音声アシスタント</h1>
      <button onClick={handleAudioInput}>音声入力</button>
      <div className="container">
        <div className="inputText">
          <h2>あなたの質問:</h2>
          <p>{inputText}</p>
        </div>
        <div className="responseText">
          <h2>ChatGPTの回答:</h2>
          <p>{responseText}</p>
        </div>
      </div>
    </div>
  );
}
