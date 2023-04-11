import { invoke } from '@tauri-apps/api'
import { open } from '@tauri-apps/api/dialog';
import { useEffect, useState } from 'react';

import { Chat } from './components/Chat';
import AudioRecorder from './components/AudioRecorder';
import { openai } from './openai';

type Message = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

export const App = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'system',
      content: `
        あなたは音声アシスタントHachiです。
        ユーザーの声をSpeech-To-Textで文字起こししたものを送るので、その場に適した応答をしてください。
        Speech-To-Textの精度は完ぺきではないので、誤字や誤変換があります。文脈に応じて自然な解釈を行ってください。
        
        あなたの発言の形式は以下です。
        \`\`\`
        (あなたの発言)
        \`\`\`
        
        例えば、
        \`\`\`
        こんにちは、私は音声アシスタントです。
        \`\`\`
        のように発言してください。
        
        ではまず、ユーザーに自己紹介をしてください。
      `
    }
  ]);
  const [modelFilePath, setModelFilePath] = useState<string | undefined>(undefined);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [ttsDirectoryPath, setTTSDirectoryPath] = useState<string | undefined>(undefined);
  const [ttsLoaded, setTTSLoaded] = useState(false);
  const [waitingUser, setWaitingUser] = useState(false);
  const [waitingAssistant, setWaitingAssistant] = useState(false);

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

  const handleSelectTTSDirectory = async () => {
    const directoryPath = await open({ directory: true });
    if (!directoryPath) return;
    if (Array.isArray(directoryPath) && directoryPath.length === 0) return;

    const ttsDirectoryPath = Array.isArray(directoryPath) ? directoryPath[0] : directoryPath;

    invoke('load_vvc', { ttsDirectoryPath }).then(() => {
      setTTSLoaded(true);
      setTTSDirectoryPath(ttsDirectoryPath);
    });
  };

  useEffect(() => {
    if (messages.length === 0) return;
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    });
    
    if (messages[messages.length - 1].role === 'assistant') return;

    setWaitingAssistant(true);

    (async () => {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0,
      });

      const newMessage = response.data.choices[0]?.message;
      if (!newMessage) return;
      setMessages([...messages, newMessage]);
      setWaitingAssistant(false);

      invoke<Uint8Array>('speech_text', { text: newMessage.content }).then((audioData) => {
        const audio = new Audio(URL.createObjectURL(new Blob([audioData], { type: 'audio/wav' })));
        audio.play();
      });

      /*
      const utterance = new SpeechSynthesisUtterance(newMessage);
      speechSynthesis.speak(utterance);
      */
    })();
    
  }, [messages]);

  useEffect(() => {
    
  }, [messages]);

  const onRecordingFinished = async (audioDataArray: Float32Array) => {
    const audioData = Array.from(audioDataArray);

    setWaitingUser(true);
    invoke<string>('transcribe_audio', { audioData }).then((response) => {
      const content = response.replaceAll(/\(.+\)/g, ''); // "(xxx)"のような括弧で囲まれた文字列を削除
      setMessages([...messages, { role: 'user', content }]);
      setWaitingUser(false);
    });
  };

  return (
    <div className="App">
      <h1>GPT音声アシスタント</h1>
      <button onClick={handleSelectFile}>Whisperモデルファイルを選択</button>
      {modelFilePath && (
        <>
          <p>ロード済み: {modelFilePath}</p>
        </>
      )}
      
      <button onClick={handleSelectTTSDirectory}>Open JTalkフォルダを選択</button>
      {ttsDirectoryPath && (
        <>
          <p>ロード済み: {ttsDirectoryPath}</p>
        </>
      )}
      {
        modelLoaded && ttsLoaded && (
          <>
            <div className="container">
              <Chat messages={messages} waitingUser={waitingUser} waitingAssistant={waitingAssistant} />
            </div>
            <AudioRecorder onRecordingFinished={onRecordingFinished} />
          </>
        )
      }
    </div>
  );
}
