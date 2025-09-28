import path from "path";
import fsPromise from "fs/promises";
import { Page, ElementHandle, Browser, chromium } from "playwright-core";
import { Dictionary } from "../../classStorage/dictionary.js"
import { Mother } from "../../mother.js";

// must fixed package => "@daisy/ace-core": "1.3.7"
// @ts-ignore
import { check } from "@daisy/ace-core/lib/checker/checker.js";
// @ts-ignore
import { EPUB } from "@daisy/epub-utils";
// @ts-ignore
import { Report } from "@daisy/ace-report";

class AceByDaisy {

  public static getAxeRunner = async () => {
    const MILLISECONDS_TIMEOUT_INITIAL: number = 5000;
    const MILLISECONDS_TIMEOUT_EXTENSION: number = 240000;
    const addScripts = async (paths: string[], page: Page): Promise<void> => {
      for (const path of paths) {
        const scriptElemHandle: ElementHandle | null = await page.addScriptTag({ path });
        if (scriptElemHandle) {
          await scriptElemHandle.evaluate(scriptElem => {
            (scriptElem as Dictionary).setAttribute('data-ace', '');
          });
        }
      }
    }
    const addScriptContents = async (contents: string[], page: Page): Promise<void> => {
      for (const content of contents) {
        const scriptElemHandle: ElementHandle | null = await page.addScriptTag({ content });
        if (scriptElemHandle) {
          await scriptElemHandle.evaluate(scriptElem => {
            (scriptElem as Dictionary).setAttribute('data-ace', '');
          });
        }
      }
    }
    let _browser: Browser | null;
    let cliOption_MILLISECONDS_TIMEOUT_EXTENSION: number;

    _browser = null;
    cliOption_MILLISECONDS_TIMEOUT_EXTENSION = 0;

    return {
      setTimeout: (ms: string) => {
        try {
          cliOption_MILLISECONDS_TIMEOUT_EXTENSION = parseInt(ms, 10);
        } catch { }
      },
      concurrency: 4,
      launch: async () => {
        _browser = await chromium.launch({
          executablePath: Mother.browserPath,
          headless: true,
          timeout: MILLISECONDS_TIMEOUT_INITIAL,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
          ]
        });
        return Promise.resolve();
      },
      close: async () => {
        await _browser!.close();
        return Promise.resolve();
      },
      run: async (url: string, scripts: string[], scriptContents: string[]) => {
        const page: Page = await _browser!.newPage();
        await page.route('**/*', async (route, request) => {
          const requestUrl = request.url();

          if (requestUrl && /^https?:\/\//.test(requestUrl)) {
            return route.abort();
          }

          if (request.resourceType() === "document" && requestUrl && /^file:\//.test(requestUrl) && /\.html?$/.test(requestUrl)) {
            try {
              const filePath = new URL(requestUrl).pathname;
              const xhtml = await fsPromise.readFile(filePath, 'utf8');
              return route.fulfill({
                status: 200,
                contentType: 'application/xhtml+xml',
                body: xhtml
              });
            } catch (ex) {
              console.log("REQUEST HTML FAIL: ", ex, requestUrl, " ==> ", JSON.stringify(request.headers(), null, 4), request.resourceType());
            }
          }
          return route.continue();
        });
        await page.goto(url);
        await addScriptContents(scriptContents, page);
        await addScripts(scripts, page);
        let results: any = undefined;
        try {
          results = await page.evaluate(() => new Promise((resolve, reject) => {
            try {
              // @ts-ignore
              window.tryAceAxe = () => {
                // @ts-ignore
                if (!window.daisy || !window.daisy.ace || !window.daisy.ace.run || !window.daisy.ace.createReport || !window.axe) {
                  // @ts-ignore
                  window.tryAceAxeN++;
                  // @ts-ignore
                  if (window.tryAceAxeN < 15) {
                    // @ts-ignore
                    setTimeout(window.tryAceAxe, 400);
                    return;
                  }
                  // @ts-ignore
                  reject("window.tryAceAxe " + window.tryAceAxeN);
                  return;
                }
                // @ts-ignore
                window.daisy.ace.run((err, res) => {
                  if (err) { reject(err); return; } resolve(res);
                });
              };
              // @ts-ignore
              window.tryAceAxeN = 0; window.tryAceAxe();
            } catch (exc) {
              reject(exc);
            }
          }));
        } catch (err) {
          if (err && err.toString && err.toString().indexOf("protocolTimeout") >= 0) {
            err = new Error(`Timeout :( ${ cliOption_MILLISECONDS_TIMEOUT_EXTENSION || MILLISECONDS_TIMEOUT_EXTENSION }ms`);
          }
          try {
            await page.close();
          } catch (_e) { }
          throw err;
        }
        await page.close();
        return results;
      }
    };
  }

  public static getReport = async (epubTargetPath: string): Promise<Dictionary> => {
    const axeRunner = await AceByDaisy.getAxeRunner();
    const epubPath: string = epubTargetPath;
    const outdir: string = Mother.tempFolder;
    const epub = new EPUB(epubPath);
    await epub.extract();
    await epub.parse();
    const report = await new Report(epub, outdir, "en").init();
    const final: Dictionary = await check(epub, report, "en", axeRunner);
    return final;
  }

  public static getAssertions = async (epubTargetPath: string): Promise<Dictionary[]> => {
    const report = await AceByDaisy.getReport(epubTargetPath);
    try {
      await fsPromise.rm(path.join(Mother.tempFolder, "./report.json"), { recursive: true, force: true });
    } catch {}
    try {
      await fsPromise.rm(path.join(Mother.tempFolder, "./report-html-files"), { recursive: true, force: true });
    } catch {}
    try {
      await fsPromise.rm(path.join(Mother.tempFolder, "./data"), { recursive: true, force: true });
    } catch {}
    try {
      await fsPromise.rm(path.join(Mother.tempFolder, "./report.html"), { recursive: true, force: true });
    } catch {}
    return report._builder._json.assertions as Dictionary[];
  }

}

export { AceByDaisy }
