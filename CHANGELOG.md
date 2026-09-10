# Change Log

All notable changes to the "happy-hour-code" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Reescritura completa: la extensión pasa de ser un chat en tiempo real a "Happy Hour Code", un reproductor de ROMs de Game Boy Advance embebido en el sidebar.
- El emulador embebido usa `react-gbajs` (JavaScript puro). Se descartó el núcleo real de mGBA compilado a WASM (`@thenick775/mgba-wasm`) porque requiere hilos/`SharedArrayBuffer`, que los webviews de extensiones de VS Code no exponen.
