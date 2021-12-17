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

let followingCursor = false;
let audioScrollBarEnabled = false;

const instruments = [
    "banjo",
    "cello",
    "violin",
    "oboe",
    "saxophone",
    "french_horn",
];

let availableInstruments = [...instruments];

const getRandomInstrument = () => {
    const index = 0;
    return {
        instrument: availableInstruments[index],
        index: index
    };
};

const strings = {
    documentLineClass: "kix-lineview-z-index-z-index",
};

let cursors = [];
let cursorInstruments = [];
let cursorVoices = [];
let lastPlayed = {};
let cursorAddCallback = undefined;
let cursorDidRemoveCallback = undefined;

const addCursor = (node) => {
    chrome.runtime.sendMessage({
        type: 'get_voices_speech_request',
    }, (response) => {
        if (availableInstruments.length === 0) {
            availableInstruments = [...instruments];
        }
        const randomInstrument = getRandomInstrument();

        // TODO: Do this same as instrument
        const index = Math.floor(Math.random() * response.voices.length);
        cursorVoices.push(response.voices[index]);

        cursorInstruments.push(randomInstrument.instrument);
        availableInstruments.splice(randomInstrument.index, 1);
        cursors.push(node);
        if (cursorAddCallback) {
            cursorAddCallback(node);
        }
    });
};

const removeCursor = (node) => {
    cursors.splice(cursors.indexOf(node), 1);
    if (cursorDidRemoveCallback) {
        cursorDidRemoveCallback(node);
    }
};

const getCurrentUserCursor = () => {
    const currentUserCarrotId = 'kix-current-user-cursor-caret';
    return document.getElementById(currentUserCarrotId).parentElement;
};

const getDocumentLines = () => {
    return [...(document.getElementsByClassName('kix-lineview-z-index'))];
};

const getDocumentParagraphs = () => {
    return [...(document.getElementsByClassName('kix-paragraphrenderer'))];
};

const getDocumentPages = () => {
    return [...(document.getElementsByClassName('kix-page'))];
};

const getDocumentLineAtCoordinates = (x, y) => {
    const lines = [...document.getElementsByClassName('kix-lineview-z-index')];
    for (const line of lines) {
        const coords = line.getBoundingClientRect();
        if (coords.left <= x && coords.right >= x && coords.top <= y && coords.bottom >= y) {
            return line;
        }
    }
    return undefined;
};

const getDocumentParagraphAtCoordinates = (x, y) => {
    const paras = [...document.getElementsByClassName('kix-paragraphrenderer')];
    for (const para of paras) {
        const coords = para.getBoundingClientRect();
        if (coords.left <= x && coords.right >= x && coords.top <= y && coords.bottom >= y) {
            return para;
        }
    }
    return undefined;
};

const getDocumentPageAtCoordinates = (x, y) => {
    const pages = [...document.getElementsByClassName('kix-page')];
    for (const page of pages) {
        const coords = page.getBoundingClientRect();
        if (coords.left <= x && coords.right >= x && coords.top <= y && coords.bottom >= y) {
            return page;
        }
    }
    return undefined;
};

const getDocumentPosition = (x, y) => {
    let positions = {
        line: -1,
        paragraph: -1,
        page: -1,
    };
    const currentPage = getDocumentPageAtCoordinates(x, y + 5);
    const pageIndex = getDocumentPages().indexOf(currentPage);
    if (pageIndex !== -1) {
        positions.page = pageIndex + 1;
    }

    const currentParagraph = getDocumentParagraphAtCoordinates(x, y + 5);
    const paragraphIndex = [...currentPage.getElementsByClassName('kix-paragraphrenderer')].indexOf(currentParagraph);
    if (paragraphIndex !== -1) {
        positions.paragraph = paragraphIndex + 1;
    }

    const currentLine = getDocumentLineAtCoordinates(x, y + 5);
    const lineIndex = [...currentParagraph.getElementsByClassName('kix-lineview-z-index')].indexOf(currentLine);
    if (lineIndex !== -1) {
        positions.line = lineIndex + 1;
    }    
    
    return positions;
};

const calculateCursorCoordinates = (cursor) => {
    const position = cursor.getBoundingClientRect();
    return {
        x: position.x,
        y: position.y
    };
};

const trackCursors = () => {
    const cursorObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('kix-cursor')) {
                    addCursor(node);
                }
            });
            mutation.removedNodes.forEach((node) => {
                if (node.classList && node.classList.contains('kix-cursor')) {
                    removeCursor(node);
                }
            });
        });
    });
    cursorObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
};

let cursorCallbacks = []
cursorAddCallback = (node) => {
    cursorCallbacks.forEach((callback) => {
        callback(node);
    })
};
