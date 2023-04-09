import { invoke } from '@tauri-apps/api'
import { open } from '@tauri-apps/api/dialog';
import { useState } from 'react';

import { getAudioStream, startRecording, stopRecording } from './utils/audioInput';

export const App = () => {
  const [inputText, setInputText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [modelFilePath, setModelFilePath] = useState<string | undefined>(undefined);
  const [modelLoaded, setModelLoaded] = useState(false);

  const handleSelectFile = async () => {
    const filePath = await open();
    if (!filePath) return;
    if (Array.isArray(filePath) && filePath.length === 0) return;

    const modelFilePath = Array.isArray(filePath) ? filePath[0] : filePath;

    invoke('load_model', { modelFilePath }).then(() => {
      setModelLoaded(true);
      setModelFilePath(Array.isArray(filePath) ? filePath[0] : filePath);
    });
  };

  const handleAudioInput = async (): Promise<void> => {
    const stream = await getAudioStream();
    if (!stream) return;

    startRecording(stream);
  };

  const handleAudioInputStop = async (): Promise<void> => {
    const audioData = Array.from(await stopRecording());

    invoke<string>('transcribe_audio', { audioData }).then((res) => {
      console.log(`transcribe_audio: ${res}`);
      setInputText(res);
    });
  };

  return (
    <div className="App">
      <h1>ChatGPT音声アシスタント</h1>
      <button onClick={handleSelectFile}>モデルファイルを選択</button>
      {modelFilePath && (
        <>
          <p>ロード済み: {modelFilePath}</p>
        </>
      )}
      {
        modelLoaded && (
          <>
            <button disabled={!modelFilePath} onClick={handleAudioInput}>音声入力</button>
            <button disabled={!modelFilePath} onClick={handleAudioInputStop}>ストップ</button>
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
          </>
        )
      }

    </div>
  );
}
