#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use dotenvy::dotenv;
use once_cell::sync::Lazy;
use std::io;
use std::sync::Arc;
use std::{env, sync::RwLock};
use tokio::{runtime::Runtime, sync::mpsc::UnboundedSender};
use tts::Tts;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

static WHISPER_CTX: Lazy<RwLock<Option<WhisperContext>>> = Lazy::new(|| RwLock::new(None));

#[derive(Clone)]
struct AppState {
    tts_event_sender: UnboundedSender<String>,
}

impl AppState {
    fn new(tts_event_sender: UnboundedSender<String>) -> Self {
        Self { tts_event_sender }
    }
}

fn main() {
    // load environment variables from .env file
    dotenv().expect(".env file not found");

    // create a channel for sending events to the event loop
    let (tts_event_sender, mut tts_event_receiver) =
        tokio::sync::mpsc::unbounded_channel::<String>();

    // create an application state
    let app_state = AppState::new(tts_event_sender);

    // create a tokio runtime
    let rt = Arc::new(Runtime::new().unwrap());
    rt.spawn(async move {
        let mut tts = Tts::default().expect("failed to create tts");
        let voices = tts.voices().expect("failed to get voices");

        // nameが"Microsoft Haruka"のvoiceを取り出す
        let voice = voices
            .iter()
            .find(|v| v.name() == "Microsoft Haruka")
            .unwrap();
        tts.set_voice(voice).expect("failed to set voice");

        loop {
          if let Ok(text) = tts_event_receiver.try_recv() {
              tts.speak(text, true).expect("failed to speak");
          }
      }
    });

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_openai_api_key,
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
fn speech_text(state: tauri::State<AppState>, text: String) -> Result<(), String> {
    // let voice = Voice::new("Microsoft Haruka Desktop - Japanese", "ja-JP").expect("failed to create voice");

    state
        .tts_event_sender
        .send(text.to_string())
        .expect("failed to send event");

    /*
    loop {
        let Features { is_speaking, .. } = tts.supported_features();
        if !is_speaking {
            println!("finished speaking");
            break;
        }
    }*/

    Ok(())
}
