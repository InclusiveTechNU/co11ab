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

const calculateDistance = (nodeLocation, currentNodeLocation) => {
    if (nodeLocation.x === currentNodeLocation.x && nodeLocation.y === currentNodeLocation.y) {
        return 0;
    }

    const lines = getDocumentLines();
    const paragraphs = getDocumentParagraphs();
    const pages = getDocumentPages();

    const nodeLine = getDocumentLineAtCoordinates(nodeLocation.x, nodeLocation.y);
    const currentNodeLine = getDocumentLineAtCoordinates(currentNodeLocation.x, currentNodeLocation.y);
    const nodeLineIndex = lines.indexOf(nodeLine);
    const currentNodeLineIndex = lines.indexOf(currentNodeLine);

    if (nodeLine === undefined || currentNodeLine === undefined) {
        return -1;
    }

    if (nodeLineIndex === currentNodeLineIndex) {
        return 1;
    }

    const nodeParagraph = getDocumentParagraphAtCoordinates(nodeLocation.x, nodeLocation.y);
    const currentNodeParagraph = getDocumentParagraphAtCoordinates(currentNodeLocation.x, currentNodeLocation.y);
    const nodeParagraphIndex = paragraphs.indexOf(nodeParagraph);
    const currentNodeParagraphIndex = paragraphs.indexOf(currentNodeParagraph);

    if (nodeParagraphIndex === currentNodeParagraphIndex) {
        return 2;
    }

    const nodePage = getDocumentPageAtCoordinates(nodeLocation.x, nodeLocation.y);
    const currentNodePage = getDocumentPageAtCoordinates(currentNodeLocation.x, currentNodeLocation.y);
    const nodePageIndex = pages.indexOf(nodePage);
    const currentNodePageIndex = pages.indexOf(currentNodePage);

    if (nodePageIndex === currentNodePageIndex) {
        return 3;
    }

    return -1;
}

let lastDistances = [];

const isNewDistance = (node, distance) => {
    for (const lastDistance of lastDistances) {
        if (node === lastDistance[0]) {
            return distance !== lastDistance[1];
        }
    }
    return true;
};

const setDistance = (node, distance) => {
    for (let i = 0; i < lastDistances.length; i++) {
        const lastDistance = lastDistances[i];
        if (node === lastDistance[0]) {
            lastDistances[i][1] = distance;
        }
    }
    lastDistances.push([node, distance]);
};

cursorCallbacks.push((node) => {
    const authorObserver = new MutationObserver(async (_) => {
        const presentationOne = await getValue("rp_presentation_one");
        const presentationTwo = await getValue("rp_presentation_two");
        const presentationThree = await getValue("rp_presentation_three");
        const presentationFour = await getValue("rp_presentation_four");
        const presentationFive = await getValue("rp_presentation_five");

        if (presentationOne) {
            return;
        } else {
            const currentUserCursor = getCurrentUserCursor();
            const nodeLocation = calculateCursorCoordinates(node);
            const currentUserNodeLocation = calculateCursorCoordinates(currentUserCursor);
            const distance = calculateDistance(nodeLocation, currentUserNodeLocation);

            if (!isNewDistance(node, distance)) {
                return;
            } else {
                setDistance(node, distance);
            }

            if (distance === -1) {
                return;
            }

            let finalDistance = distance;
            let volume;
            if (finalDistance === 0) {
                volume = 1.0;
            } else if (finalDistance === 1) {
                volume = 0.6;
            } else if (finalDistance === 2) {
                volume = 0.25;
            } else if (finalDistance === 3) {
                volume = 0.1;
            }

            const cursorIndex = cursors.indexOf(node);
            const instrument = cursorInstruments[cursorIndex];

            if (!audioScrollBarEnabled && !followingCursor) {
                if (presentationTwo) {
                    const authorName = node.querySelector('.kix-cursor-name').textContent;
                    const texts = [
                        `${authorName} is at your cursor location`,
                        `${authorName} is on the same line as your cursor`,
                        `${authorName} is in the same paragraph as your cursor`,
                        `${authorName} is not in your paragraph`,
                    ];
                    srSpeak(texts[distance], 'assertive');
                } else if (presentationThree) {
                    chrome.runtime.sendMessage({
                        type: 'keyboard_sound_request',
                        volume: volume
                    });
                } else if (presentationFour) {
                    const pitches = [21, 17, 12, 5];
                    chrome.runtime.sendMessage({
                        type: 'sound_request',
                        instrument: instrument,
                        index: pitches[distance],
                        volume: 1.0
                    });
                } else if (presentationFive) {
                    chrome.runtime.sendMessage({
                        type: 'sound_request',
                        instrument: instrument,
                        index: 15,
                        volume: volume
                    });
                }
            }
        }
    });
    authorObserver.observe(node, {
        attributes: true,
        attributeFilter: ['style']
    });
});

trackCursors();
