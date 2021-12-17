/*
 * Copyright 2020 Northwestern Inclusive Technology Lab
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function getRandomToken() {
    // E.g. 8 * 32 = 256 bits token
    var randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    var hex = '';
    for (var i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    // E.g. db18458e2782b2b77e36769c569e263a53885a9944dd0a861e5064eac16f1a
    return hex;
}

let valueStore = {
    user_token: getRandomToken(),

    rp_presentation_one: true,
    rp_presentation_two: false,
    rp_presentation_three: false,
    rp_presentation_four: false,
    rp_presentation_five: false,

    as_segment_zero: true,
    as_segment_one: false,
    as_segment_two: false,
    as_comments: true,
    as_cursors: false,
    as_edits: false,
    as_sound_pitch: true,
    as_sound_repeated: false,

    rta_status_feature: false,
    rta_cursor_feature: false,
    rta_follow_feature: false,
    rta_voices_feature: true,

    updates_log_data: [],
    events_log_data: [],
};

chrome.commands.onCommand.addListener((command) => {
    if (command == 'execute-follow-mode') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {type: "follow_shortcut_pressed"});  
        });
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command == 'execute-audio-scrollbar-mode') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {type: "audio_shortcut_pressed"});  
        });
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command == 'execute-what-mode') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {type: "what_shortcut_pressed"});  
        });
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command == 'execute-cursor-mode') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {type: "cursor_shortcut_pressed"});  
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'sound_request') {
        const sound = new Audio(`./sounds/${request.instrument}/${request.index}.mp3`);
        const volume = request.volume ?? 1.0;
        sound.volume = volume;
        sound.play();
    } else if (request.type === 'keyboard_sound_request') {
        const sound = new Audio('keyboard.mp3');
        sound.volume = request.volume;
        sound.play();
    } else if (request.type === 'speech_request') {
        const text = request.text;
        const enqueue = request.enqueue ?? false; 
        const rate = request.rate ?? 1.0;
        const pitch = request.pitch ?? 1.0;
        const voiceName = request.voiceName ?? null;
        const volume = request.volume ?? 1.0;
        const options = {
            'lang': 'en-US',
            'rate': rate,
            'enqueue': enqueue,
            'pitch': pitch,
            'voiceName': voiceName,
            'volume': volume
        };
        chrome.tts.speak(text, options);
    } else if (request.type === 'get_voices_speech_request') {
        chrome.tts.getVoices((voices) => {
            sendResponse({
                type: 'get_voices_speech_response',
                voices: voices.filter((voice) => {
                    return voice.lang === 'en' || voice.lang.includes('en-');
                })
            });
        });
        return true;
    } else if (request.type === 'value_request') {
        sendResponse({
            type: 'value_response',
            value: valueStore[request.key]
        });
    } else if (request.type === 'value_set') {
        if (valueStore[request.key] !== request.value) {
            valueStore['updates_log_data'].push({
                timestamp: (new Date()).toGMTString(),
                user: valueStore['user_token'],
                setting: request.key,
                oldValue: valueStore[request.key],
                newValue: request.value
            });
        }
        valueStore[request.key] = request.value;
    } else if (request.type === 'key_event') {
        valueStore['events_log_data'].push(request.value);
    }
  }
);
