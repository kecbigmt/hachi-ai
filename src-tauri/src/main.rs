#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use whisper_rs::{WhisperContext, FullParams, SamplingStrategy};
use std::{sync::RwLock, env};
use once_cell::sync::Lazy;
use dotenvy::dotenv;
use vvcore::{VoicevoxCore, AccelerationMode};

static WHISPER_CTX: Lazy<RwLock<Option<WhisperContext>>> = Lazy::new(|| RwLock::new(None));
static VVC: Lazy<RwLock<Option<VoicevoxCore>>> = Lazy::new(|| RwLock::new(None));

fn main() {
  // load environment variables from .env file
  dotenv().expect(".env file not found");  

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      get_openai_api_key,
      load_model,
      load_vvc_model,
      transcribe_audio,
      speech_text
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_openai_api_key() -> Result<String, String> {
  let value = env::var("OPENAI_API_KEY").expect("failed to get env OPENAI_API_KEY");
  Ok(value)
}

#[tauri::command]
fn load_model(model_file_path: &str) -> Result<String, String> {
  let mut ctx = WHISPER_CTX.write().unwrap();
  *ctx = Some(WhisperContext::new(model_file_path).expect("failed to load model"));
  Ok("OK".to_string())
}

#[tauri::command]
fn load_vvc_model(model_dir_path: &str) -> Result<(), String> {
    let dir = std::ffi::CString::new(model_dir_path).unwrap();

  let mut vvc = VVC.write().unwrap();
  *vvc = Some(VoicevoxCore::new_from_options(AccelerationMode::Auto, 0, true, dir.as_c_str()).expect("failed to load model"));
  Ok(())
}

#[tauri::command]
fn transcribe_audio(audio_data: Vec<f32>) -> Result<String, String> {
  let mut ctx_binding = WHISPER_CTX.write().unwrap();
  let ctx = ctx_binding.as_mut().unwrap();

  let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
  params.set_language(Some("ja"));


  ctx.full(params, &audio_data[..]).expect("failed to run model");

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
fn speech_text(text: &str) -> Result<Vec<u8>, String> {
  let vvc_binding = VVC.read().unwrap();
  let vvc = vvc_binding.as_ref().unwrap();
  
  let speaker_id: u32 = 1;
  let audio = vvc.tts_simple(text, speaker_id).expect("failed to run model");
  Ok(audio.as_slice().to_vec())
}