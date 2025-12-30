/**
 * Mission Control: Star Chart - Utilities
 */

const Utils = {
    /**
     * Filters tabs based on mission requirements.
     * Ignores chrome settings, blank pages, and NotebookLM itself.
     */
    filterTabs: (tabs) => {
        return tabs.filter(tab => {
            const url = tab.url || "";
            return (
                url.startsWith("http") &&
                !url.includes("notebooklm.google.com") &&
                !url.startsWith("chrome://") &&
                !url.startsWith("about:")
            );
        });
    },

    /**
     * Formats a list of URLs for bulk injection.
     */
    formatUrls: (selectedTabs) => {
        return selectedTabs.map(tab => tab.url).join("\n");
    },

    /**
     * Safely gets the favicon URL, with a fallback.
     */
    getFavicon: (tab) => {
        return tab.favIconUrl || "icons/placeholder.png";
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
