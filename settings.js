function getValue(key) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'value_request',
            key: key
        }, (response) => {
            resolve(response.value);
        });
    })
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
            location: `settings_${settingsPage}`,
            activities: {
                audioScrollbar: false,
                followMode: false,
            }
        }
    });
});