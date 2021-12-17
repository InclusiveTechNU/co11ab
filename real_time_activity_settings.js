var optionsCheckboxes = document.querySelectorAll('input[type=checkbox][name="rta_feature"]');
optionsCheckboxes.forEach((checkboxButton) => {
    chrome.runtime.sendMessage({
        type: 'value_request',
        key: checkboxButton.id
    }, (response) => {
        checkboxButton.checked = response.value;
    });
    checkboxButton.onchange = () => {
        optionsCheckboxes.forEach((newCheckboxButton) => {
            console.log(newCheckboxButton, newCheckboxButton.checked);
            chrome.runtime.sendMessage({
                type: 'value_set',
                key: newCheckboxButton.id,
                value: newCheckboxButton.checked
            });
        })
    }
});

var settingsPage = "realtime_activity";
