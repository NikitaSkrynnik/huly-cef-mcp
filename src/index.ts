import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import { Browser, connect, KeyCode, Tab } from "cef-client";

let browser: Browser | undefined;
let tabs: Map<number, Tab> = new Map();

let server = new McpServer({
    name: "Huly CEF Server",
    description: "A server that provides access to Huly Browser",
    version: "1.0.0",
    capabilities: {
        tools: {}
    },
    requestTimeoutMs: 30000
});


function getReturnValue(text: string): any {
    return {
        content: [{
            type: "text",
            text: text
        }]
    };
}

server.tool("start-session", "Start a new browser session", { profile: z.string() }, async (args) => {
    if (browser) {
        return getReturnValue("Browser session already started");
    }

    if (!args.profile) {
        return getReturnValue("No profile specified. Please provide a profile name.");
    }

    let response = await fetch(`http://localhost:3000/profiles/${args.profile}/cef`);
    let json = await response.json();
    if (!response.ok) {
        return getReturnValue(`Failed to start browser session: ${json.error || "Unknown error"}`);
    }

    browser = await connect(json.data.address);
    return getReturnValue(`Browser session started for profile: ${args.profile}`);
});

server.tool(
    "open-page",
    "Open a new page in the browser",
    {
        url: z.string().url().default("https://www.google.com").describe("The URL to open in the browser")
    },
    async (args) => {
        if (!browser) {
            return getReturnValue("Browser session not started. Please start a session first.");
        }

        let tab = await browser.openTab({ url: args.url });
        tabs.set(tab.id, tab);
        await new Promise(resolve => setTimeout(resolve, 3000));
        let clickableElements = await tab.clickableElements();

        let clickableElementsText = clickableElements.map((e, i) => {
            return `[${i}] <${e.tag}>${e.text}</${e.tag}>`;
        }).join("\n");

        return getReturnValue(
            "Opened page with id: " + tab.id + " at " + args.url +
            "\nClickable elements:\n" + clickableElementsText
        );
    }
);

server.tool(
    "get-clickable-elements",
    "Get all clickable elements on the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to get clickable elements from")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }

        let clickableElements = await tab.clickableElements();
        let clickableElementsText = clickableElements.map((e, i) => {
            return `[${i}] <${e.tag}>${e.text}</${e.tag}>`;
        }).join("\n");
        return getReturnValue(
            `Clickable elements on tab ${args.tabId}:\n` + clickableElementsText
        );
    }
)

server.tool(
    "click-element",
    "Click an element on the current page by its index",
    {
        tabId: z.number().min(0).describe("The ID of the tab to click the element in"),
        index: z.number().int().min(0).describe("The index of the element to click")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }

        await tab.clickElement(args.index);

        return getReturnValue(`Clicked element at index ${args.index} on tab ${args.tabId}`);
    }
)

server.tool(
    "screenshot",
    "Get a screenshot of the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to get the screenshot from")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }

        let screenshot = await tab.screenshot({ size: { width: 800, height: 600 } });

        return {
            content: [
                {
                    type: "text",
                    text: `Screenshot taken in tab ${args.tabId} with data`
                },
                {
                    type: "image",
                    data: screenshot,
                    mimeType: "image/png",
                }
            ]
        };
    }
)

server.tool(
    "press-enter",
    "Press the Enter key on the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to send the input to")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }

        tab.key(KeyCode.ENTER, 0, true, false, false);
        await new Promise(resolve => setTimeout(resolve, 100));
        tab.key(KeyCode.ENTER, 0, false, false, false);

        return getReturnValue(`Pressed Enter on tab ${args.tabId}`);
    }
)

server.tool(
    "type",
    "Type text into the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to send the input to"),
        text: z.string().describe("The text to type into the page")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }

        for (let i = 0; i < args.text.length; i++) {
            const char = args.text[i].charCodeAt(0);
            tab.char(char);
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        return getReturnValue(`Typed text '${args.text}' on tab ${args.tabId}`);
    }
)

server.tool(
    "scroll",
    "Scroll the page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to scroll"),
        deltaX: z.number().default(0).describe("The amount to scroll horizontally"),
        deltaY: z.number().default(100).describe("The amount to scroll vertically")
    },
    async (args) => {
        let tab = tabs.get(args.tabId);
        if (!tab) {
            return getReturnValue(`No tab found with ID ${args.tabId}`);
        }
        tab.scroll(100, 100, args.deltaX, args.deltaY);
        return getReturnValue(`Scrolled page in tab ${args.tabId} by (${args.deltaX}, ${args.deltaY})`);
    }
)


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("FileSystem MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});