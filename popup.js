/**
 * Mission Control: Star Chart - Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
    const starCardsContainer = document.getElementById("star-cards");
    const scanStatus = document.getElementById("scan-status");
    const scanBtn = document.getElementById("scan-btn");
    const archiveBtn = document.getElementById("archive-btn");
    const beamBtn = document.getElementById("beam-btn");

    let currentTabs = [];

    /**
     * Scans for open tabs and renders the star chart.
     */
    async function scanSectors() {
        scanStatus.textContent = "SCANNING SECTORS...";
        starCardsContainer.innerHTML = "";

        try {
            const tabs = await chrome.tabs.query({ currentWindow: true });
            currentTabs = Utils.filterTabs(tabs);

            if (currentTabs.length === 0) {
                scanStatus.textContent = "NO STARS DETECTED.";
                starCardsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-secondary);">有効なタブが見つかりません</div>`;
                return;
            }

            scanStatus.textContent = `${currentTabs.length} STARS DETECTED.`;

            currentTabs.forEach((tab, index) => {
                const card = document.createElement("div");
                card.className = "star-card";
                card.innerHTML = `
          <input type="checkbox" id="tab-${index}" checked data-url="${tab.url}">
          <img src="${Utils.getFavicon(tab)}" class="star-favicon" onerror="this.src='https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}'">
          <div class="star-info">
            <div class="star-title" title="${tab.title}">${tab.title}</div>
            <div class="star-url" title="${tab.url}">${tab.url}</div>
          </div>
        `;
                starCardsContainer.appendChild(card);
            });
        } catch (error) {
            console.error("Scan Error:", error);
            scanStatus.textContent = "SCAN SYSTEM FAILURE.";
        }
    }

    /**
     * Responds to the BEAM command.
     */
    async function initiateBeam() {
        const checkboxes = document.querySelectorAll('.star-card input[type="checkbox"]:checked');
        const selectedUrls = Array.from(checkboxes).map(cb => cb.dataset.url);

        if (selectedUrls.length === 0) {
            alert("エラー: 送信する「星（URL）」が選択されていません。");
            return;
        }

        const payload = selectedUrls.join("\n");
        scanStatus.textContent = "PREPARING BEAM...";

        try {
            const [notebookTab] = await chrome.tabs.query({ url: "*://notebooklm.google.com/*" });

            if (!notebookTab) {
                alert("エラー: NotebookLM のタブが見つかりません。NotebookLM を開いてからやり直してください。");
                return;
            }

            chrome.tabs.sendMessage(notebookTab.id, {
                action: "ACTIVATE_BEAM",
                payload: payload
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    alert("エラー: NotebookLM への接続に失敗しました。ページを一度リロードしてから再試行してください。");
                    return;
                }

                if (response && response.success) {
                    scanStatus.textContent = "BEAM SUCCESSFUL.";
                    setTimeout(() => window.close(), 1000);
                } else {
                    alert("エラー: " + (response ? response.message : "送信中に問題が発生しました。"));
                    scanStatus.textContent = "BEAM FAILED.";
                }
            });
        } catch (error) {
            console.error("Beam Error:", error);
            alert("エラー: 通信エラーが発生しました。");
        }
    }

    scanBtn.addEventListener("click", scanSectors);

    archiveBtn.addEventListener("click", () => {
        const checkboxes = document.querySelectorAll('.star-card input[type="checkbox"]:checked');
        const selectedUrls = Array.from(checkboxes).map(cb => cb.dataset.url);
        if (selectedUrls.length > 0) {
            chrome.storage.local.set({ archivedStars: selectedUrls }, () => {
                alert("セッションをローカルに保存しました。");
            });
        }
    });

    beamBtn.addEventListener("click", initiateBeam);

    scanSectors();
});
