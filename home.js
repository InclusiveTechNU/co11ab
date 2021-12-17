var settingsPage = "home";

function getSettingsValue(key) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: 'value_request',
            key: key
        }, (response) => {
            resolve(response.value);
        });
    })
}

document.getElementById('download_data').onclick = async () => {
    const data = {
        events: await getSettingsValue('events_log_data'),
        updates: await getSettingsValue('updates_log_data'),
    };
    const jsonData = JSON.stringify(data);
    const jsonBlob = new Blob([jsonData], {type: 'text/json'});
    chrome.downloads.download({
        url: URL.createObjectURL(jsonBlob),
        filename: "collaborative_writing_data.json"
      });
};
