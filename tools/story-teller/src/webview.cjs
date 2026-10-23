'use strict';
const { createReader } = require('./reader-presentation.cjs');
const bridge = acquireVsCodeApi();
createReader({getState:()=>bridge.getState(),setState:state=>bridge.setState(state),postMessage:message=>bridge.postMessage(message),onMessage:listener=>window.addEventListener('message',listener)});
