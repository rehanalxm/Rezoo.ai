import { chromium, Browser, Page } from 'playwright';
import type { ToolRegistry } from './registry.js';

let browserInstance: Browser | null = null;
let activePage: Page | null = null;

async function getBrowserPage(): Promise<Page> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: false });
    const context = await browserInstance.newContext();
    activePage = await context.newPage();
  }
  if (!activePage || activePage.isClosed()) {
    const context = browserInstance.contexts()[0] || (await browserInstance.newContext());
    activePage = await context.newPage();
  }
  return activePage;
}

function isUrl(str: string): boolean {
  return /^https?:\/\//.test(str) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(str);
}

export async function registerBrowserTools(registry: ToolRegistry) {
  registry.register({
    name: 'browser_navigate',
    description: 'Open a URL in the browser or search the web. Accepts full URLs or search queries.',
    category: 'browser',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to, or a search query' },
      },
      required: ['url'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const input = (args.url as string) || '';
        const page = await getBrowserPage();

        let url: string;
        if (isUrl(input)) {
          url = input.startsWith('http') ? input : `https://${input}`;
        } else {
          url = `https://duckduckgo.com/?q=${encodeURIComponent(input)}`;
        }

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const title = await page.title();
        return { success: true, message: `Navigated to: ${title}`, data: { url: page.url(), title } };
      } catch (err: any) {
        return { success: false, message: `Navigation failed: ${err.message}` };
      }
    },
  });

  registry.register({
    name: 'browser_interact',
    description: 'Interact with the current browser page: click, type, scroll, get text, screenshot, go back/forward, refresh.',
    category: 'browser',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Browser action',
          enum: ['click', 'type', 'scroll', 'screenshot', 'get_text', 'go_back', 'go_forward', 'refresh'],
        },
        selector: { type: 'string', description: 'CSS selector or text to identify element (for click/type)' },
        text: { type: 'string', description: 'Text to type (for type action)' },
        direction: { type: 'string', description: 'Scroll direction', enum: ['up', 'down'] },
      },
      required: ['action'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      try {
        const page = await getBrowserPage();
        const action = args.action as string;
        const selector = args.selector as string | undefined;
        const text = args.text as string | undefined;

        switch (action) {
          case 'click':
            if (!selector) return { success: false, message: 'Selector required for click' };
            await page.click(selector, { timeout: 5000 });
            return { success: true, message: `Clicked: ${selector}` };

          case 'type':
            if (!selector || !text) return { success: false, message: 'Selector and text required for type' };
            await page.fill(selector, text);
            return { success: true, message: `Typed "${text}" into ${selector}` };

          case 'scroll': {
            const dir = (args.direction as string) || 'down';
            const delta = dir === 'up' ? -500 : 500;
            await page.evaluate(`window.scrollBy(0, ${delta})`);
            return { success: true, message: `Scrolled ${dir}` };
          }

          case 'get_text':
            if (selector) {
              const content = await page.textContent(selector);
              return { success: true, message: content || '(empty)' };
            }
            // Get visible text from body
            const bodyText = (await page.evaluate('document.body.innerText')) as string;
            return { success: true, message: bodyText?.substring(0, 2000) || '' };

          case 'screenshot': {
            const buffer = await page.screenshot();
            return { success: true, message: `Screenshot captured (${buffer.length} bytes)` };
          }

          case 'go_back':
            await page.goBack();
            return { success: true, message: 'Navigated back' };

          case 'go_forward':
            await page.goForward();
            return { success: true, message: 'Navigated forward' };

          case 'refresh':
            await page.reload();
            return { success: true, message: 'Page refreshed' };

          default:
            return { success: false, message: `Unknown action: ${action}` };
        }
      } catch (err: any) {
        return { success: false, message: `Browser interaction failed: ${err.message}` };
      }
    },
  });
}
