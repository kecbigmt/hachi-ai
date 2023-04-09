import React from "react";
import { css, keyframes } from "@emotion/react";

type Message = {
  role: "user" | "system" | "assistant";
  content: string;
};

const chatWrapperStyle = css`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const messageWrapperStyle = css`
  display: flex;
  margin-bottom: 12px;
`;

const userMessageStyle = css`
  margin-left: auto;
  background-color: #0078d7;
  color: #ffffff;
  border-radius: 8px;
  padding: 8px;
  max-width: 70%;
  word-wrap: break-word;
`;

const systemMessageStyle = css`
  background-color: #cccccc;
  color: #000000;
  border-radius: 8px;
  padding: 8px;
  max-width: 70%;
  word-wrap: break-word;
`;

const assistantMessageStyle = css`
  margin-right: auto;
  background-color: #4caf50;
  color: #ffffff;
  border-radius: 8px;
  padding: 8px;
  max-width: 70%;
  word-wrap: break-word;
`;

const typingAnimation = keyframes`
  0% { opacity: 1 }
  50% { opacity: 0.5 }
  100% { opacity: 1 }
`;

const typingIndicatorStyle = css`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #fff;
  animation: ${typingAnimation} 1s linear infinite;
  &:not(:first-of-type) {
    margin-left: 5px;
  }
`;

type ChatProps = {
    messages: Message[];
    waitingUser: boolean;
    waitingAssistant: boolean;
}

export const Chat: React.FC<ChatProps> = ({ messages, waitingUser, waitingAssistant }) => {
  const renderMessage = (message: Message) => {
    switch (message.role) {
      case "user":
        return <div css={userMessageStyle}>{message.content}</div>;
      case "system":
        return <div css={systemMessageStyle}>{message.content}</div>;
      case "assistant":
        return <div css={assistantMessageStyle}>{message.content}</div>;
      default:
        return null;
    }
  };

  return (
    <div css={chatWrapperStyle}>
      {messages.map((message, index) => (
        <div css={messageWrapperStyle} key={index}>
          {renderMessage(message)}
        </div>
      ))}

      {/* 音声認識の処理中のときに表示する */}
      {waitingUser && (
        <div css={userMessageStyle}>
          <div css={typingIndicatorStyle}></div>
          <div css={typingIndicatorStyle}></div>
          <div css={typingIndicatorStyle}></div>
        </div>
      )}

      {/* ChatGPTのレスポンスを待っているときに表示する */}
      {waitingAssistant && (
        <div css={assistantMessageStyle}>
          <div css={typingIndicatorStyle}></div>
          <div css={typingIndicatorStyle}></div>
          <div css={typingIndicatorStyle}></div>
        </div>
      )}
    </div>
  );
};
