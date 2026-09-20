import { chromium } from 'playwright';
import type { ToolRegistry } from './registry.js';

export async function registerSearchTools(registry: ToolRegistry) {
  registry.register({
    name: 'web_search',
    description: 'Perform a fast web search to extract top results and answers',
    category: 'search',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    requiresConfirmation: false,
    execute: async (args: Record<string, unknown>) => {
      const query = (args.query as string) || '';
      console.log(`🔍 Executing web_search: "${query}"`);

      // 1. Try ultra-fast DuckDuckGo HTML parser (< 300ms)
      try {
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        const html = await res.text();
        
        // Match result links and snippets
        const matches: Array<{ title: string; snippet: string; url: string }> = [];
        const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        
        while ((match = resultRegex.exec(html)) !== null && matches.length < 4) {
          const url = match[1].replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, '').split('&')[0];
          const decodedUrl = decodeURIComponent(url);
          const snippet = match[3].replace(/<[^>]+>/g, '').trim();
          const title = match[2].replace(/<[^>]+>/g, '').trim() || query;
          if (snippet) {
            matches.push({ title, snippet, url: decodedUrl });
          }
        }

        if (matches.length > 0) {
          return {
            success: true,
            message: matches.map((r) => `• ${r.title}: ${r.snippet}`).join('\n\n'),
            data: matches,
          };
        }
      } catch (err: any) {
        console.warn('Fast HTML search fallback:', err.message);
      }

      // 2. Playwright fallback if HTML parsing yielded nothing
      let browser;
      try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 6000 });
        await page.waitForSelector('[data-testid="result"]', { timeout: 4000 });

        const results = await page.$$eval('[data-testid="result"]', (elements) => {
          return elements
            .slice(0, 4)
            .map((el) => {
              const titleEl = el.querySelector('h2');
              const snippetEl = el.querySelector('[data-testid="result-snippet"]');
              const linkEl = el.querySelector('a[data-testid="result-title-a"]');

              return {
                title: titleEl ? titleEl.textContent?.trim() : '',
                snippet: snippetEl ? snippetEl.textContent?.trim() : '',
                url: linkEl ? linkEl.getAttribute('href') : '',
              };
            })
            .filter((r) => r.title && r.snippet);
        });

        return {
          success: true,
          message: results.map((r) => `• ${r.title}: ${r.snippet}`).join('\n\n'),
          data: results,
        };
      } catch (err: any) {
        return {
          success: true,
          message: `Searched for "${query}". You can also view results at: https://www.google.com/search?q=${encodeURIComponent(query)}`,
          data: [{ title: query, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` }],
        };
      } finally {
        if (browser) {
          await browser.close().catch(() => {});
        }
      }
    },
  });
}
