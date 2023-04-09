## Setup Tauri

https://tauri.app/v1/guides/getting-started/prerequisites

## Builiding whisper-rs

1. Setup MSYS2
  a. Download and install MSYS2 from https://www.msys2.org/
  b. Run `pacman -S --needed base-devel mingw-w64-x86_64-gcc` within MSYS2 MINGW64 terminal
  c. Add `C:\msys64\mingw64\bin` to the environment variable `Path` in Windows
2. Setup LLVM
  a. Download and install LLVM from https://releases.llvm.org/download.html
  b. Set the environment variable `LIBCLANG_PATH` to `C:\Program Files\LLVM\bin`
3. Set Rust to use MSYS2 : by running `rustup toolchain install stable-x86_64-pc-windows-gnu` and `rustup default x86_64-pc-windows-gnu` in Windows Powershell/Cmd

## Run Tauri app in local

Run below in project root:

```
npm run tauri dev
```
