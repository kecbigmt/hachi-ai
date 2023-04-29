#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use dotenvy::dotenv;
use once_cell::sync::Lazy;
use std::path::Path;
use std::{
    env,
    sync::{Arc, RwLock},
};
use tokio::{
    runtime::Runtime,
    sync::{mpsc, oneshot},
};
use vvcore::{AccelerationMode, VoicevoxCore};
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

static WHISPER_CTX: Lazy<RwLock<Option<WhisperContext>>> = Lazy::new(|| RwLock::new(None));

#[derive(Clone)]
struct AppState {
    tts_input_sender: mpsc::Sender<TTSInput>,
}

impl AppState {
    fn new(tts_input_sender: mpsc::Sender<TTSInput>) -> Self {
        Self { tts_input_sender }
    }
}

type AudioData = Vec<f32>;

#[derive(Debug)]
struct TTSInput {
    text: String,
    resp: oneshot::Sender<AudioData>,
}

fn main() {
    // load environment variables from .env file
    dotenv().expect(".env file not found");

    // create a channel for sending events to the event loop
    let (tx, mut rx) = mpsc::channel::<TTSInput>(8);

    // create an application state
    let app_state = AppState::new(tx);

    // create a tokio runtime
    let rt = Arc::new(Runtime::new().unwrap());
    rt.spawn(async move {
      let path = Path::new("D:/Users/kecy/dev/src/github.com/kecbigmt/tauri-demo/src-tauri/target/debug/open_jtalk_dic_utf_8-1.11");
      let dir = std::ffi::CString::new(path.to_str().unwrap()).unwrap();
      let vvc: VoicevoxCore = VoicevoxCore::new_from_options(AccelerationMode::Auto, 0, true, dir.as_c_str()).unwrap();
      let speaker_id: u32 = 1;

      while let Some(tts_input) = rx.recv().await {
        // Text to speech
        let audio = vvc.tts_simple(&tts_input.text, speaker_id).expect("failed to run model");

        // Convert audio data to f32
        let f32_data: Vec<f32> = convert_wav_to_f32(&audio.as_slice());

        // Send audio data to the main thread
        tts_input.resp.send(f32_data).unwrap();
      }
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_openai_api_key,
            get_openai_chat_model_name,
            load_model,
            transcribe_audio,
            speech_text
        ])
        .manage(app_state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_openai_api_key(_state: tauri::State<AppState>) -> Result<String, String> {
    let value = env::var("OPENAI_API_KEY").expect("failed to get env OPENAI_API_KEY");
    Ok(value)
}

#[tauri::command]
fn get_openai_chat_model_name(_state: tauri::State<AppState>) -> Result<String, String> {
    let value = env::var("OPENAI_CHAT_MODEL_NAME")
        .expect("failed to get env OPENAI_CHAT_MODEL_NAME");
    Ok(value)
}

#[tauri::command]
fn load_model(_state: tauri::State<AppState>, model_file_path: &str) -> Result<String, String> {
    let mut ctx = WHISPER_CTX.write().unwrap();
    *ctx = Some(WhisperContext::new(model_file_path).expect("failed to load model"));
    Ok("OK".to_string())
}

#[tauri::command]
fn transcribe_audio(
    _state: tauri::State<AppState>,
    audio_data: Vec<f32>,
) -> Result<String, String> {
    let mut ctx_binding = WHISPER_CTX.write().unwrap();
    let ctx = ctx_binding.as_mut().unwrap();

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("ja"));

    ctx.full(params, &audio_data[..])
        .expect("failed to run model");

    let mut result = String::new();
    let num_segments = ctx.full_n_segments();
    println!("Number of segments: {}", num_segments);

    for i in 0..num_segments {
        // Get the transcribed text and timestamps for the current segment.
        let segment = ctx.full_get_segment_text(i).expect("failed to get segment");
        let start_timestamp = ctx.full_get_segment_t0(i);
        let end_timestamp = ctx.full_get_segment_t1(i);

        // Format the segment information as a string.
        let line = format!("[{} - {}]: {}\n", start_timestamp, end_timestamp, segment);
        println!("{}", line);

        result.push_str(segment.as_str());
    }

    Ok(result)
}

#[tauri::command]
async fn speech_text(state: tauri::State<'_, AppState>, text: &str) -> Result<Vec<f32>, String> {
    let (resp_tx, resp_rx) = oneshot::channel::<AudioData>();

    let tts_input = TTSInput {
        text: text.to_string(),
        resp: resp_tx,
    };

    // Send text to the event loop
    state.tts_input_sender.send(tts_input).await.unwrap();

    // Wait for the audio data
    let f32_data = resp_rx.await.unwrap();

    Ok(f32_data)
}

fn convert_wav_to_f32(wav_data: &[u8]) -> Vec<f32> {
    let mut f32_data = Vec::new();

    for i in (0..wav_data.len()).step_by(2) {
        let sample = i16::from_le_bytes([wav_data[i], wav_data[i + 1]]);
        let f32_sample = sample as f32 / i16::MAX as f32;
        f32_data.push(f32_sample);
    }

    f32_data
}
