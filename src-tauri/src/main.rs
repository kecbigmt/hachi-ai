#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use whisper_rs::{WhisperContext, FullParams, SamplingStrategy};
use std::sync::RwLock;
use once_cell::sync::Lazy;

static WHISPER_CTX: Lazy<RwLock<Option<WhisperContext>>> = Lazy::new(|| RwLock::new(None));

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      load_model,
      transcribe_audio
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn load_model(model_file_path: &str) -> Result<String, String> {
  let mut ctx = WHISPER_CTX.write().unwrap();
  *ctx = Some(WhisperContext::new(model_file_path).expect("failed to load model"));
  Ok("OK".to_string())
}

#[tauri::command]
fn transcribe_audio(audio_data: Vec<f32>) -> Result<String, String> {
  let mut ctx_binding = WHISPER_CTX.write().unwrap();
  let ctx = ctx_binding.as_mut().unwrap();

  let mut params = FullParams::new(SamplingStrategy::default());
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