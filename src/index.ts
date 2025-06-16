import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z, { ZodString } from "zod";
import fs from "fs/promises";
import { BrowserClient, KeyCode } from "cef-client";
import { base64 } from "zod/v4";

let browser = new BrowserClient("ws://localhost:8080/browser");

let server = new McpServer({
    name: "FileSystem Server",
    description: "A server that provides access to the file system",
    version: "1.0.0",
    capabilities: {
        tools: {}
    }
});


server.tool(
    "open-page",
    "Open a new page in the browser",
    {
        url: z.string().url().default("https://www.google.com").describe("The URL to open in the browser")
    },
    async (args) => {
        let tabId = await browser.openTab(args.url);

        return {
            content: [
                {
                    type: "text",
                    text: "Opened page with id: " + tabId + " at " + args.url
                }
            ]
        }
    }
);

server.tool(
    "move-mouse",
    "Move the mouse to a specific position",
    {
        tabId: z.number().min(0).describe("The ID of the tab to move the mouse in"),
        x: z.number().describe("The x coordinate to move the mouse to"),
        y: z.number().describe("The y coordinate to move the mouse to")
    },
    async (args) => {
        browser.mouseMove(args.tabId, args.x, args.y);

        return {
            content: [
                {
                    type: "text",
                    text: `Moved mouse to (${args.x}, ${args.y}) on page ${args.tabId}`
                }
            ]
        };
    }
)

server.tool(
    "click-mouse",
    "Click the mouse at the current position",
    {
        tabId: z.number().min(0).describe("The ID of the tab to click the mouse in"),
        x: z.number().describe("The x coordinate to move the mouse to"),
        y: z.number().describe("The y coordinate to move the mouse to"),
    },
    async (args) => {
        browser.mouseClick(args.tabId, args.x, args.y, 0, true);
        browser.mouseClick(args.tabId, args.x, args.y, 0, false);

        return {
            content: [
                {
                    type: "text",
                    text: `Clicked mouse at (${args.x}, ${args.y})`
                }
            ]
        };
    }
);

server.tool(
    "get-screenshot",
    "Get a screenshot of the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to get the screenshot from")
    },
    async (args) => {
        let screenshot = await browser.screenshot(args.tabId);

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
        await browser.keyPress(args.tabId, KeyCode.ENTER, 0, true, false, false);
        await browser.keyPress(args.tabId, KeyCode.ENTER, 0, false, false, false);

        return {
            content: [
                {
                    type: "text",
                    text: `Pressed Enter on tab ${args.tabId}`
                }
            ]
        };
    }
)

// server.tool(
//     "get-element-center",
//     "Get the center coordinates of an element on the page by its selector",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to get the element from"),
//         selector: z.string().describe("The CSS selector of the element to get the center coordinates of")
//     },
//     async (args) => {
//         let center = await browser.getElementCenter(args.tabId, args.selector);

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `Center of element '${args.selector}' on tab ${args.tabId} is at (${center.x}, ${center.y})`
//                 }
//             ]
//         };
//     }
// )

// server.tool(
//     "get-dom",
//     "Get the DOM of the current page",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to get the DOM from")
//     },
//     async (args) => {
//         let dom = await browser.getDOM(args.tabId);

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `DOM of tab ${args.tabId} retrieved`
//                 },
//                 {
//                     type: "text",
//                     text: dom
//                 }
//             ]
//         };
//     }
// )

server.tool(
    "set-input-value",
    "Set the value of an input element on the page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to set the input value in"),
        selector: z.string().describe("The CSS selector of the input element"),
        value: z.string().describe("The value to set the input element to")
    },
    async (args) => {
        browser.setText(args.tabId, args.selector, args.value);

        return {
            content: [
                {
                    type: "text",
                    text: `Set value of input '${args.selector}' on tab ${args.tabId} to '${args.value}'`
                }
            ]
        };
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