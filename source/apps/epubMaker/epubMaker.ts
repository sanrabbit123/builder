import { Dictionary, FlatDeath } from "../classStorage/dictionary.js";
import { EpubMediaTypeInfo, ManifestTarget, BookSourceInput, EpubInspectResult, EpubInspectError, EpubWorkStatus, EpubWorkTimelineUnit, EpubWork } from "../classStorage/epubType.js";
import { Mother } from "../mother.js";
import { ADDRESS } from "../infoObj.js";
import { createReadStream, createWriteStream } from "fs";
import { Writable, Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import { spawn } from "child_process";
import { AceByDaisy } from "./module/aceByDaisy.js";

class EpubMaker {

  public address: { abstractinfo: { host: string; key: string; } };
  public sourceDir: string;
  public tempDir: string;
  public defaultSourceName: string;
  public defaultSource: string;
  public epubMediaTypes: EpubMediaTypeInfo[];
  public defaultChapterContentsString: string;
  public defaultContentOptFile: string;
  public defaultNavFile: string;
  public defaultTocFile: string;
  public copyDefaultKey: string;
  public stringSource: string[];
  public stringCopySource: string[];
  public epubWorkCollection: string;

  constructor () {
    this.address = ADDRESS;
    this.sourceDir = path.join(Mother.launcherPath, "./epub/source");
    this.tempDir = Mother.tempFolder;
    this.defaultSourceName = "default";
    this.defaultSource = path.join(Mother.launcherPath, "./epub/source/" + this.defaultSourceName);
    this.copyDefaultKey = "copiedDefault_";
    this.epubMediaTypes = [
      { mediaTypeName: "application/xhtml+xml", fileExe: [ "xhtml", "html" ] }, 
      { mediaTypeName: "application/x-dtbncx+xml", fileExe: [ "ncx" ] },        
      { mediaTypeName: "text/css", fileExe: [ "css" ] },                        
      { mediaTypeName: "image/gif", fileExe: [ "gif" ] },
      { mediaTypeName: "image/jpeg", fileExe: [ "jpg", "jpeg" ] },
      { mediaTypeName: "image/png", fileExe: [ "png" ] },
      { mediaTypeName: "image/svg+xml", fileExe: [ "svg" ] },                   
      { mediaTypeName: "font/woff", fileExe: [ "woff" ] },                      
      { mediaTypeName: "font/woff2", fileExe: [ "woff2" ] },                    
      { mediaTypeName: "font/ttf", fileExe: [ "ttf" ] },                        
      { mediaTypeName: "font/otf", fileExe: [ "otf" ] },                        
      { mediaTypeName: "audio/mpeg", fileExe: [ "mp3" ] },                      
      { mediaTypeName: "audio/mp4", fileExe: [ "m4a" ] },                       
      { mediaTypeName: "application/javascript", fileExe: [ "js" ] },           
      { mediaTypeName: "video/mp4", fileExe: [ "mp4" ] },                       
      { mediaTypeName: "application/pdf", fileExe: [ "pdf" ] },                 
      { mediaTypeName: "application/xml", fileExe: [ "xml" ] },                 
      { mediaTypeName: "text/plain", fileExe: [ "txt" ] },                      
    ];
    this.defaultChapterContentsString = "";
    this.defaultContentOptFile = "";
    this.defaultNavFile = "";
    this.defaultTocFile = "";
    this.stringSource = [
      "/.phcode.json",
      "/META-INF/container.xml",
      "/OEBPS/content.opf",
      "/OEBPS/Styles/general.css",
      "/OEBPS/Styles/sgc-nav.css",
      "/OEBPS/Text/author.xhtml",
      "/OEBPS/Text/back.xhtml",
      "/OEBPS/Text/backSpacer.xhtml",
      "/OEBPS/Text/context.xhtml",
      "/OEBPS/Text/cover.xhtml",
      "/OEBPS/Text/info.xhtml",
      "/OEBPS/Text/nav.xhtml",
      "/OEBPS/Text/spacer.xhtml",
      "/OEBPS/Text/toc.ncx",
    ];
    this.stringCopySource = [
      "/OEBPS/Text/chapter/chapter1.xhtml",
      "/OEBPS/Styles/local1.css",
    ];
    this.epubWorkCollection = "epubWorks"
  }

  public defaultRead = async (): Promise<void> => {
    const instance = this;
    const { fileSystem } = Mother;
    try {
      const defaultChapterContentsString: string = await fileSystem("readString", [ path.join(this.defaultSource, "/OEBPS/Text/chapter/chapter1.xhtml") ]);
      const defaultContentOptFile: string = await fileSystem("readString", [ path.join(this.defaultSource, "/OEBPS/content.opf") ]);
      const defaultNavFile: string = await fileSystem("readString", [ path.join(this.defaultSource, "/OEBPS/Text/nav.xhtml") ]);
      const defaultTocFile: string = await fileSystem("readString", [ path.join(this.defaultSource, "/OEBPS/Text/toc.ncx") ]);
      this.defaultChapterContentsString = defaultChapterContentsString;
      this.defaultContentOptFile = defaultContentOptFile;
      this.defaultNavFile = defaultNavFile;
      this.defaultTocFile = defaultTocFile;
    } catch (e) {
      console.log(e);
      this.defaultChapterContentsString = "";
    }
  }

  public optimizationFonts = async (targetEpubFilePath: string): Promise<{ base: string; zip: string }> => {
    const instance = this;
    const { shellExec, fileSystem, zipFile, unzipFile } = Mother;
    try {
      targetEpubFilePath = path.normalize(targetEpubFilePath);
      const subsetTextFileName: string = "text_for_subset.txt";
      const baseFolder: string = await unzipFile(targetEpubFilePath);
      const generalXhtmlFileList: string[] = (await fileSystem("readFolder", [ baseFolder + "/OEBPS/Text" ])).filter((s: string) => /\.xhtml/gis.test(s)).map((s: string) => path.normalize(baseFolder + "/OEBPS/Text/" + s));
      const chapterXhtmlFileList: string[] = (await fileSystem("readFolder", [ baseFolder + "/OEBPS/Text/chapter" ])).filter((s: string) => /\.xhtml/gis.test(s)).map((s: string) => path.normalize(baseFolder + "/OEBPS/Text/chapter/" + s));
      const styleCssFileList: string[] = (await fileSystem("readFolder", [ baseFolder + "/OEBPS/Styles" ])).filter((s: string) => /\.css/gis.test(s)).map((s: string) => path.normalize(baseFolder + "/OEBPS/Styles/" + s));
      const uniqueChars = new Set<string>();
      uniqueChars.add(" ");
      uniqueChars.add("_");
      uniqueChars.add("[");
      uniqueChars.add("]");
      uniqueChars.add("<");
      uniqueChars.add(">");
      uniqueChars.add("{");
      uniqueChars.add("}");
      uniqueChars.add("(");
      uniqueChars.add(")");
      uniqueChars.add(".");
      uniqueChars.add("?");
      uniqueChars.add("!");

      const processingPromises = generalXhtmlFileList.concat(chapterXhtmlFileList).concat(styleCssFileList).map((filePath: string) => {
        return new Promise<void>((resolve, reject) => {
          const stream = createReadStream(filePath, { encoding: "utf8" });
          stream.on("data", (chunk: string | Buffer) => {
            let thisTarget: string;
            if (typeof chunk === "string") {
              thisTarget = chunk;
            } else {
              thisTarget = chunk.toString("utf8");
            }
            for (const char of thisTarget) {
              uniqueChars.add(char);
            }
          });
          stream.on("end", () => {
            resolve();
          });
          stream.on("error", (err) => {
            reject(err);
          });
        });
      });
      await Promise.all(processingPromises);

      await fileSystem("writeString", [
        path.join(baseFolder, subsetTextFileName),
        JSON.stringify([ ...uniqueChars ], null, 2)
      ]);

      const pyftsubsetCommand: string = path.join(Mother.pythonScriptPath, "pyftsubset.py");
      const beforeToken: string = "__before__";
      const subsetTextPath: string = path.join(baseFolder, subsetTextFileName);
      const fontList: string[] = (await fileSystem("readFolder", [ path.join(baseFolder, "./OEBPS/Fonts") ])).map((s: string) => path.join(baseFolder, "./OEBPS/Fonts", s));

      for (let fontFileFullPath of fontList) {
        const before: string = path.join(path.dirname(fontFileFullPath), beforeToken + path.basename(fontFileFullPath));
        const original: string = fontFileFullPath;
        await fileSystem("move", [ original, before ]);
        await shellExec(
          Mother.python3Program,
          [
            pyftsubsetCommand,
            before,
            `--text-file=${ subsetTextPath }`,
            `--output-file=${ original }`,
          ]
        )
        await fileSystem("remove", [ before ]);
      }

      await zipFile(
        path.join(baseFolder, "./OEBPS/Fonts"),
        path.join(baseFolder, "./fonts.zip"),
        false,
        5 * 60 * 1000,
        baseFolder,
      );

      return {
        base: baseFolder,
        zip: path.join(baseFolder, "./fonts.zip"),
      }
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public itemMediaType = (fileName: string): string => {
    const instance = this;
    const epubMediaTypes = this.epubMediaTypes;
    try {
      let finalSelect: string;
      finalSelect = "text/plain";
      for (let { mediaTypeName, fileExe } of epubMediaTypes) {
        for (let s of fileExe) {
          if ((new RegExp("." + s + "$", "gi")).test(fileName.trim())) {
            finalSelect = mediaTypeName;
            break;
          }
        }
      }
      return finalSelect;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public bookIdMaker = (): string => {
    const instance = this;
    const uuid: string = crypto.randomUUID();
    return `urn:uuid:${ uuid }`;
  }

  public secondInspect = async (targetEpubFilePath: string): Promise<EpubInspectError[]> => {
    const instance = this;
    const { sleep, fileSystem } = Mother;
    try {
      const assertions = await AceByDaisy.getAssertions(targetEpubFilePath);
      const finalResult: EpubInspectError[] = [];
      for (let i = 0; i < assertions.length; i++) {
        try {
          const errorMother: Dictionary = assertions[ i ];
          if (typeof errorMother[ "earl:result" ] !== "object" || errorMother[ "earl:result" ] === null) {
            throw new Error("ace file earl:result");
          }
          if (typeof errorMother[ "earl:result" ][ "earl:outcome" ] !== "string") {
            throw new Error("ace file earl:outcome");
          }
          if (typeof errorMother[ "earl:testSubject" ] !== "object" || errorMother[ "earl:testSubject" ] === null) {
            throw new Error("ace file earl:testSubject");
          }
          if (typeof errorMother[ "earl:testSubject" ][ "url" ] !== "string") {
            throw new Error("ace file earl:url");
          }

          const outcomeStringRaw: string = errorMother[ "earl:result" ][ "earl:outcome" ].trim();
          if (!/pass/.test(outcomeStringRaw)) {

            if (Array.isArray(errorMother.assertions)) {
              for (let j = 0; j < errorMother.assertions.length; j++) {
                const errorObj: Dictionary = errorMother.assertions[ j ];
                if (typeof errorObj[ "earl:result" ][ "dct:description" ] !== "string") {
                  throw new Error("ace file dct:description");
                }
                if (typeof errorObj[ "earl:test" ] !== "object" || errorObj[ "earl:test" ] === null) {
                  throw new Error("ace file earl:test");
                }
                if (typeof errorObj[ "earl:test" ][ "dct:title" ] !== "string") {
                  throw new Error("ace file dct:title");
                }
                if (typeof errorObj[ "earl:test" ][ "dct:description" ] !== "string") {
                  throw new Error("ace file dct:description");
                }
                const descriptionStringRaw: string = errorObj[ "earl:result" ][ "dct:description" ].trim();
                const titleStringRaw: string = errorObj[ "earl:test" ][ "dct:title" ].trim();
                const descriptionDctStringRaw: string = errorObj[ "earl:test" ][ "dct:description" ].trim();

                if (typeof outcomeStringRaw !== "string" || outcomeStringRaw === "") {
                  throw new Error("raw error 0");
                }
                if (typeof descriptionStringRaw !== "string" || descriptionStringRaw === "") {
                  throw new Error("raw error 1");
                }
                if (typeof titleStringRaw !== "string" || titleStringRaw === "") {
                  throw new Error("raw error 2");
                }
                if (typeof descriptionDctStringRaw !== "string" || descriptionDctStringRaw === "") {
                  throw new Error("raw error 3");
                }

                let fileName: string = "";
                let line: string = "";
                let errorString: string = "";

                errorString = "";
                fileName = errorMother[ "earl:testSubject" ][ "url" ].trim();
                errorString = (errorObj[ "earl:test" ][ "dct:title" ].toLowerCase().trim() === "heading-order") ? ("h 태그의 순서가 잘못되었습니다. (반드시 순서대로 있어야 함)") : (errorObj[ "earl:test" ][ "dct:title" ] + "  " + errorObj[ "earl:test" ][ "dct:description" ]);
                errorString = errorString.trim();

                try {
                  fileName = path.basename(path.normalize(fileName))
                    .replace(/chapter/gi, "챕터")
                    .replace(/author/gi, "작가 소개")
                    .replace(/context/gi, "목차")
                    .replace(/content/gi, "설정 파일")
                    .replace(/info/gi, "서지 정보")
                    .replace(/\.xhtml/gi, "")
                    .replace(/\.opf/gi, "")
                    .replace(/\.ncx/gi, "")
                    .replace(/\.css/gi, "");
                } catch {
                  throw new Error("invalid file name");
                }
                fileName = fileName.trim();
                if (fileName === "") {
                  throw new Error("cannot found file name 2");
                }
                line = "a";
                finalResult.push({
                  fileName,
                  line,
                  error: errorString,
                });
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
      }

      return finalResult;
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public inspectEpub = async (
    targetEpubFilePath: string,
    deleteMode: boolean = false,
  ): Promise<EpubInspectResult> => {
    const instance = this;
    const { sleep, fileSystem } = Mother;
    const epubCheckSpawn = (targetPath: string): Promise<string> => {
      return new Promise<string>((resolve, reject) => {
        const env = {
          LC_MESSAGES: "ko_KR.UTF-8",
        };
        const program = spawn(Mother.javaProgram, [ "-jar", path.join(Mother.launcherPath, "./epub/epubcheck/epubcheck.jar"), targetPath ], { env });
        let out: string;
        out = "";
        program.stdout.on("data", (data) => { out += String(data); });
        program.stderr.on("data", (data) => { out += String(data); });
        program.on("close", (code) => { resolve(out.trim()); });
      })
    }
    try {
      targetEpubFilePath = path.normalize(targetEpubFilePath);
      const stdout: string = await epubCheckSpawn(targetEpubFilePath);
      let secondError: EpubInspectError[] = [];
      try {
        secondError = await instance.secondInspect(targetEpubFilePath);
      } catch (e) {
        console.log(e);
        secondError = [];
      }
      if (deleteMode) {
        await sleep(500);
        if (/epubcheck[A-Z0-9]+\/.+\.(epub|EPUB)$/g.test(targetEpubFilePath.trim())) {
          await fileSystem("remove", [ path.dirname(targetEpubFilePath) ]);
        } else {
          await fileSystem("remove", [ targetEpubFilePath ]);
        }
      }
      if (
        /No\s*errors\s*or\s*warnings/gis.test(stdout) ||
        /오류(나)?\s*(또는)?\s*경고(가)?\s*(발견|감지)되지\s*않았/gis.test(stdout)
      ) {
        if (secondError.length === 0) {
          return {
            status: "success",
            errors: [],
          }
        } else {
          return {
            status: "error",
            errors: ([] as EpubInspectError[]).concat(secondError),
          }
        }
      } else {
        try {
          let firstError: EpubInspectError[] = (stdout
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s !== "")
            .slice(1, -3)
            .map((s) => s.split(":").slice(1).join(":"))
            .map((s) => s.split(":").map((a: string, i: number) => {
              if (i === 0) {
                const fileName: string =
                  path.basename(path.normalize(a))
                    .replace(/chapter/gi, "챕터")
                    .replace(/author/gi, "작가 소개")
                    .replace(/context/gi, "목차")
                    .replace(/content/gi, "설정 파일")
                    .replace(/info/gi, "서지 정보")
                    .replace(/\.xhtml/gi, ": ")
                    .replace(/\.opf/gi, ": ")
                    .replace(/\.ncx/gi, ": ")
                    .replace(/\.css/gi, ": ")
                return fileName + "번째 줄";
              } else {
                return a;
              }
            }).join(':'))
            .map((s) => s.split(":"))
            .map((arr) => {
              return {
                fileName: arr[ 0 ].trim(),
                line: arr[ 1 ].replace(/[\(\)]/gi, "").trim(),
                error: arr.slice(2).join(':').trim()
              }
            }) as EpubInspectError[]);
          return {
            status: "error",
            errors: firstError.concat(secondError),
          }
        } catch (e) {
          console.log(e);
          return {
            status: "error",
            errors: [
              {
                fileName: "",
                line: "",
                error: (e as Error).message,
              }
            ]
          }
        }
      }
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }
  
  public renderEpub = async (targetFolder: string): Promise<string> => {
    const instrance = this;
    const { sourceDir, tempDir } = this;
    const { shellExec, fileSystem, uniqueValue, zipFile } = Mother;
    try {
      const thisRenderedBookName: string =
        "epub_book_" +
        JSON.stringify(new Date()).slice(1, -1).replace(/\.[0-9][0-9][0-9]Z/gi, "Z").replace(/[^0-9]/gi, "") +
        "_" +
        uniqueValue("hex");
      const finalRenderedFile: string = path.join(tempDir, thisRenderedBookName + ".epub");
      await zipFile(targetFolder, finalRenderedFile, true);
      return finalRenderedFile;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public multiplyChapter = async (
    copiedDefaultTempTarget: string,
    chapterNumber: number,
  ) => {
    const instance = this;
    const { errorLog } = Mother;
    try {
      if (this.defaultChapterContentsString === "") {
        await this.defaultRead();
      }
      const defaultChapterFolder: string = path.join(copiedDefaultTempTarget, "./OEBPS" + "/Text" + "/chapter");
      const defaultCssFolder: string = path.join(copiedDefaultTempTarget, "./OEBPS" + "/Styles");
      const defaultImageFolder: string = path.join(copiedDefaultTempTarget, "./OEBPS" + "/Images");
      const defaultCssPath: string = path.join(defaultCssFolder, "./local1.css");
      const defaultChapterContentsString: string = this.defaultChapterContentsString;
      let chapterString: string;
      let currentChapterIndex: number;
      let targetChapterPath: string;
      let targetCssPath: string;
      let targetImageFolder: string;

      for (let i = 0; i < chapterNumber; i++) {
        currentChapterIndex = i + 1;
        targetChapterPath = path.join(defaultChapterFolder, `chapter${currentChapterIndex}.xhtml`);
        targetCssPath = path.join(defaultCssFolder, `local${currentChapterIndex}.css`);
        targetImageFolder = path.join(defaultImageFolder, `local${currentChapterIndex}`);

        await pipeline(
          createReadStream(defaultCssPath),
          createWriteStream(targetCssPath)
        );

        chapterString = defaultChapterContentsString;
        chapterString = chapterString.replace(/(<title>Chapter )[0-9](<\/title>)/gi, (match, p1, p2) => {
          return (p1 + String(i + 1) + p2);
        })
        chapterString = chapterString.replace(/(link[ ]*href\=["']\.\.\/\.\.\/Styles\/local)1(\.css["'])/gi, (match, p1, p2) => {
          return (p1 + String(i + 1) + p2);
        });

        await pipeline(
          Readable.from(chapterString, { encoding: "utf8" }),
          createWriteStream(targetChapterPath, { encoding: "utf8" })
        );
      }

    } catch (e) {
      errorLog((e as Error).message).catch((e) => console.log(e));
      throw new Error((e as Error).message);
    }
  }

  public rewriteOptions = async (
    copiedDefaultTempTarget: string,
    metaDataString: string = "",
  ): Promise<boolean> => {
    const instance = this;
    const splitToken = "__split__";
    const { sourceDir, tempDir, defaultSource, defaultSourceName } = this;
    const { fileSystem, treeParsing, uniqueValue, sleep, dateToString, objectDeepCopy } = Mother;
    try {
      if (this.defaultNavFile === "") {
        await this.defaultRead();
      }
      const blankTap: string = (new Array(2)).fill(" ", 0).join("");
      const idException: Array<{ fileName: string; id: string; }> = [
        {
          fileName: "nav.xhtml",
          id: "nav"
        },
        {
          fileName: "cover.jpg",
          id: "cover-image"
        },
      ];
      let fileTree: FlatDeath;
      let directoryTarget: FlatDeath;
      let nonDirectoryTarget: FlatDeath;
      let manifestTarget: FlatDeath;
      let mainfestRenderedTargets: ManifestTarget[];
      let hrefString: string;
      let manifestTagString: string;
      let contentOptFile: string;
      let originalContentsString: string;
      let spineString: string;
      let contextGroup: Array<{ id: string; href: string; }>;
      let replaceDo: boolean;
      let finalContentsOpfString: string;
      let originalNavString: string;
      let originalNavStringArr: string[];
      let olIndex: number;
      let olEndIndex: number;
      let middleArray0: string[];
      let middleArray1: string[];
      let middleArray2: string[];
      let thisExist: boolean;
      let navString: string;
      let originalTocString: string;
      let originalTocStringArr: string[];
      let ulIndex: number;
      let ulEndIndex: number;
      let middleArray3: string[];
      let middleArray4: string[];
      let middleArray5: string[];
      let tocString: string;
      let metaDataStringCopied: string;
      let authorName: string;

      contentOptFile = path.join(copiedDefaultTempTarget, "./OEBPS/content.opf");

      // meta string
      if (metaDataString === "") {
        originalContentsString = "";
        instance.defaultContentOptFile.split("\n").map((s: string) => s.trim()).join(splitToken).replace(/<metadata[^>]+>(.+)<\/metadata>/gi, (match: string, p1: string) => {
          originalContentsString = p1.trim();
          return "";
        });

        metaDataString = `<!-- 메타데이터 (책의 기본 정보) -->\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">\n`;
        metaDataString += String(
          originalContentsString
            .split(splitToken)
            .map((s: string) => s.trim())
            .filter((s: string) => s !== "")
            .filter((s: string) => !/property=['"]rendition\:layout['"]/gi.test(s))
            .filter((s: string) => !/property=['"]page\-progression\-direction['"]/gi.test(s))
            .filter((s) => !/property=['"]schema\:accessibilitySummary['"]/gi.test(s))
            .filter((s) => !/property=['"]schema\:accessibilityHazard['"]/gi.test(s))
            .filter((s) => !/property=['"]schema\:accessibilityFeature['"]/gi.test(s))
            .filter((s) => !/property=['"]schema\:accessModeSufficient['"]/gi.test(s))
            .filter((s) => !/property=['"]schema\:accessMode['"]/gi.test(s))
            .filter((s) => !/property=['"]a11y\:certifiedBy['"]/gi.test(s))
            .filter((s) => !/property=['"]a11y\:certifierCredential['"]/gi.test(s))
            .filter((s) => !/rel=['"]a11y\:certifierReport['"]/gi.test(s))
            .filter((s) => !/rel=['"]dcterms\:conformsTo['"]/gi.test(s))
            .map((s: string) => {
              if (/dcterms\:modified/gi.test(s)) {
                return `<meta property="dcterms:modified">${JSON.stringify(new Date()).slice(1, -1).replace(/\.[0-9][0-9][0-9]Z/gi, "Z")}</meta>`
              } else {
                return s;
              }
            })
            .map((s: string) => blankTap + s)
            .join("\n")
        );
        metaDataString += "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessMode">textual</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessMode">visual</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessModeSufficient">textual, visual</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessibilityFeature">structuralNavigation</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessibilityFeature">displayTransformability</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessibilityHazard">none</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="schema:accessibilitySummary">이 EPUB은 스크린 리더를 위한 구조적 탐색 기능을 포함하고 있으며, 사용자가 텍스트 스타일을 조정할 수 있습니다. 알려진 접근성 위험 요소는 없습니다.</meta>` + "\n";
        metaDataString += `${ blankTap }<link rel="dcterms:conformsTo" href="http://www.w3.org/TR/WCAG20/#AA" id="wcag-aa" />` + "\n";
        metaDataString += `${ blankTap }<meta property="a11y:certifiedBy" refines="#wcag-aa" id="certifier">Abstract Cloud</meta>` + "\n";
        metaDataString += `${ blankTap }<meta property="a11y:certifierCredential">Abstract Cloud</meta>` + "\n";
        metaDataString += `${ blankTap }<link rel="a11y:certifierReport" refines="#certifier" href="https://${ instance.address[ "abstractinfo" ][ "host" ] }" />` + "\n";
        metaDataString += `${ blankTap }<meta property="rendition:layout">reflowable</meta>` + "\n";
        metaDataString += "</metadata>";
      }
      metaDataStringCopied = String(metaDataString);
      authorName = "저자";
      metaDataStringCopied.replace(/<dc:creator>([^<]+)<\/dc:creator>/gi, (match, p1: string) => {
        authorName = String(p1).trim();
        return "";
      });

      // make manifest
      fileTree = (await treeParsing(copiedDefaultTempTarget)).flatDeath;
      directoryTarget = fileTree.filter((o) => o.directory);
      nonDirectoryTarget = fileTree.filter((o) => !o.directory);
      manifestTarget = nonDirectoryTarget.filter((o) => /OEBPS/g.test(o.absolute)).filter((o) => o.fileName !== "content.opf");

      mainfestRenderedTargets = [];
      for (let o of manifestTarget) {
        const fileName: string = path.basename(o.absolute);
        const baseName: string = path.dirname(o.absolute);
        const middleHrefString: string = baseName.split("OEBPS" + path.sep).at(-1) as string;
        hrefString = path.normalize(middleHrefString + path.sep + fileName);
        hrefString = hrefString.replaceAll(path.sep, "/");
        if (idException.map((o2) => o2.fileName).includes(o.fileName)) {
          mainfestRenderedTargets.push({
            id: idException.find((o2) => o2.fileName === o.fileName)!.id,
            href: hrefString,
            mediaType: instance.itemMediaType(o.fileName),
          })
        } else {
          mainfestRenderedTargets.push({
            id: hrefString.split("/").slice(1).join("_"),
            href: hrefString,
            mediaType: instance.itemMediaType(o.fileName),
          })
        }
      }
      manifestTagString = "<!-- 매니페스트 (책의 모든 파일 목록) -->\n";
      manifestTagString += "<manifest>\n";
      for (let m of mainfestRenderedTargets) {
        if (/\./gi.test(m.id)) {
          manifestTagString += (`${blankTap}<item id="${String(m.id.replace(/\./gi, "_"))}" href="${m.href}" media-type="${m.mediaType}" />\n`);
        } else {
          manifestTagString += (`${blankTap}<item id="${m.id}" href="${m.href}" media-type="${m.mediaType}" properties="${m.id}" />\n`);
        }
      }
      manifestTagString += "</manifest>";

      // spine
      spineString = "<!-- 스파인 (책의 읽기 순서) -->\n";
      spineString += "<spine>\n";
      spineString += `${blankTap}<!-- 표지 -->\n`;
      spineString += `${blankTap}<itemref idref="cover_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 서지 정보 -->\n`;
      spineString += `${blankTap}<itemref idref="info_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 저자 소개 -->\n`;
      spineString += `${blankTap}<itemref idref="author_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 목차 -->\n`;
      spineString += `${blankTap}<itemref idref="context_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 여백 -->\n`;
      spineString += `${blankTap}<itemref idref="spacer_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 본문 -->\n`;
      contextGroup = [];
      spineString += String(
        manifestTagString
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => /chapter[0-9]+\.xhtml/gi.test(s))
          .map((s: string) => {
            let a: string, b: string;
            a = "";
            b = "";
            replaceDo = false;

            s.replace(/id="([^"]+)"\s*href="([^"]+)"/gi, (match, p1: string, p2: string) => {
              a = p1;
              b = p2;
              if (
                match !== "" &&
                p1 !== "" &&
                p2 !== "" 
              ) {
                replaceDo = true;
              } else {
                replaceDo = false;
              }
              return ""
            });

            if ((a === "" || b === "") || !replaceDo) {
              s.replace(/href="([^"]+)"\s*id="([^"]+)"/gi, (match, p1: string, p2: string) => {
                b = p1;
                a = p2;
                if (
                  match !== "" &&
                  p1 !== "" &&
                  p2 !== "" 
                ) {
                  replaceDo = true;
                } else {
                  replaceDo = false;
                }
                return ""
              });
            }

            contextGroup.push({
              id: a,
              href: b.replace(/^Text/gi, "."),
            })

            return `<itemref idref="${a}"/>`;
          })
          .map((s: string) => blankTap + s)
          .join("\n")
      ) + "\n";
      spineString += `${blankTap}<!-- 여백 -->\n`;
      spineString += `${blankTap}<itemref idref="backSpacer_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 뒷표지 -->\n`;
      spineString += `${blankTap}<itemref idref="back_xhtml"/>\n`;
      spineString += `${blankTap}<!-- 네비게이터 -->\n`;
      spineString += `${blankTap}<itemref idref="nav" linear="no"/>\n`;
      spineString += "</spine>";

      // re-write content.opf
      finalContentsOpfString = `<?xml version="1.0" encoding="utf-8"?>\n`;
      finalContentsOpfString += `<package version="3.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf" xml:lang="ko">\n`;
      finalContentsOpfString += "\n";
      finalContentsOpfString += String(metaDataString + "\n\n" + manifestTagString + "\n\n" + spineString)
        .split("\n")
        .map((s: string) => blankTap + s)
        .join("\n")
      finalContentsOpfString += "\n\n";
      finalContentsOpfString += "</package>";
      await fileSystem("writeString", [
        path.join(copiedDefaultTempTarget, "./OEBPS/content.opf"),
        finalContentsOpfString
      ]);

      // nav
      originalNavString = instance.defaultNavFile;
      originalNavStringArr = originalNavString.split("\n");
      olIndex = originalNavStringArr.findIndex((s: string) => /<ol>/gi.test(s));
      olEndIndex = originalNavStringArr.findIndex((s: string) => /<\/ol>/gi.test(s));
      middleArray0 = (originalNavStringArr.slice(0, olIndex + 1));
      middleArray1 = (originalNavStringArr.slice(olIndex + 1, olEndIndex));
      middleArray2 = (originalNavStringArr.slice(olEndIndex));
      for (let c of contextGroup) {
        thisExist = false;
        thisExist = middleArray1.some((s: string) => {
          return (new RegExp(c.href, "gi")).test(s);
        });
        if (!thisExist) {
          middleArray1.push(`${blankTap}${blankTap}${blankTap}<li><a href="${c.href}">목차 내용</a></li>`)
        }
      }
      middleArray1.sort((a, b) => {
        let aTarget: number, bTarget: number;
        aTarget = 0;
        bTarget = 0;
        a.replace(/chapter([0-9]+)\.xhtml/gi, (match, p1: string) => {
          aTarget = Number(p1.replace(/[^0-9]/gi, ""));
          return "";
        });
        b.replace(/chapter([0-9]+)\.xhtml/gi, (match, p1: string) => {
          bTarget = Number(p1.replace(/[^0-9]/gi, ""));
          return "";
        });
        return aTarget - bTarget;
      });
      navString = middleArray0.concat(middleArray1).concat(middleArray2).join("\n");
      navString = navString.replace(/href="\.\//gi, "href=\"").replace(/hidden=""/gi, "hidden=\"hidden\"").replace(/hidden\s*>/gi, "hidden=\"hidden\">")
      await fileSystem("writeString", [
        path.join(copiedDefaultTempTarget, "./OEBPS/Text/nav.xhtml"),
        navString
      ]);

      // toc
      originalTocString = instance.defaultTocFile;
      originalTocStringArr = originalTocString.split("\n");
      ulIndex = originalTocStringArr.findIndex((s: string) => /<navMap>/gi.test(s));
      ulEndIndex = originalTocStringArr.findIndex((s: string) => /<\/navMap>/gi.test(s));
      middleArray3 = (originalTocStringArr.slice(0, ulIndex + 1));
      middleArray4 = (originalTocStringArr.slice(ulIndex + 1, ulEndIndex));
      middleArray5 = (originalTocStringArr.slice(ulEndIndex));
      for (let c of contextGroup) {
        thisExist = false;
        thisExist = middleArray4.some((s: string) => {
          return (new RegExp(c.href, "gi")).test(s);
        });
        if (!thisExist) {
          middleArray4.push(`${blankTap}${blankTap}<navPoint id="navPoint-${c.id.replace(/[^0-9]/gi, "")}" playOrder="${c.id.replace(/[^0-9]/gi, "")}"><navLabel><text>목차 내용</text></navLabel><content src="${c.href}"/></navPoint>`);
        }
      }
      middleArray4.sort((a, b) => {
        let aTarget: number, bTarget: number;
        aTarget = 0;
        bTarget = 0;
        a.replace(/chapter([0-9]+)\.xhtml/gi, (match, p1: string) => {
          aTarget = Number(p1.replace(/[^0-9]/gi, ""));
          return "";
        });
        b.replace(/chapter([0-9]+)\.xhtml/gi, (match, p1: string) => {
          bTarget = Number(p1.replace(/[^0-9]/gi, ""));
          return "";
        });
        return aTarget - bTarget;
      });
      tocString = middleArray3.concat(middleArray4).concat(middleArray5).join("\n").replace(/__\{bookId\}__/gi, (match) => {
        let bookId: string;
        bookId = "";
        metaDataString.replace(/<dc\:identifier[^>]+>([^<]+)</gi, (match: string, p1: string) => {
          bookId = p1;
          return match;
        })
        return bookId;
      })
      tocString = tocString.replace(/src="\.\//gi, "src=\"");
      await fileSystem("writeString", [
        path.join(copiedDefaultTempTarget, "./OEBPS/Text/toc.ncx"),
        tocString
      ]);

      return true;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public spawnSource = async (sourceInput: BookSourceInput, zipMode: boolean = true): Promise<string> => {
    const instance = this;
    const { tempDir, defaultSource } = this;
    const { fileSystem, uniqueValue, dateToString, hangulToEnglish, zipFile } = Mother;
    try {
      const stringSource = this.stringSource;
      const stringCopySource = this.stringCopySource;
      const copiedDefaultTempFolderName: string = instance.copyDefaultKey + uniqueValue("hex");
      const copiedDefaultTempTarget: string = path.join(tempDir, copiedDefaultTempFolderName);
      const finalFolderPureName: string = hangulToEnglish(sourceInput.title, false) + "_" + dateToString(new Date()).slice(2).replace(/[^0-9]/gi, "") + "_" + uniqueValue("short");
      const finalFolderFileName: string = path.join(tempDir, finalFolderPureName);
      const blankTap: string = (new Array(2)).fill(" ", 0).join("");
      let metaDataString: string;
      
      await fileSystem("copyFolder", [ defaultSource, copiedDefaultTempTarget ]);

      // metadata
      metaDataString = "<!-- 메타데이터 (책의 기본 정보) -->" + "\n";
      metaDataString += `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">` + "\n";
      metaDataString += `${blankTap}<dc:identifier id="BookId">${instance.bookIdMaker()}</dc:identifier>` + "\n";
      if (typeof sourceInput.isbn === "string" && sourceInput.isbn.trim() !== "") {
        metaDataString += `${ blankTap }<dc:identifier>urn:isbn:${ String(sourceInput.isbn).replace(/[^0-9]/gis, "") }</dc:identifier>` + "\n";
      }
      metaDataString += `${blankTap}<dc:language>ko</dc:language>` + "\n";
      metaDataString += `${blankTap}<dc:title>${sourceInput.title}</dc:title>` + "\n";
      metaDataString += `${blankTap}<dc:creator>${sourceInput.author}</dc:creator>` + "\n";
      metaDataString += `${blankTap}<dc:publisher>${sourceInput.publisher}</dc:publisher>` + "\n";
      metaDataString += `${blankTap}<dc:date>${dateToString(sourceInput.publishDate)}</dc:date>` + "\n";
      metaDataString += `${blankTap}<dc:subject>${sourceInput.subject.join(",")}</dc:subject>` + "\n";
      metaDataString += `${blankTap}<dc:description>${sourceInput.description}</dc:description>` + "\n";
      metaDataString += `${blankTap}<meta property="dcterms:modified">${JSON.stringify(new Date()).slice(1, -1).replace(/\.[0-9][0-9][0-9]Z/gi, "Z")}</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessMode">textual</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessMode">visual</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessModeSufficient">textual, visual</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessibilityFeature">structuralNavigation</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessibilityFeature">displayTransformability</meta>` + "\n";
      metaDataString += `${blankTap}<link rel="dcterms:conformsTo" href="http://www.w3.org/TR/WCAG20/#AA" id="wcag-aa" />` + "\n";
      metaDataString += `${blankTap}<meta property="a11y:certifiedBy" refines="#wcag-aa" id="certifier">Abstract Cloud</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="a11y:certifierCredential">Abstract Cloud</meta>` + "\n";
      metaDataString += `${blankTap}<link rel="a11y:certifierReport" refines="#certifier" href="https://${instance.address["abstractinfo"]["host"]}" />` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessibilityHazard">none</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="schema:accessibilitySummary">이 EPUB은 스크린 리더를 위한 구조적 탐색 기능을 포함하고 있으며, 사용자가 텍스트 스타일을 조정할 수 있습니다. 알려진 접근성 위험 요소는 없습니다.</meta>` + "\n";
      metaDataString += `${blankTap}<meta property="rendition:layout">reflowable</meta>` + "\n";
      metaDataString += `${blankTap}<meta name="cover" content="cover-image" />` + "\n";
      metaDataString += `</metadata>`;

      // chapter number: number
      await instance.multiplyChapter(
        copiedDefaultTempTarget,
        sourceInput.chapterNumber,
      );

      // rewrite manifest area
      await instance.rewriteOptions(
        copiedDefaultTempTarget,
        metaDataString,
      );

      if (zipMode) {
        await fileSystem("move", [ copiedDefaultTempTarget, finalFolderFileName ]);        
        const zipPureName: string = finalFolderPureName + ".zip";
        const zipFileFullPath: string = path.join(path.dirname(path.normalize(finalFolderFileName)), zipPureName);
        const zipBuffer: Buffer = await zipFile(
          finalFolderFileName.replace(/\/$/gis, ""),
          zipPureName,
          false,
          5 * 60 * 1000,
          zipFileFullPath
        );
        await fileSystem("writeBuffer", [ zipFileFullPath, zipBuffer ]);
        await fileSystem("remove", [ finalFolderFileName ]);
        return JSON.stringify({
          id: copiedDefaultTempFolderName,
          zip: zipFileFullPath,
        });
      } else {
        const finalStrings: string[] = [];
        for (let i = 0; i < sourceInput.chapterNumber; i++) {
          for (let s of stringCopySource) {
            finalStrings.push(s.replace(/([0-9]+)(\.)(xhtml|css)/gi, (match, p1, p2, p3) => { return (String(i + 1) + p2 + p3) }));
          }
        }
        return JSON.stringify(
          {
            id: copiedDefaultTempFolderName,
            folder: copiedDefaultTempTarget,
            data: stringSource.concat(finalStrings).map((s) => {
              return {
                folderId: copiedDefaultTempFolderName,
                fileName: path.basename(s),
                absolute: s,
              }
            })
          }
        );
      }

    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  // dev needs + dev (python3 exe, browser exe)

}

export { EpubMaker };
