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

const getCommentAmount = (compareElement) => {
    return [...compareElement.getElementsByClassName('kix-commentoverlayrenderer-normal')].length;
}

const getCommentRatio = async (compareElement) => {
    const paragraphVersion = await getValue("as_segment_one");
    let className = 'kix-paragraphrenderer';
    if (!paragraphVersion) {
        className = 'kix-lineview-z-index';
    }
    
    let maxComments = 0;
    [...document.getElementsByClassName(className)].forEach((childElement) => {
        const commentCount = [...childElement.getElementsByClassName('kix-commentoverlayrenderer-normal')].length;
        if (commentCount > maxComments) {
            maxComments = commentCount;
        }
    });

    if (maxComments === 0) {
        return 0;
    }
    return [...compareElement.getElementsByClassName('kix-commentoverlayrenderer-normal')].length / maxComments;
}

const getCursorCount = async (childElement) => {
    const paragraphVersion = await getValue("as_segment_one");
    let className = 'kix-paragraphrenderer';
    if (!paragraphVersion) {
        className = 'kix-lineview-z-index';
    }

    let cursorCount = 0;
    cursors.forEach((cursor) => {
        const cursorBounds = cursor.getBoundingClientRect();
        if (cursorBounds.top > 0) {
            const cursorContainer = [...document.elementsFromPoint(cursorBounds.left, cursorBounds.top)].filter((element) => {
                return [...element.classList].includes(className);
            })[0];
            if (cursorContainer === childElement) {
                cursorCount++;
            }
        }
    });
    return cursorCount;
}

const getCursorRatio = async (compareElement) => {
    const paragraphVersion = await getValue("as_segment_one");
    let className = 'kix-paragraphrenderer';
    if (!paragraphVersion) {
        className = 'kix-lineview-z-index';
    }

    let maxCursorCount = 0;
    for (const childElement of [...document.getElementsByClassName(className)]) {
        const cursorCount = await getCursorCount(childElement);
        if (cursorCount > maxCursorCount) {
            maxCursorCount = cursorCount;
        }
    }

    if (maxCursorCount === 0) {
        return 0;
    }
    return await getCursorCount(compareElement) / maxCursorCount;
}

const getSuggestEditAmount = (childElement) => {
    let suggestionAmount = 0;
    const decorations = [...childElement.getElementsByClassName('kix-lineview-decorations')];
    decorations.forEach((decoration) => {
        const removals = [...decoration.childNodes].filter((removalDecoration) => {
            const color = removalDecoration.style.borderTopColor;
            return color !== 'rgb(0, 0, 0)';
        });
    
        removals.forEach((removal) => {
            const size = removal.getBoundingClientRect();
            const lines = [...document.elementsFromPoint(size.x, size.y)].filter((element) => {
                return [...element.classList].includes('kix-lineview');
            });
            let line = document.getElementsByClassName('kix-lineview')[0];
            if (lines.length > 0) {
                line = lines[0];
            }
            const lineSize = line.getBoundingClientRect();
            const removalArea = lineSize.height*size.width;
            suggestionAmount += removalArea;
        });
    })

    const additions = [...childElement.getElementsByClassName('kix-wordhtmlgenerator-word-node')].filter((element) => {
        for (const className of element.classList) {
            if (className.includes('suggestion-text')) {
                return true;
            }
        }
        return false;
    });
    additions.forEach((addition) => {
        const size = addition.getBoundingClientRect();
        const additionArea = size.width*size.height;
        suggestionAmount += additionArea;
    });
    return suggestionAmount;
};

const getSuggestEditCount = (childElement) => {
    let suggestionAmount = 0;
    const decorations = [...childElement.getElementsByClassName('kix-lineview-decorations')];
    decorations.forEach((decoration) => {
        const removals = [...decoration.childNodes].filter((removalDecoration) => {
            const color = removalDecoration.style.borderTopColor;
            return color !== 'rgb(0, 0, 0)';
        });
        suggestionAmount += removals.length;
    })

    const additions = [...childElement.getElementsByClassName('kix-wordhtmlgenerator-word-node')].filter((element) => {
        for (const className of element.classList) {
            if (className.includes('suggestion-text')) {
                return true;
            }
        }
        return false;
    });
    console.log(additions);
    suggestionAmount += additions.length;
    return suggestionAmount;
};

const getEditRatio = async (compareElement) => {
    const paragraphVersion = await getValue("as_segment_one");
    let className = 'kix-paragraphrenderer';
    if (!paragraphVersion) {
        className = 'kix-lineview-z-index';
    }
    
    let maxEdits = 0;
    [...document.getElementsByClassName(className)].forEach((childElement) => {
        const editAmount = getSuggestEditCount(childElement);
        if (editAmount > maxEdits) {
            maxEdits = editAmount;
        }
    });

    if (maxEdits === 0) {
        return 0;
    }

    return getSuggestEditCount(compareElement) / maxEdits;
}

let activeIndex = undefined;
const audioScrollBar = async (event = undefined) => {
    if (event !== undefined) {
        if (event.key === "Escape") {
            lastPosition = undefined;
            audioScrollBarEnabled = false;
            activeIndex = undefined;
            document.removeEventListener("keydown", audioScrollBar);
            srSpeak('Audio Scrollbar Turned Off', 'assertive');
            return;
        }

        console.log(event);
        const paragraphVersion = await getValue("as_segment_one");
        let className = 'kix-paragraphrenderer';
        let segmentType = 'paragraph';
        if (!paragraphVersion) {
            className = 'kix-lineview-z-index';
            segmentType = 'line';
        }

        const element = document.getElementsByClassName(className)[activeIndex];
        const elementPosition = element.getBoundingClientRect();
        const elementPositionItems = getDocumentPosition(elementPosition.x, elementPosition.y);

        let positionAnnouncement;
        if (segmentType == 'paragraph') {
            positionAnnouncement = `Page ${elementPositionItems.page} paragraph ${elementPositionItems.paragraph}`;
        } else {
            positionAnnouncement = `Page ${elementPositionItems.page} paragraph ${elementPositionItems.paragraph} and line ${elementPositionItems.line}`;
        }

        if (event.ctrlKey && event.key === 'm') {
            const cursors = await getCursorCount(element);
            const comments = [...element.getElementsByClassName('kix-commentoverlayrenderer-normal')].length;
            const edits = getSuggestEditCount(element);

            srSpeak(`${positionAnnouncement} has ${comments} comments, ${cursors} other cursors, and ${edits} edits.`);
            return;
        } else if (event.ctrlKey && event.shiftKey && event.keyCode === 49) {
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
            
            audioScrollBarEnabled = false;
            activeIndex = undefined;
            document.removeEventListener("keydown", audioScrollBar);
            srSpeak(`Moved to ${positionAnnouncement}`, 'assertive');
            return;
        }
    }

    document.getElementById('docs-header').setAttribute("tabindex", "0");
    document.getElementById('docs-header').focus();
    if (!audioScrollBarEnabled) {
        audioScrollBarEnabled = true;
        srSpeak('Audio Scrollbar Turned On', 'assertive');
    }
    let hitArrow = false;
    if (event === undefined) {
        hitArrow = true;
    } else if (event.keyCode === 38 || event.keyCode === 40) {
        hitArrow = true;
    }

    if (!hitArrow) {
        return;
    }

    let goDown = false;
    if (event === undefined || event.keyCode === 40) {
        goDown = true;
    }

    let maxIndex = -1;
    const paragraphVersion = await getValue("as_segment_one");
    if (paragraphVersion) {
        maxIndex = getDocumentParagraphs().length;
    } else {
        maxIndex = getDocumentLines().length;
    }

    if (goDown) {
        if (activeIndex == undefined) {
            activeIndex = 0;
        } else if (activeIndex+1 < maxIndex) {
            activeIndex++;
        } else {
            srSpeak("No more content on this page", "assertive");
            return;
        }
    } else {
        if (activeIndex == 0) {
            srSpeak("You are at the top", "assertive");
            return;
        } else if (activeIndex == undefined) {
            activeIndex = 0;
        } else {
            activeIndex--;
        }
    }

    let focusedElement = undefined;
    if (paragraphVersion) {
        focusedElement = getDocumentParagraphs()[activeIndex];
    } else {
        focusedElement = getDocumentLines()[activeIndex];
    }

    chrome.runtime.sendMessage({
        type: 'sound_request',
        instrument: 'navigation',
        index: 'navigation_forward-selection-minimal'
    });
    
    if (await getValue("as_sound_pitch")) {
        const comments = await getCommentRatio(focusedElement);
        const cursors = await getCursorRatio(focusedElement);
        const edits = await getEditRatio(focusedElement);

        const ratios = [];
        if (await getValue("as_comments")) {
            ratios.push(comments);
        }
        if (await getValue("as_cursors")) {
            ratios.push(cursors);
        }
        if (await getValue("as_edits")) {
            ratios.push(edits);
        }

        let averageRatio = 0;
        for (const ratio of ratios) {
            averageRatio += ratio;
        }
        averageRatio = averageRatio / ratios.length;

        let index = 0;
        if (averageRatio > 0) {
            index = Math.floor(averageRatio * 4);
            const notes = ['C4', 'E4', 'G4', 'B4', 'D5'];
            const note = notes[index];
            setTimeout(() => {
                const synth = new Tone.Synth().toDestination();
                synth.triggerAttackRelease(note, "4n", Tone.now());
            }, 200);
        }   
    } else {
        const comments = getCommentAmount(focusedElement);
        const cursors = await getCursorCount(focusedElement);
        const edits = getSuggestEditCount(focusedElement);
        let sum = 0;

        if (await getValue("as_comments")) {
            sum += comments;
        }
        if (await getValue("as_cursors")) {
            sum += cursors;
        }
        if (await getValue("as_edits")) {
            sum += edits;
        }

        if (sum >= 5) {
            sum = 5;
        }
        setTimeout(() => {
            const synth = new Tone.Synth().toDestination();
            const now = Tone.now();
            for (let i = 0; i < sum; i++) {
                synth.triggerAttackRelease("C4", "8n", now + (0.25 * i));
            }
        }, 200);
    }
}

let lastPosition = undefined;
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'audio_shortcut_pressed') {
        if (!await getValue("as_segment_zero")) {
            if (!audioScrollBarEnabled) {
                lastPosition = document.getElementById("kix-current-user-cursor-caret").getBoundingClientRect();
                document.addEventListener("keydown", audioScrollBar);
                audioScrollBar();
            } else {
                if (lastPosition !== undefined) {
                    let closestElement = document.elementFromPoint(lastPosition.x, lastPosition.y);
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
                    lastPosition = undefined;
                }
                audioScrollBarEnabled = false;
                activeIndex = undefined;
                document.removeEventListener("keydown", audioScrollBar);
                srSpeak('Audio Scrollbar Turned Off', 'assertive');
            }
        }
    }
});
