/**
 * Mission Control: Star Chart - The "Ninja" (Content Script)
 * Penetrates Shadow DOM and injects URLs into NotebookLM.
 */

(function () {
    console.log("Mission Control: Ninja Active.");

    function querySelectorDeep(selector, root = document) {
        let element = root.querySelector(selector);
        if (element) return element;

        const shadows = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
        for (const shadow of shadows) {
            element = querySelectorDeep(selector, shadow.shadowRoot);
            if (element) return element;
        }
        return null;
    }

    function forceClick(element) {
        if (!element) return;
        const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        events.forEach(type => {
            const event = new MouseEvent(type, {
                view: window,
                bubbles: true,
                cancelable: true,
                composed: true
            });
            element.dispatchEvent(event);
        });
    }

    async function waitForElement(selectorStrategy, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const interval = setInterval(() => {
                // Try all selectors in the strategy
                let el = null;
                if (Array.isArray(selectorStrategy)) {
                    for (const sel of selectorStrategy) {
                        el = querySelectorDeep(sel);
                        if (el) break;
                    }
                } else {
                    el = querySelectorDeep(selectorStrategy);
                }

                if (el) {
                    clearInterval(interval);
                    resolve(el);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    reject(new Error(`Timeout waiting for selector strategy.`));
                }
            }, 100);
        });
    }

    async function performInjection(urls) {
        try {
            // 1. Define Robust Selectors (Japanese & English support)
            // NotebookLM updates frequently, so we fallback to placeholders.
            const inputSelectors = [
                'textarea[formcontrolname="website"]',
                'textarea[formcontrolname="newUrl"]',
                'input[formcontrolname="newUrl"]',
                'textarea[placeholder*="リンクを貼り付ける"]', // Japanese UI
                'textarea[placeholder*="Paste link"]',       // English UI
                'textarea[placeholder*="http"]',
                'input[placeholder*="リンクを貼り付ける"]'
            ];

            // 2. Check if the input field is already visible (Fastest path)
            let inputElement = null;
            for (const sel of inputSelectors) {
                inputElement = querySelectorDeep(sel);
                if (inputElement) {
                    console.log(`Mission Control: Found input using ${sel}`);
                    break;
                }
            }

            if (!inputElement) {
                // 3. Try to navigate: "Add Source" -> "Website"
                console.log("Navigating to Website input...");

                const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
                const addSourceBtn = buttons.find(b =>
                    b.innerText.includes("ソースを追加") ||
                    b.innerText.includes("Add source")
                );

                if (addSourceBtn) {
                    forceClick(addSourceBtn);
                    await new Promise(r => setTimeout(r, 500));
                }

                const options = Array.from(document.querySelectorAll('div, span, button'));
                const websiteOption = options.find(o =>
                    o.innerText.trim() === "ウェブサイト" ||
                    o.innerText.trim() === "YouTube" || // The dialog is now specific to "Website & YouTube"
                    o.innerText.trim() === "Website"
                );

                if (websiteOption) {
                    forceClick(websiteOption);
                    // Wait for any of the input selectors
                    try {
                        inputElement = await waitForElement(inputSelectors);
                    } catch (e) {
                        console.warn("Wait failed:", e);
                    }
                }
            }

            if (inputElement) {
                // 4. Inject Data
                inputElement.value = urls;
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));

                // Optional: Try to find the "Insert" button to scroll it into view or verify
                console.log("Injection Successful.");
                return { success: true };
            } else {
                throw new Error("ウェブサイトの入力画面が見つかりませんでした。\n(入力画面を手動で開いている状態でも発生する場合は、一度ページをリロードしてください)");
            }

        } catch (error) {
            console.error("Injection Error:", error);
            return { success: false, message: error.message };
        }
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "ACTIVATE_BEAM") {
            performInjection(message.payload).then(result => {
                sendResponse(result);
            });
            return true;
        }
    });

})();
