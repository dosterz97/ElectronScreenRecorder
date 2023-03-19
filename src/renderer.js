/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

import { ipcRenderer } from 'electron';
import { writeFile } from 'fs';

let mediaRecorder;
let recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
  startRecording();
  startBtn.innerText = 'Recording';
};

const stopBtn = document.getElementById('stopBtn');

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

const selectMenu = document.getElementById('selectMenu')

async function getVideoSources() {
    const inputSources = await ipcRenderer.invoke('getSources')
  
    inputSources.forEach(source => {
      const element = document.createElement("option")
      element.value = source.id
      element.innerHTML = source.name
      selectMenu.appendChild(element)
    });
  }


  async function startRecording() {
    const screenId = selectMenu.options[selectMenu.selectedIndex].value
    
    // AUDIO WONT WORK ON MACOS
    const IS_MACOS = await ipcRenderer.invoke("getOperatingSystem") === 'darwin'
    console.log(await ipcRenderer.invoke('getOperatingSystem'))
    const audio = !IS_MACOS ? {
      mandatory: {
        chromeMediaSource: 'desktop'
      }
    } : false
  
    const constraints = {
      audio,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenId
        }
      }
    };
  
    // Create a Stream
    const stream = await navigator.mediaDevices
      .getUserMedia(constraints);
  
    // Preview the source in a video element
    videoElement.srcObject = stream;
    await videoElement.play();
  
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    mediaRecorder.ondataavailable = onDataAvailable;
    mediaRecorder.onstop = stopRecording;
    mediaRecorder.start();
  }

function onDataAvailable(e) {
    recordedChunks.push(e.data);
}


async function stopRecording() {
    videoElement.srcObject = null

    const blob = new Blob(recordedChunks, {
      type: 'video/webm; codecs=vp9'
    });
  
    const buffer = Buffer.from(await blob.arrayBuffer());
    recordedChunks = []

    const { canceled, filePath } =  await ipcRenderer.invoke('showSaveDialog')
    if(canceled) return
  
    if (filePath) {
      writeFile(filePath, buffer, () => console.log('video saved successfully!'));
    }
  }