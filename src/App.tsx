import { invoke } from '@tauri-apps/api'
import { useState } from 'react';

export const App = () => {
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');

  const greet = (name: string) => {
    invoke('greet', { name }).then((response) => {
      if (typeof response !== 'string') throw new Error('Invalid response')
      setMessage(response)
    })
  }

  return (
    <div>
      <h1>Hello, React on Vite!</h1>
      <form>
        <label>Your name:</label>
        <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} />
        <button type="submit" disabled={!inputName} onClick={(e) => {
          e.preventDefault()
          greet(inputName)
        }}>Greet!</button>
      </form>
      {
        message && (
          <p>{`Rust: "${message}"`}</p>
        )
      }
    </div>)
}
