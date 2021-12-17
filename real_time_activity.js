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

const handleWhatShortcut = async () => {
    if (!await getValue("rta_status_feature")) {
        return;
    }

    const editingNames = cursors.map((cursor) => {
        return cursor.querySelector('.kix-cursor-name').textContent;
    });
    if (editingNames.length > 1) {
        const editingNamesStr = editingNames.slice(0, -1).join(', ') + `, and ${editingNames.slice(-1)}`;
        chrome.runtime.sendMessage({
            type: 'speech_request',
            text: `${editingNamesStr} are editing the document`,
            enqueue: true
        });
    } else if (editingNames.length === 0) {
        chrome.runtime.sendMessage({
            type: 'speech_request',
            text: `No one else is editing the document.`,
            enqueue: true
        });
    } else {
        chrome.runtime.sendMessage({
            type: 'speech_request',
            text: `${editingNames[0]} is editing the document`,
            enqueue: true
        });
    }
    let editingNameCounts = {};
    for (const editingName of editingNames) {
        if (editingNameCounts.hasOwnProperty(editingName)) {
            editingNameCounts[editingName] += 1;
        } else {
            editingNameCounts[editingName] = 1;
        }
    }
    let usedNames = {};
    const otherNameElements = [...document.getElementsByClassName('docs-presence-plus-collab-widget-container')];
    const viewerNameElements = otherNameElements.filter((element) => {
        const name = element.getElementsByTagName('img')[0].alt;
        if (editingNameCounts.hasOwnProperty(name)) {
            const maxNameCount = editingNameCounts[name];
            const usedNameCount = usedNames[name] ?? 0;
            if (maxNameCount <= usedNameCount) {
                return true;
            } else {
                usedNames[name] = usedNameCount + 1;
                return false;
            }
        } else {
            return true;
        }
    });
    const viewerNames = viewerNameElements.map((element) => {
        return element.getElementsByTagName('img')[0].alt;
    });
    if (viewerNames.length > 1) {
        const viewerNamesStr = viewerNames.slice(0, -1).join(', ') + `, and ${viewerNames.slice(-1)}`;
        chrome.runtime.sendMessage({
            type: 'speech_request',
            text: `${viewerNamesStr} are viewing the document`,
            enqueue: true
        });
    } else if (viewerNames.length === 1) {
        chrome.runtime.sendMessage({
            type: 'speech_request',
            text: `${viewerNames[0]} is viewing the document.`,
            enqueue: true
        });
    }
};

const handleCursorShortcut = async () => {
    if (!await getValue("rta_cursor_feature")) {
        return;
    }
    cursors.forEach((cursor) => {
        const cursorPosition = calculateCursorCoordinates(cursor);
        const cursorName = cursor.querySelector('.kix-cursor-name').textContent;
        const cursorLine = getDocumentLineAtCoordinates(cursorPosition.x, cursorPosition.y);
        if (cursorLine !== undefined) {
            let position = getDocumentPosition(cursorPosition.x, cursorPosition.y);
            chrome.runtime.sendMessage({
                type: 'speech_request',
                text: `${cursorName} is on page ${position.page}, paragraph ${position.paragraph}, and line ${position.line}`,
                enqueue: true
            });
        } else {
            const pageBounds = [...document.getElementsByClassName('kix-page')].map((pageElement, index) => {
                const firstPage = document.getElementsByClassName('kix-page')[0];
                const firstPageBounds = firstPage.getBoundingClientRect();
                const pageStyles = window.getComputedStyle(firstPage);
                const pageMargin = parseInt(pageStyles.marginTop) + parseInt(pageStyles.marginBottom);
                return {
                    top: firstPageBounds.top + (index*firstPageBounds.height) + (index*pageMargin),
                    bottom: firstPageBounds.top + ((index+1)*firstPageBounds.height) + (index*pageMargin)
                };
            });
            for (let i = 0; i < pageBounds.length; i++) {
                const pageBound = pageBounds[i];
                if (cursorPosition.y >= pageBound.top && cursorPosition.y <= pageBound.bottom) {
                    chrome.runtime.sendMessage({
                        type: 'speech_request',
                        text: `${cursorName} is on page ${i+1}`,
                        enqueue: true
                    });
                    break;
                }
            }
        }
    });
};

const processLine = (lineText) => {
    lineText = lineText.replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
    return lineText.replace(/\s+/g, ' ').trim();
}

let lastCursorLine = undefined;
let usingVoices = false;
const announceTextChanges = (cursor) => {
    const cursorObserver = new MutationObserver((_) => {
        const coords = calculateCursorCoordinates(cursor);
        const cursorLine = getDocumentLineAtCoordinates(coords.x, coords.y + 5);
        if (cursorLine !== undefined) {
            if (lastCursorLine === undefined || lastCursorLine !== cursorLine) {
                if (lastCursorLine === undefined) {
                    lastCursorLine = cursorLine;
                }
                if (usingVoices) {
                    const voice = cursorVoices[cursors.indexOf(cursor)];
                    chrome.runtime.sendMessage({
                        type: 'speech_request',
                        text: lastCursorLine.textContent,
                        voiceName: voice.voiceName,
                        enqueue: false
                    });
                } else {
                    srSpeak(lastCursorLine.textContent);
                }
                lastCursorLine = cursorLine;
            } else if (lastCursorLine === cursorLine) {
                chrome.runtime.sendMessage({
                    type: 'keyboard_sound_request',
                    volume: 0.3
                });
            }
        }        
    });
    cursorObserver.observe(cursor, {
        attributes: true,
        attributeFilter: ['style']
    });
    return cursorObserver;
};

let currentCursorIndex = 0;
let observers = [];
let textObserver = undefined;
let lastPositionRealTime = undefined;
const goToCursor = (event) => {
    if (event.ctrlKey && event.shiftKey && event.keyCode === 49) {
        const element = cursors[currentCursorIndex-1];
        const simulateMouseEvent = (element, eventName, coordX, coordY) => {
            element.dispatchEvent(new MouseEvent(eventName, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: coordX,
                clientY: coordY,
                button: 0
            }));
        };
        let box = element.getBoundingClientRect();
        let coordX = box.left;
        let coordY = box.top + 10;
        simulateMouseEvent(element, "mousedown", coordX, coordY);
        simulateMouseEvent(element, "mouseup", coordX, coordY);
        simulateMouseEvent(element, "click", coordX, coordY);

        let location = getDocumentPosition(box.x, box.y);

        if (usingVoices) {
            const voice = cursorVoices[currentCursorIndex-1];
            chrome.runtime.sendMessage({
                type: 'speech_request',
                text: `Moved cursor to ${element.textContent}'s location at page ${location.page} paragraph ${location.paragraph} and line ${location.line}.`,
                voiceName: voice,
                enqueue: false
            });
        } else {
            srSpeak(`Moved cursor to ${element.textContent}'s location at page ${location.page} paragraph ${location.paragraph} and line ${location.line}.`);   
        }
        observers.forEach((observer) => {
            observer.disconnect();
        });
        observers = [];
        followingCursor = false;
        currentCursorIndex = 0;
        document.removeEventListener("keydown", goToCursor);
    } else if (event.key === "Escape") {
        observers.forEach((observer) => {
            observer.disconnect();
        });
        observers = [];
        followingCursor = false;
        currentCursorIndex = 0;
        document.removeEventListener("keydown", goToCursor);
        srSpeak("Follow mode off", 'assertive');
    }
}

const handleFollowShortcut = async () => {
    if (!await getValue("rta_follow_feature")) {
        return;
    }

    if (!followingCursor && cursors.length > 0) {
        followingCursor = true;
    } else if (followingCursor && currentCursorIndex >= cursors.length) {
        observers.forEach((observer) => {
            observer.disconnect();
        });
        lastCursorLine = undefined;
        observers = [];
        followingCursor = false;
        currentCursorIndex = 0;
        document.removeEventListener("keydown", goToCursor);
        if (lastPositionRealTime !== undefined) {
            let closestElement = document.elementFromPoint(lastPositionRealTime.x, lastPositionRealTime.y);
            const simulateMouseEvent = (element, eventName, coordX, coordY) => {
                element.dispatchEvent(new MouseEvent(eventName, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: coordX,
                    clientY: coordY,
                    button: 0
                }));
            };
            let box = closestElement.getBoundingClientRect();
            let coordX = box.left;
            let coordY = box.top + 10;
            simulateMouseEvent(closestElement, "mousedown", coordX, coordY);
            simulateMouseEvent(closestElement, "mouseup", coordX, coordY);
            simulateMouseEvent(closestElement, "click", coordX, coordY);
            lastPositionRealTime = undefined;
        }
        srSpeak("Follow mode off", 'assertive');
    }

    if (followingCursor) {
        if (observers.length > 0) {
            observers.forEach((observer) => {
                observer.disconnect();
            });
        }

        let cursor = cursors[currentCursorIndex];
        lastCursorLine = undefined;
        observers.push(announceTextChanges(cursor));

        const authorName = cursor.querySelector('.kix-cursor-name').textContent;
        document.removeEventListener("keydown", goToCursor);
        document.addEventListener("keydown", goToCursor);
        document.getElementById('docs-header').setAttribute("tabindex", "0");
        document.getElementById('docs-header').focus();
        lastPositionRealTime = document.getElementById("kix-current-user-cursor-caret").getBoundingClientRect();
        if (usingVoices) {
            const voice = cursorVoices[currentCursorIndex];
            chrome.runtime.sendMessage({
                type: 'speech_request',
                text: `Following ${authorName}.`,
                voiceName: voice.voiceName,
                enqueue: false
            });
        } else {
            srSpeak(`Following ${authorName}.`, 'assertive');
        }
        currentCursorIndex++;
    }
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'what_shortcut_pressed') {
        await handleWhatShortcut();
    } else if (request.type === 'cursor_shortcut_pressed') {
        await handleCursorShortcut();
    } else if (request.type === 'follow_shortcut_pressed') {
        usingVoices = await getValue('rta_voices_feature');
        await handleFollowShortcut();
    }
});

const eventTargetFrames = document.getElementsByClassName('docs-texteventtarget-iframe');
if (eventTargetFrames.length > 0) {
    const eventTargetFrame = eventTargetFrames[0];
    if (eventTargetFrame !== null && eventTargetFrame.contentDocument !== null) {
        eventTargetFrame.contentDocument.addEventListener('keydown', async (event) => {
            chrome.runtime.sendMessage({
                type: 'key_event',
                value: {
                    timestamp: (new Date()).toGMTString(),
                    user: await getValue("user_token"),
                    key: event.key,
                    ctrl: event.ctrlKey,
                    shift: event.shiftKey,
                    alt: event.altKey,
                    keycode: event.keyCode,
                    location: 'google_docs_inner_document',
                    activities: {
                        audioScrollbar: audioScrollBarEnabled,
                        followMode: followingCursor,
                    }
                }
            });
        });
    }
}

window.addEventListener('keydown', async (event) => {
    chrome.runtime.sendMessage({
        type: 'key_event',
        value: {
            timestamp: (new Date()).toGMTString(),
            user: await getValue("user_token"),
            key: event.key,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            keycode: event.keyCode,
            location: 'google_docs_inner_document',
            activities: {
                audioScrollbar: audioScrollBarEnabled,
                followMode: followingCursor,
            }
        }
    });
});
