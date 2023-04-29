import { invoke } from '@tauri-apps/api';
import { Configuration, OpenAIApi } from 'openai';

// get OPENAI_API_KEY from backend
const getOpenAIAPIKey = async () => invoke<string>('get_openai_api_key', {});

const configuration = new Configuration({
  apiKey: await getOpenAIAPIKey(),
});

export const openai = new OpenAIApi(configuration);

export const openAIChatModelName = await invoke<string>('get_openai_chat_model_name', {});
