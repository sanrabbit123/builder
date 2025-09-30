import path from "path";
import { existsSync } from "fs";
import fsPromise from "fs/promises";
import process from "process";
import { fileURLToPath } from "url";
import got from "got";
import { ADDRESS } from "../source/apps/infoObj";
import http2 from "http2";
import https from "https";

interface Dictionary {
  [ key: string ]: any;
}

interface CommitLog {
  key: string;
  date: Date;
  version: number;
}

export type List = Array<any>;

export type RequestData = Dictionary | List | string;

class TutleBuilder {

  public builderScriptUrl: string;
  public turtlePath: string;
  public rendererPath: string;
  public launcherPath: string;
  public distPath: string;
  public builderAppName: string;
  public envPath: string;
  public packagePath: string;
  public pushLocalServerUrl: string;

  constructor () {
    this.builderScriptUrl = fileURLToPath(import.meta.url);
    this.turtlePath = path.dirname(path.join(this.builderScriptUrl, "../"));
    this.rendererPath = path.join(this.turtlePath, "renderer");
    this.launcherPath = path.join(this.turtlePath, "launcher");
    this.distPath = path.join(this.turtlePath, "dist");
    this.envPath = path.join(this.turtlePath, ".env");
    this.packagePath = path.join(this.turtlePath, "package.json");
    this.builderAppName = "turtle";
    this.pushLocalServerUrl = "http://127.0.0.1:9000/gitPush";
  }

  public static equal = (jsonString: string | List | Dictionary): Dictionary | List => {
    if (typeof jsonString === "object") {
      jsonString = JSON.stringify(jsonString);
    }
    if (typeof jsonString !== "string") {
      jsonString = String(jsonString);
    }
    try {
      const filtered: string = jsonString.trim().replace(/(\"[0-9]+\-[0-9]+\-[0-9]+T[0-9]+\:[0-9]+\:[^Z]+Z\")/g, (match: any, p1: string) => {
        return "new Date(" + p1 + ")";
      });
      const tempFunc = new Function("const obj = " + filtered + "; return obj;") as () => Dictionary | List;
      const json: Dictionary | List = tempFunc();
      let temp: string, boo: boolean;
      if (typeof json === "object") {
        if (Array.isArray(json)) {
          for (let item of json) {
            if (typeof item === "string") {
              if (/^[\{\[]/.test(item.trim()) && /[\}\]]$/.test(item.trim())) {
                try {
                  temp = JSON.parse(item);
                  boo = true;
                } catch (e) {
                  boo = false;
                }
                if (boo) {
                  item = TutleBuilder.equal(item);
                }
              }
            }
          }
        } else {
          for (let i in json) {
            if (typeof json[ i ] === "string") {
              if (/^[\{\[]/.test(json[ i ].trim()) && /[\}\]]$/.test(json[ i ].trim())) {
                try {
                  temp = JSON.parse(json[ i ]);
                  boo = true;
                } catch (e) {
                  boo = false;
                }
                if (boo) {
                  json[ i ] = TutleBuilder.equal(json[ i ]);
                }
              }
            }
          }
        }
        return json;
      } else {
        throw Error("invalid input");
      }
    } catch (e) {
      console.log(e);
      throw Error("invalid input");
    }
  }

  public static stringToDate = (str: string | Date | number): Date => {
    if (str instanceof Date) {
      return str;
    }
    if (typeof str === "number") {
      return new Date(str);
    }
    if (typeof str !== "string") {
      throw new Error("invaild input");
    }
    if (str.trim() === '' || str.trim() === '-' || /없음/gi.test(str)) {
      return (new Date(1800, 0, 1));
    }
    if (str.trim() === "예정" || str.trim() === "진행중" || str.trim() === "미정") {
      return (new Date(3800, 0, 1));
    }

    const zeroAddition = (num: number): string => { return (num < 10) ? `0${ String(num) }` : String(num); };
    let tempArr: List, tempArr2: List, tempArr3: List, tempArr4: List, tempArr5: List;
    str = str.trim().replace(/[\~\t]/gi, '').trim();

    if (/T/g.test(str) && /Z$/.test(str) && /^[0-9]/.test(str) && /\-/g.test(str) && /\:/g.test(str)) {
      if (!Number.isNaN((new Date(str)).getTime())) {
        return new Date(str);
      }
    }
    if (/T/g.test(str) && /\+/g.test(str)) {
      str = str.split("+")[ 0 ] + "Z";
      if (!Number.isNaN((new Date(str)).getTime())) {
        return new Date(str);
      }
    }
    if (!/^[0-9][0-9][0-9][0-9]\-[0-9][0-9]\-[0-9][0-9]$/.test(str) && !/^[0-9][0-9][0-9][0-9]\-[0-9][0-9]\-[0-9][0-9] [0-9][0-9]\:[0-9][0-9]\:[0-9][0-9]$/.test(str)) {
      if (/^[0-9][0-9][ ]*\-[ ]*[0-9][0-9][ ]*\-[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("-").map((s) => { return s.trim() }).join("-");
        str = "20" + str;
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\-[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("-").map((s) => { return s.trim() }).join("-");
        str = str + "-01";
      } else if (/^[0-9][0-9][ ]*\-[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("-").map((s) => { return s.trim() }).join("-");
        str = "20" + str + "-01";
      } else if (/^[0-9][0-9][ ]*[년][ ]*[0-9]/.test(str)) {
        tempArr = str.split("년").map((s) => { return s.trim(); });
        if (/월/gi.test(str)) {
          tempArr4 = tempArr[ 1 ].trim().split("월");
          if (/일/gi.test(str)) {
            str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, '')) + 2000) + "-" + zeroAddition(Number(tempArr4[ 0 ].replace(/[^0-9]/gi, ''))) + "-" + zeroAddition(Number(tempArr4[ 1 ].split("일")[ 0 ].replace(/[^0-9]/gi, '')));
          } else {
            str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, '')) + 2000) + "-" + zeroAddition(Number(tempArr4[ 0 ].replace(/[^0-9]/gi, ''))) + "-01";
          }
        } else {
          str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, '')) + 2000) + "-" + zeroAddition(Number(tempArr[ 1 ].replace(/[^0-9]/gi, ''))) + "-01";
        }
      } else if (/^[0-9][0-9][0-9][0-9][ ]*[년][ ]*[0-9]/.test(str)) {
        tempArr = str.split("년").map((s) => { return s.trim(); });
        if (/월/gi.test(str)) {
          tempArr4 = tempArr[ 1 ].trim().split("월");
          if (/일/gi.test(str)) {
            str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, ''))) + "-" + zeroAddition(Number(tempArr4[ 0 ].replace(/[^0-9]/gi, ''))) + "-" + zeroAddition(Number(tempArr4[ 1 ].split("일")[ 0 ].replace(/[^0-9]/gi, '')));
          } else {
            str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, ''))) + "-" + zeroAddition(Number(tempArr4[ 0 ].replace(/[^0-9]/gi, ''))) + "-01";
          }
        } else {
          str = String(Number(tempArr[ 0 ].replace(/[^0-9]/gi, ''))) + "-" + zeroAddition(Number(tempArr[ 1 ].replace(/[^0-9]/gi, ''))) + "-01";
        }
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = str.slice(0, 4) + "-" + str.slice(4, 6) + "-" + str.slice(6);
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = str.slice(0, 4) + "-" + str.slice(4, 6) + "-" + str.slice(6, 8) + " " + str.slice(8, 10) + ":" + "00" + ":" + "00";
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = str.slice(0, 4) + "-" + str.slice(4, 6) + "-" + str.slice(6, 8) + " " + str.slice(8, 10) + ":" + str.slice(10, 12) + ":" + "00";
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = str.slice(0, 4) + "-" + str.slice(4, 6) + "-" + str.slice(6, 8) + " " + str.slice(8, 10) + ":" + str.slice(10, 12) + ":" + str.slice(12);
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = str.slice(0, 4) + "-" + str.slice(4, 6) + "-" + str.slice(6, 8) + " " + str.slice(8, 10) + ":" + str.slice(10, 12) + ":" + str.slice(12, 14);
      } else if (/^[0-9][0-9][0-9][0-9][0-9][0-9]$/.test(str.trim())) {
        str = "20" + str.slice(0, 2) + "-" + str.slice(2, 4) + "-" + str.slice(4);
      } else if (/^[0-9][0-9][ ]*\-[ ]*[0-9]$/.test(str)) {
        str = str.split("-").map((s) => { return s.trim() }).join("-");
        tempArr5 = str.split("-");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\-[ ]*[0-9]$/.test(str)) {
        str = str.split("-").map((s) => { return s.trim() }).join("-");
        tempArr5 = str.split("-");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][ ]+[0-9][0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9][0-9][ ]+[0-9][0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9][ ]+[0-9][0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9][0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]+[0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]+[0-9][0-9][ ]+[0-9][0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]+[0-9][ ]+[0-9][0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]+[0-9][0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]+[0-9][ ]+[0-9]$/.test(str)) {
        str = str.split(" ").map((s) => { return s.trim() }).filter((s) => { return s !== "" }).join(" ");
        tempArr5 = str.split(" ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9][0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9][0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\/[ ]*[0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9][0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9][ ]*\/[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9][0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\/[ ]*[0-9][ ]*\/[ ]*[0-9]$/.test(str)) {
        str = str.split("/").map((s) => { return s.trim() }).join("/");
        tempArr5 = str.split("/");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][0-9][ ]*\.?[ ]*$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9]\.[0-9][0-9][ ]*\.?[ ]*$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.?[ ]*$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.?[ ]*$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\.[ ]*[0-9][0-9][ ]*\.[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\.[ ]*[0-9][0-9][ ]*\.[ ]*[0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.[ ]*[0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][0-9][ ]*\.[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.[ ]*[0-9][0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][0-9][ ]*\.[ ]*[0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][ ]*\.[ ]*[0-9][ ]*\.[ ]*[0-9]$/.test(str)) {
        str = str.split(".").map((s) => { return s.trim() }).join(".");
        tempArr5 = str.split(".");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9]\. [0-9][0-9][ ]*\.?[ ]*$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9][0-9][ ]*\.?[ ]*$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9]\. [0-9][ ]*\.?[ ]*$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9]\.?$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + "01";
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9][0-9]\. [0-9][0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9]\. [0-9][0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9][0-9]\. [0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9][0-9][0-9]\. [0-9]\. [0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9]\. [0-9][0-9]\. [0-9][0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9]\. [0-9]\. [0-9][0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9]\. [0-9][0-9]\. [0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else if (/^[0-9][0-9]\. [0-9]\. [0-9]$/.test(str)) {
        tempArr5 = str.split(". ");
        str = "20" + tempArr5[ 0 ] + "-" + zeroAddition(Number(tempArr5[ 1 ])) + "-" + zeroAddition(Number(tempArr5[ 2 ]));
      } else {
        throw new Error("not date string : " + str);
      }
    }

    if (/^[0-9][0-9][0-9][0-9]\-[0-9][0-9]\-[0-9][0-9]$/.test(str)) {
      tempArr = str.split('-');
      return (new Date(Number(tempArr[ 0 ]), Number(tempArr[ 1 ]) - 1, Number(tempArr[ 2 ])));
    } else {
      tempArr = str.split(' ');
      tempArr2 = tempArr[ 0 ].split('-');
      tempArr3 = tempArr[ 1 ].split(':');
      return (new Date(Number(tempArr2[ 0 ]), Number(tempArr2[ 1 ]) - 1, Number(tempArr2[ 2 ]), Number(tempArr3[ 0 ]), Number(tempArr3[ 1 ]), Number(tempArr3[ 2 ])));
    }
  }

  public static dateToString = (date: Date, detail: boolean = false, dayOption: boolean = false): string => {
    const dayday: Array<string> = [ '일', '월', '화', '수', '목', '금', '토' ];
    if (detail === undefined || detail === null) {
      detail = false;
    }
    const zeroAddition = (num: number): string => { return (num < 10) ? `0${ String(num) }` : String(num); }
    const emptyDateValue: number = (new Date(1900, 0, 1)).valueOf();
    const futureDateValue: number = (new Date(3000, 0, 1)).valueOf();
    if (date.valueOf() <= emptyDateValue) {
      return "해당 없음";
    } else if (date.valueOf() >= futureDateValue) {
      return "예정";
    } else {
      if (!detail) {
        return `${ String(date.getFullYear()) }-${ zeroAddition(date.getMonth() + 1) }-${ zeroAddition(date.getDate()) }`;
      } else {
        if (dayOption) {
          return `${ String(date.getFullYear()) }-${ zeroAddition(date.getMonth() + 1) }-${ zeroAddition(date.getDate()) } ${ zeroAddition(date.getHours()) }:${ zeroAddition(date.getMinutes()) }:${ zeroAddition(date.getSeconds()) } ${ dayday[ date.getDay() ] }요일`;
        } else {
          return `${ String(date.getFullYear()) }-${ zeroAddition(date.getMonth() + 1) }-${ zeroAddition(date.getDate()) } ${ zeroAddition(date.getHours()) }:${ zeroAddition(date.getMinutes()) }:${ zeroAddition(date.getSeconds()) }`;
        }
      }
    }
  }

  public requestJson = async (url: string, data: RequestData = {}, config: Dictionary = {}): Promise<Dictionary | List> => {
    const finalConfig: Dictionary = { ...config };
    if (finalConfig[ "headers" ] === undefined) {
      finalConfig[ "headers" ] = {};
    }
    if (typeof finalConfig[ "headers" ][ "Content-Type" ] !== "string") {
      finalConfig[ "headers" ][ "Content-Type" ] = "application/json";
    }
    finalConfig[ "headers" ][ "X-Uragen-Secret" ] = "Uragen " + ADDRESS.abstractinfo.host.replace(/[\.\/\\\-]/gis, "");
    try {
      let responseBody: Dictionary | List;
      let method: string;
      let options: Dictionary;
      let gotOptions: Dictionary;
      let contentType: string;

      method = (Object.keys(data).length > 0 ? "post" : "get");
      if (finalConfig.method) {
        method = finalConfig.method.toLowerCase().trim();
      }
      method = method.toUpperCase();

      options = {
        http2: true,
        method: method,
        retry: { limit: 2 },
        headers: {
          ...finalConfig[ "headers" ],
        } as Dictionary,
        responseType: "json" as const,
        resolveBodyOnly: true as const,
        parseJson: (jsonText: string) => TutleBuilder.equal(jsonText),
        prefixUrl: "",
        encoding: "utf8",
        isStream: false,
      };
      if (typeof finalConfig.http1 === "boolean" && finalConfig.http1 === true) {
        options.http2 = false;
        delete config.http1;
        delete finalConfig.http1;
      }

      contentType = (options.headers?.[ "Content-Type" ] as string) || (options.headers?.[ "content-type" ] as string) || "";
      gotOptions = { ...options };

      if (method === "GET" || /get/gi.test(method)) {
        gotOptions.searchParams = new URLSearchParams(data);
      } else {
        if (config.formData === true || config.form === true || config.formData === 1 || config.form === 1) {
          const { FormData } = await import("formdata-node");
          const rawData: Dictionary = data as Dictionary;
          const form = new FormData();
          for (const key in rawData) {
            form.set(key, rawData[ key ]);
          }
          gotOptions.body = form;
        } else if (/application\/x\-www\-form\-urlencoded/gis.test(contentType.toLowerCase())) {
          gotOptions.form = data as Record<string, any>;
        } else {
          gotOptions.json = data;
        }
      }

      try {
        responseBody = await got(url, gotOptions);
      } catch {
        const httpsAgent = new https.Agent({
          family: 4,
          keepAlive: true
        });
        const customGot = got.extend({
          agent: { https: httpsAgent }
        });
        responseBody = await customGot(url, gotOptions);
      }

      return responseBody as Dictionary | List;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public makeKey = (obj: CommitLog) => {
    const instance = this;
    return instance.builderAppName + "_" + JSON.stringify(new Date()).replace(/[^0-9]/gi, '').slice(2) + "_v" + String(obj.version);
  }

  public environmentToDictionary = async (): Promise<Dictionary> => {
    const envString: string = await fsPromise.readFile(this.envPath, "utf8");
    const envMatrix: string[][] = envString.split("\n").map((s) => s.trim()).filter((s) => s !== "").map((s) => s.split("="));
    const address: Dictionary = {};
    for (let [ key, value ] of envMatrix) {
      address[ key.toLowerCase() ] = value.trim().replace(/^['"]/gi, "").replace(/['"]$/gi, "");
    }
    return address;
  }

  public getTurtleCommitList = async (): Promise<CommitLog[]> => {
    const instance = this;
    const { builderAppName } = this;
    try {
      const address: Dictionary = await this.environmentToDictionary();
      const githubApiVersion = "2022-11-28";
      const token: string = address.gh_token;
      const owner: string = address.gh_owner;
      const targetRepo: string = address.gh_repo;
      const base: string = "https://api.github.com";
      const headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + token,
        "X-GitHub-Api-Version": githubApiVersion,
      };
      let sinceDate: Date;
      let url: string;
      let response: Dictionary;
      let messageList: string[];
      let finalList: CommitLog[];

      url = `${ base }/repos/${ owner }/${ targetRepo }/commits`;
      sinceDate = new Date();
      sinceDate.setFullYear(sinceDate.getFullYear() - 2);

      response = await this.requestJson(url, { since: sinceDate.toISOString() }, { method: "get", headers: { ...headers } });
      messageList = response.map((o: Dictionary) => o.commit.message) as string[];
      messageList = messageList.filter((s) => (new RegExp("^\\s*" + builderAppName + "_[0-9]+_v[0-9]+\\s*$", "gi")).test(s)).map((s) => s.trim());
      messageList = messageList.filter((s) => s.split("_").length === 3);
      messageList = messageList.map((s) => "20" + s.split("_").slice(1).join("_"))
      finalList = messageList.map((s) => {
        const obj: CommitLog = {
          key: "",
          date: new Date(1800, 0, 1),
          version: 0,
        };
        const rawList: [ string, string ] = s.split("_") as [ string, string ];
        obj.date = TutleBuilder.stringToDate(rawList[ 0 ].slice(0, 4) + "-" + rawList[ 0 ].slice(4, 6) + "-" + rawList[ 0 ].slice(6));
        obj.version = Number(rawList[ 1 ].replace(/[^0-9\.\-]/gi, ""));
        if (Number.isNaN(obj.version)) {
          throw new Error("invalid version => " + s);
        }
        obj.key = instance.makeKey(obj);
        return obj;
      }).filter((o) => o.key !== "");
      finalList.sort((a, b) => {
        return (b.date.valueOf() + b.version) - (a.date.valueOf() + a.version);
      });

      return finalList;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public currentVersion = async (): Promise<CommitLog> => {
    const instance = this;
    try {
      const commits: CommitLog[] = await this.getTurtleCommitList();
      if (commits.length === 0) {
        throw new Error("git hub api error");
      }
      return commits[ 0 ];
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public nextVersion = async (): Promise<CommitLog> => {
    const instance = this;
    const { dateToString, stringToDate } = TutleBuilder;
    try {
      const latestVersion: CommitLog = await instance.currentVersion();
      let nextVersion: CommitLog;
      let date: Date;
      let version: number;
      let key: string;
      let today: Date;

      today = new Date();

      if (dateToString(today) === dateToString(latestVersion.date)) {
        nextVersion = {
          ...latestVersion,
          version: latestVersion.version + 1,
          date: today,
        };
        key = instance.makeKey(nextVersion);
        version = latestVersion.version + 1;
        date = today;
        nextVersion = { key, date, version };
      } else {
        nextVersion = {
          ...latestVersion,
          version: 1,
          date: today,
        };
        key = instance.makeKey(nextVersion);
        version = 1;
        date = today;
        nextVersion = { key, date, version };
      }

      return nextVersion;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public versionInjection = async (): Promise<boolean> => {
    const instance = this;
    const { dateToString, stringToDate } = TutleBuilder;
    try {
      const resultPath: string = this.rendererPath;
      const htmlPath: string = path.join(resultPath, "index.html");
      let htmlString: string;
      let versionInfo: CommitLog;

      versionInfo = await instance.nextVersion();
      htmlString = await fsPromise.readFile(htmlPath, "utf8");
      htmlString = htmlString.replace(/(\.mjs['"];?)(\s*)(const\s+start)/gis, (match: string, p1: string, p2: string, p3: string) => {
        const injection: string = `
        window.currentVersion = ${ JSON.stringify(versionInfo) };
        `.trim();
        return p1 + "\n\n" + injection + "\n\n" + p3;
      });

      await fsPromise.writeFile(
        htmlPath,
        htmlString,
        "utf8"
      );

      return true;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public nextPackageVersion = async (): Promise<string> => {
    const instance = this;
    const turtlePackagePath = this.packagePath;
    try {
      const packageContents: Dictionary = JSON.parse(await fsPromise.readFile(turtlePackagePath, "utf8"));
      let version: string;
      let newVersion: string;
      let mainNumber: number;
      let middleNumber: number;
      let lastNumber: number;

      version = "1.0.0";
      if (typeof packageContents.version === "string") {
        version = packageContents.version;
      }

      mainNumber = Number(version.split(".")[ 0 ])
      middleNumber = Number(version.split(".")[ 1 ])
      lastNumber = Number(version.split(".")[ 2 ])

      if (
        Number.isNaN(mainNumber) ||
        Number.isNaN(middleNumber) ||
        Number.isNaN(lastNumber)
      ) {
        throw new Error("invalid version status");
      }

      if (lastNumber < 9) {
        newVersion = [ String(mainNumber), String(middleNumber), String(lastNumber + 1) ].join(".")
      } else {
        newVersion = [ String(mainNumber), String(middleNumber + 1), String(0) ].join(".")
      }

      packageContents.version = newVersion;

      await fsPromise.writeFile(
        turtlePackagePath,
        JSON.stringify(packageContents, null, 2),
        "utf8"
      );

      return newVersion;
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public distSetting = async () => {
    const turtleDist: string = this.turtlePath + "/dist";

    await fsPromise.rm(turtleDist, { recursive: true, force: true, });
    await fsPromise.mkdir(turtleDist);

    const destDir = turtleDist;
    await fsPromise.mkdir(destDir, { recursive: true });
    await fsPromise.cp(this.rendererPath, turtleDist + "/renderer", { recursive: true });
  }

  public launching = async () => {
    await this.versionInjection();
    await this.nextPackageVersion();
    await this.distSetting();
    await this.requestJson(this.pushLocalServerUrl, { type: this.builderAppName });
  }

}

const app = new TutleBuilder();
app.launching().catch((err) => console.log(err));

export { TutleBuilder };