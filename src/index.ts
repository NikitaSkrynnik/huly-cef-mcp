import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z, { ZodString } from "zod";
import fs from "fs/promises";
import { BrowserClient, KeyCode } from "cef-client";
import { base64 } from "zod/v4";

let browser = new BrowserClient("ws://localhost:8080/browser");

let server = new McpServer({
    name: "Huly CEF Server",
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        let clickableElements = await browser.getClickableElements(tabId);

        let clickableElementsText = clickableElements.map((e, i) => {
            return `[${i}] <${e.tag}>${e.text}</${e.tag}>`;
        }).join("\n");

        return {
            content: [
                {
                    type: "text",
                    text: "Opened page with id: " + tabId + " at " + args.url
                },
                {
                    type: "text",
                    text: "Clickable elements:\n" + clickableElementsText
                }
            ]
        }
    }
);

server.tool(
    "get-clickable-elements",
    "Get all clickable elements on the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to get clickable elements from")
    },
    async (args) => {
        let clickableElements = await browser.getClickableElements(args.tabId);
        let clickableElementsText = clickableElements.map((e, i) => {
            return `[${i}] <${e.tag}>${e.text}</${e.tag}>`;
        }).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Clickable elements on tab ${args.tabId}:\n` + clickableElementsText
                }
            ]
        };
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
        browser.clickElement(args.tabId, args.index);

        return {
            content: [
                {
                    type: "text",
                    text: `Clicked element at index ${args.index} on tab ${args.tabId}`
                }
            ]
        }
    }
)

server.tool(
    "screenshot",
    "Get a screenshot of the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to get the screenshot from")
    },
    async (args) => {
        let screenshot = await browser.screenshot(args.tabId, 800, 600);

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
        browser.keyPress(args.tabId, KeyCode.ENTER, 0, true, false, false);
        await new Promise(resolve => setTimeout(resolve, 100));
        browser.keyPress(args.tabId, KeyCode.ENTER, 0, false, false, false);

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

server.tool(
    "type",
    "Type text into the current page",
    {
        tabId: z.number().min(0).describe("The ID of the tab to send the input to"),
        text: z.string().describe("The text to type into the page")
    },
    async (args) => {
        for (let i = 0; i < args.text.length; i++) {
            const char = args.text[i].charCodeAt(0);
            browser.char(args.tabId, char);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Typed text '${args.text}' on tab ${args.tabId}`
                }
            ]
        };
    }
)

// server.tool(
//     "scroll",
//     "Scroll the page",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to scroll"),
//         deltaX: z.number().default(0).describe("The amount to scroll horizontally"),
//         deltaY: z.number().default(100).describe("The amount to scroll vertically")
//     },
//     async (args) => {
//         browser.mouseWheel(args.tabId, 100, 100, args.deltaX, args.deltaY);
//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `Scrolled page in tab ${args.tabId} by (${args.deltaX}, ${args.deltaY})`
//                 }
//             ]
//         };
//     }
// )
// server.tool(
//     "click",
//     "Click the mouse at the current position",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to click the mouse in"),
//         x: z.number().describe("The x coordinate to move the mouse to"),
//         y: z.number().describe("The y coordinate to move the mouse to"),
//     },
//     async (args) => {
//         browser.mouseClick(args.tabId, args.x, args.y, 0, true);
//         await new Promise(resolve => setTimeout(resolve, 100));
//         browser.mouseClick(args.tabId, args.x, args.y, 0, false);

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `Clicked mouse at (${args.x}, ${args.y})`
//                 }
//             ]
//         };
//     }
// );


// server.tool(
//     "move-mouse",
//     "Move the mouse to a specific position",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to move the mouse in"),
//         x: z.number().describe("The x coordinate to move the mouse to"),
//         y: z.number().describe("The y coordinate to move the mouse to")
//     },
//     async (args) => {
//         browser.mouseMove(args.tabId, args.x, args.y);

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `Moved mouse to (${args.x}, ${args.y}) on page ${args.tabId}`
//                 }
//             ]
//         };
//     }
// )

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

// server.tool(
//     "set-input-value",
//     "Set the value of an input element on the page",
//     {
//         tabId: z.number().min(0).describe("The ID of the tab to set the input value in"),
//         selector: z.string().describe("The CSS selector of the input element"),
//         value: z.string().describe("The value to set the input element to")
//     },
//     async (args) => {
//         browser.setText(args.tabId, args.selector, args.value);

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: `Set value of input '${args.selector}' on tab ${args.tabId} to '${args.value}'`
//                 }
//             ]
//         };
//     }
// )

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("FileSystem MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});