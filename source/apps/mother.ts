import { ADDRESS } from "./infoObj.js";
import { Dictionary, List, RequestData, Matrix, FolderMap, FileSystemType, Unique, UnknownFunction } from "./classStorage/dictionary.js";
import http2 from "http2";
import querystring from "querystring";
import fsPromise from "fs/promises";
import { Dirent } from "fs";
import fs from "fs";
import os from "os";
import { exec, spawn } from "child_process";
import path from "path";
import axios, { AxiosError, AxiosResponse } from "axios";
import https from "https";
import JSZip from "jszip";
import got, { Options } from "got";
import { TreeArray, TreeFile } from "./classStorage/treeArray.js";
import { app, BrowserWindow } from "electron";

class Mother {

  public static isMac: boolean = process.platform === "darwin";
  public static isWindows: boolean = /win32/gi.test(process.platform);
  public static isDev: boolean = !app.isPackaged;
  public static appPath: string = app.getAppPath();
  public static resourcePath: string = Mother.isDev ? app.getAppPath() : process.resourcesPath;
  public static scriptPath: string = path.join(app.getAppPath(), "dist");
  public static assetPath: string = path.join(Mother.appPath, "./renderer");
  public static launcherPath: string = path.join(Mother.resourcePath, "./launcher");
  public static programPath: string = path.normalize(Mother.launcherPath);
  public static javaProgram: string = Mother.isDev ? path.join(Mother.launcherPath, "./jre/mac-arm64/bin/java") : path.join(Mother.launcherPath, "./jre/bin/java" + (!Mother.isWindows ? "" : ".exe"));
  public static python3Program: string = Mother.isDev ? path.join(Mother.launcherPath, "./python3/mac-arm64/bin/python3.13") : (Mother.isMac ? path.join(Mother.launcherPath, "./python3/bin/python3.13") : path.join(Mother.launcherPath, "./python.exe"));
  public static pythonModulePath: string = Mother.isDev ? path.join(Mother.launcherPath, "./python3/mac-arm64/lib/python3.13/site-packages/bin") : (Mother.isMac ? path.join(Mother.launcherPath, "./python3/lib/python3.13/site-packages/bin") : path.join(Mother.launcherPath, "./python313/site-packages/bin"));
  public static pythonScriptPath: string = path.join(Mother.resourcePath, "./launcher/py");
  public static browserPath: string = Mother.isDev ? path.join(Mother.launcherPath, "./browser/mac-arm64/Chromium.app/Contents/MacOS/Chromium") : (Mother.isMac ? path.join(Mother.launcherPath, "./browser/Chromium.app/Contents/MacOS/Chromium") : path.join(Mother.launcherPath, "./chrome-win/chrome.exe"));
  public static requestSecretKey: string = ADDRESS.abstractinfo.key;
  public static requestSecretValue: string = "Uragen " + ADDRESS.abstractinfo.host.replace(/[\.\/\\\-]/gis, "");
  public static abstractTempFolderName: string = "abstract_cloud_temp_folder";
  public static tempFolder: string = path.join(app.getPath("temp"), path.normalize(Mother.abstractTempFolderName + "/temp"));
  public static staticFolder = path.join(Mother.tempFolder, "static");
  public static logFolder = path.join(Mother.tempFolder, "logs");
  public static homeFolder = app.getPath("home");

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
                  item = Mother.equal(item);
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
                  json[ i ] = Mother.equal(json[ i ]);
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

  public static sleep = (time: number): Promise<string> => {
    let timeoutId: any = null;
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        resolve("awake");
        clearTimeout(timeoutId);
      }, time);
    });
  }

  public static http2InNode = (url: string, data: RequestData = {}, config: Dictionary = {}): Promise<any> => {
    if (!/^http/gi.test(url)) {
      throw new Error("invalid url");
    }
    let method: string;
    let dataKeys: List;
    let configKeys: List;
    let dataBoo: boolean;
    let configBoo: boolean;
    let jsonBoo: boolean;
    let nvpBoo: boolean;
    let client: any;
    let req: any;
    let baseUrl: string, path: string;
    let urlArr: List;
    let protocol: string;
    let host: string;
    let res: any;
    let body: string;
    let configOption: Dictionary;
    let getData: string;
    let dataString: string;
    let dataValue: any;

    method = "get";
    dataKeys = Object.keys(data);
    configKeys = Object.keys(config);
    dataBoo = false;
    configBoo = false;
    jsonBoo = true;
    nvpBoo = false;

    if (dataKeys.length === 0 && configKeys.length === 0) {
      method = "get";
      data = {};
      config = {};
      dataBoo = false;
      configBoo = false;
    } else if (dataKeys.length === 0 && configKeys.length > 0) {
      method = "get";
      dataBoo = false;
      configBoo = true;
    } else if (dataKeys.length > 0) {
      method = "post";
      dataBoo = true;
      configBoo = (configKeys.length === 0) ? false : true;
    }

    if (configBoo) {
      if (/json/gi.test(JSON.stringify(config))) {
        jsonBoo = true;
      } else if (/x\-www\-form\-urlencoded/gi.test(JSON.stringify(config))) {
        nvpBoo = true;
        dataString = "";
        if (data !== "string") {
          if (typeof data === "object" && data !== null && !Array.isArray(data)) {
            for (let key in data) {
              dataValue = data[ key ];
              dataString += key.replace(/[\=\&]/g, '');
              dataString += '=';
              if (typeof dataValue === "object") {
                if (dataValue instanceof Date) {
                  dataString += JSON.stringify(dataValue).replace(/^\"/g, '').replace(/\"$/g, '');
                } else {
                  dataString += JSON.stringify(dataValue).replace(/[\=\&]/g, '').replace(/[ ]/g, '+');
                }
              } else {
                dataString += String(dataValue).replace(/[\=\&]/g, '').replace(/[ ]/g, '+');
              }
              dataString += '&';
            }
          }
        } else {
          dataString = data + "&";
        }
        data = dataString.slice(0, -1);
      } else {
        if (config.headers === undefined) {
          config.headers = {};
          config.headers[ "Content-Type" ] = "application/json";
        } else {
          config.headers[ "Content-Type" ] = "application/json";
        }
        jsonBoo = true;
      }
      if (config.method === "get") {
        method = "get";
      }
      if (config.method === "patch") {
        method = "patch";
      }
    } else {
      jsonBoo = true;
      config.headers = {};
      config.headers[ "Content-Type" ] = "application/json";
    }

    if (method === "get") {
      getData = "?";
      getData += querystring.stringify(data as Dictionary);
      if (/\?/gi.test(url)) {
        url = url + "&" + getData.slice(1);
      } else {
        url = url + getData;
      }
      if (config.method !== undefined) {
        delete config.method;
      }
    }

    urlArr = url.split("/").filter((s) => { return s !== "" });

    protocol = urlArr.shift();
    host = urlArr.shift();
    path = "/" + urlArr.join("/");
    baseUrl = protocol + "//" + host;

    return new Promise((resolve, reject) => {

      client = http2.connect(baseUrl);

      if (method === "get") {
        if (configBoo) {
          configOption = { ...config.headers };
        } else {
          configOption = {};
        }
        configOption[ ":method" ] = "GET";
        configOption[ ":path" ] = path;
      } else if (method === "post") {
        if (configBoo) {
          configOption = { ...config.headers };
        } else {
          configOption = {};
        }
        configOption[ ":method" ] = "POST";
        configOption[ ":path" ] = path;
        if (configOption[ "Content-Type" ] === undefined) {
          configOption[ "Content-Type" ] = "application/json";
        }
        if (typeof data === "object") {
          configOption[ "Content-Length" ] = Buffer.byteLength(JSON.stringify(data));
        } else {
          configOption[ "Content-Length" ] = Buffer.byteLength(data);
        }
      } else if (method === "patch") {
        if (configBoo) {
          configOption = { ...config.headers };
        } else {
          configOption = {};
        }
        configOption[ ":method" ] = "PATCH";
        configOption[ ":path" ] = path;
        if (configOption[ "Content-Type" ] === undefined) {
          configOption[ "Content-Type" ] = "application/json";
        }
        if (typeof data === "object") {
          configOption[ "Content-Length" ] = Buffer.byteLength(JSON.stringify(data));
        } else {
          configOption[ "Content-Length" ] = Buffer.byteLength(data);
        }
      }

      configOption[ Mother.requestSecretKey ] = Mother.requestSecretValue;
      req = client.request(configOption);
      client.on("error", () => {
        reject(null);
      })

      res = [];
      req.on("data", (chunk: any) => {
        res.push(chunk);
      });
      req.on("error", () => {
        reject(null);
      })
      req.on("end", () => {
        body = Buffer.concat(res).toString();
        client.close();
        resolve(Mother.equal(body));
      });

      if (method === "get") {
        req.end();
      } else {
        if (typeof data === "object") {
          req.end(JSON.stringify(data));
        } else {
          req.end(data);
        }
      }

    });

  }

  public static axiosRequest = (url: string, data: RequestData = {}, config: Dictionary = {}): Promise<any> => {
    let method: string;
    let dataKeys: List, configKeys: List;
    let dataBoo: boolean, configBoo: boolean, jsonBoo: boolean, nvpBoo: boolean;
    let form: any;
    let finalConfig: Dictionary;
    let getData: string;
    let formHeaders: Dictionary;
    let dataString: string;
    let dataValue: any;
    let formDataValue: any;

    method = "get";
    dataKeys = Object.keys(data);
    configKeys = Object.keys(config);
    dataBoo = false;
    configBoo = false;
    jsonBoo = true;
    nvpBoo = false;

    if (dataKeys.length === 0 && configKeys.length === 0) {
      method = "get";
      data = {};
      config = {};
      dataBoo = false;
      configBoo = false;
    } else if (dataKeys.length === 0 && configKeys.length > 0) {
      method = "get";
      dataBoo = false;
      configBoo = true;
    } else if (dataKeys.length > 0) {
      method = "post";
      dataBoo = true;
      configBoo = (configKeys.length === 0) ? false : true;
    }

    if (config.headers === undefined) {
      config.headers = {};
      config.headers[ "Content-Type" ] = "application/json";
      jsonBoo = true;
    }

    if (configBoo) {
      if (/json/gi.test(JSON.stringify(config))) {
        jsonBoo = true;
        if (config.headers === undefined) {
          config.headers = {};
          config.headers[ "Content-Type" ] = "application/json";
          jsonBoo = true;
        } else {
          if (config.formData === true) {
            jsonBoo = false;
            nvpBoo = false;
          } else {
            config.headers[ "Content-Type" ] = "application/json";
            jsonBoo = true;
          }
        }
      } else if (/x\-www\-form\-urlencoded/gi.test(JSON.stringify(config))) {
        nvpBoo = true;
        const urlData: URLSearchParams = new URLSearchParams();
        if (typeof data !== "string") {
          if (typeof data === "object" && data !== null && !Array.isArray(data)) {
            for (let key in data) {
              dataValue = data[ key ];
              if (typeof dataValue === "object") {
                if (dataValue instanceof Date) {
                  urlData.append(key, JSON.stringify(dataValue).replace(/^\"/g, '').replace(/\"$/g, ''));
                } else {
                  urlData.append(key, JSON.stringify(dataValue).replace(/[\=\&]/g, ''));
                }
              } else {
                urlData.append(key, String(dataValue).replace(/[\=\&]/g, ''));
              }
            }
          }
        } else {
          throw new Error("invalid nvp data");
        }
        data = urlData;
      } else {
        if (config.headers === undefined) {
          config.headers = {};
          config.headers[ "Content-Type" ] = "application/json";
          jsonBoo = true;
        } else {
          if (config.formData === true) {
            jsonBoo = false;
            nvpBoo = false;
          } else {
            config.headers[ "Content-Type" ] = "application/json";
            jsonBoo = true;
          }
        }
      }
      if (config.method === "get") {
        method = "get";
      }
      if (config.method === "patch") {
        method = "patch";
      }
      if (config.method === "put") {
        method = "put";
      }
      if (config.method === "delete") {
        method = "delete";
      }
    } else {
      jsonBoo = true;
      config.headers = {};
      config.headers[ "Content-Type" ] = "application/json";
    }

    if (method === "get") {
      getData = "?";
      getData += querystring.stringify(data as Dictionary);
      if (/\?/gi.test(url)) {
        url = url + "&" + getData.slice(1);
      } else {
        url = url + getData;
      }
    }
    if (config.method !== undefined) {
      delete config.method;
    }

    return new Promise((resolve, reject) => {
      if (method === "get") {
        if (!configBoo) {
          const headers: Dictionary = {};
          headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
          axios.get(url, { headers }).then((response: AxiosResponse) => {
            if (response.data !== undefined && response.data !== null) {
              resolve(response.data);
            } else {
              resolve(response);
            }
          }).catch((error: AxiosError) => {
            reject(error);
          });
        } else {
          config.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
          axios.get(url, config).then((response: AxiosResponse) => {
            if (response.data !== undefined && response.data !== null) {
              resolve(response.data);
            } else {
              resolve(response);
            }
          }).catch((error: AxiosError) => {
            reject(error);
          });
        }

      } else if (method === "post") {
        if (jsonBoo) {
          const thisConfig: Dictionary = { ...config };
          if (thisConfig.headers === undefined || thisConfig.headers === null) {
            thisConfig.headers = {};
          }
          thisConfig.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
          axios.post(url, data, thisConfig).then((response: AxiosResponse) => {
            if (response.data !== undefined && response.data !== null) {
              resolve(response.data);
            } else {
              resolve(response);
            }
          }).catch((error: AxiosError) => {
            reject(error);
          });
        } else if (nvpBoo) {
          const thisConfig: Dictionary = { ...config };
          if (thisConfig.headers === undefined || thisConfig.headers === null) {
            thisConfig.headers = {};
          }
          thisConfig.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
          axios.post(url, data, thisConfig).then((response: AxiosResponse) => {
            if (response.data !== undefined && response.data !== null) {
              resolve(response.data);
            } else {
              resolve(response);
            }
          }).catch((error: AxiosError) => {
            reject(error);
          });
        } else {
          form = new FormData();
          if (typeof data === "object" && data !== null && !Array.isArray(data)) {
            for (let key in data as Dictionary | List) {
              formDataValue = data[ key ];
              if (typeof formDataValue === "object" && formDataValue !== null) {
                if (formDataValue.constructor.name === "ReadStream") {
                  if (/\.png$/gi.test(formDataValue.path)) {
                    form.append(key, formDataValue, { filename: formDataValue.path.split("/")[ formDataValue.path.split("/").length - 1 ], contentType: "image/png" });
                  } else if (/\.(jpg|jpeg)$/gi.test(formDataValue.path)) {
                    form.append(key, formDataValue, { filename: formDataValue.path.split("/")[ formDataValue.path.split("/").length - 1 ], contentType: "image/jpeg" });
                  } else {
                    form.append(key, formDataValue);
                  }
                } else if (formDataValue.constructor.name === "Buffer") {
                  form.append(key, formDataValue);
                } else {
                  form.append(key, JSON.stringify(formDataValue));
                }
              } else if (formDataValue === null) {
                form.append(key, "");
              } else {
                form.append(key, formDataValue);
              }
            }
          }

          form.getLength((err: any, length: number) => {
            if (err) {
              reject(err);
            } else {
              formHeaders = form.getHeaders();
              formHeaders[ "Content-Length" ] = length;
              if (!configBoo) {
                axios.post(url, form, { headers: { ...formHeaders } }).then((response: AxiosResponse) => {
                  if (response.data !== undefined && response.data !== null) {
                    resolve(response.data);
                  } else {
                    resolve(response);
                  }
                }).catch((error: AxiosError) => {
                  reject(error);
                });
              } else {
                finalConfig = { headers: { ...formHeaders } };
                if (config.headers !== undefined) {
                  for (let z in config.headers) {
                    finalConfig.headers[ z ] = config.headers[ z ];
                  }
                  for (let z in config) {
                    if (z !== "headers") {
                      finalConfig[ z ] = config[ z ];
                    }
                  }
                } else {
                  for (let z in config) {
                    finalConfig[ z ] = config[ z ];
                  }
                }
                finalConfig.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
                axios.post(url, form, finalConfig).then((response: AxiosResponse) => {
                  if (response.data !== undefined && response.data !== null) {
                    resolve(response.data);
                  } else {
                    resolve(response);
                  }
                }).catch((error: AxiosError) => {
                  reject(error);
                });
              }
            }
          });
        }
      } else if (method === "patch") {
        const thisConfig: Dictionary = { ...config };
        if (thisConfig.headers === undefined || thisConfig.headers === null) {
          thisConfig.headers = {};
        }
        thisConfig.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
        axios.patch(url, data, thisConfig).then((response: AxiosResponse) => {
          if (response.data !== undefined && response.data !== null) {
            resolve(response.data);
          } else {
            resolve(response);
          }
        }).catch((error: AxiosError) => {
          reject(error);
        });
      } else if (method === "put") {
        const thisConfig: Dictionary = { ...config };
        if (thisConfig.headers === undefined || thisConfig.headers === null) {
          thisConfig.headers = {};
        }
        thisConfig.headers[ Mother.requestSecretKey ] = Mother.requestSecretValue;
        axios.put(url, data, thisConfig).then((response: AxiosResponse) => {
          if (response.data !== undefined && response.data !== null) {
            resolve(response.data);
          } else {
            resolve(response);
          }
        }).catch((error: AxiosError) => {
          reject(error);
        });
      }
    });
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

  public static shellExec = (command: string, args: string[] = []): Promise<string> => {
    return new Promise((resolve, reject) => {
      const program = spawn(command, args);
      let stdout: string = "";
      let stderr: string = "";

      program.stdout.on("data", (data) => { stdout += data.toString(); });
      // program.stderr.on("data", (data) => { stderr += data.toString(); });

      program.on("error", (err) => {
        reject(err);
      });

      program.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const error = new Error(`Process exited with code ${ code }\n${ stderr.trim() }`);
          reject(error);
        }
      });
    });
  }

  public static hexEncode = (str: string | ((...args: any[]) => Promise<any>)): string => {
    let hex: string;
    let result: string = "";
    let inputString: string;

    inputString = "";
    if (typeof str === "function") {
      inputString = str.toString();
    } else if (typeof str === "string") {
      inputString = str;
    } else {
      throw new Error("invalid input");
    }
    for (let i = 0; i < inputString.length; i++) {
      hex = inputString.charCodeAt(i).toString(16);
      result += String("000" + hex).slice(-4);
    }
    return result;
  }

  public static hexDecode = (hash: string): string => {
    let hexes: any[] = (hash.match(/.{1,4}/g) || []);
    let back: string = "";
    for (let j = 0; j < hexes.length; j++) {
      back += String.fromCharCode(parseInt(hexes[ j ], 16));
    }
    return back;
  }

  public static hexaJson = (input: Dictionary | string | UnknownFunction, middleMode: boolean = false): string | Dictionary | UnknownFunction => {
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const tokenStart: string = "__hexaFunctionStart__<<<";
    const tokenEnd: string = ">>>__hexaFunctionEnd__";
    const hexEncode = (str: string | UnknownFunction): string => {
      let hex: string;
      let result: string = "";
      let inputString: string;
      inputString = "";
      if (typeof str === "function") {
        inputString = str.toString();
      } else if (typeof str === "string") {
        inputString = str;
      } else {
        throw new Error("invalid input");
      }
      for (let i = 0; i < inputString.length; i++) {
        hex = inputString.charCodeAt(i).toString(16);
        result += String("000" + hex).slice(-4);
      }
      return result;
    }
    const hexDecode = (hash: string): string => {
      let hexes: RegExpMatchArray | string[] = (hash.match(/.{1,4}/g) || []);
      let back: string = "";
      for (let j = 0; j < hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[ j ], 16));
      }
      return back;
    }
    const hexaFunction = (input: Dictionary | string | UnknownFunction): string | UnknownFunction => {
      try {
        const toHex = (str: string): string => {
          return hexEncode(str);
        }
        const toFunction = (hash: string): string => {
          return hexDecode(hash);
        }
        let functionString: string, functionString_copied: string;
        let argString: string;
        let argArr: any[];
        let decodeFunction: unknown;
        let asyncBoo: boolean;

        if (typeof input === "function") {

          return (tokenStart + toHex(input.toString()) + tokenEnd);

        } else if (typeof input === "string") {

          if ((new RegExp('^' + tokenStart)).test(input) && (new RegExp(tokenEnd + '$')).test(input)) {
            input = input.replace(new RegExp('^' + tokenStart), '').replace(new RegExp(tokenEnd + '$'), '');
            functionString = toFunction(input);
            functionString_copied = String(functionString).trim();
            argString = '';
            asyncBoo = /^async/.test(functionString_copied);
            if (/^(async function|function)/i.test(functionString_copied)) {
              functionString_copied.replace(/^(async function|function) [^\(]*\(([^\)]*)\)[ ]*\{/, (match, p1, p2) => {
                argString = p2.trim();
                return match;
              });
            } else {
              functionString_copied.replace(/^(async \(|\()([^\)]*)\)[ ]*\=\>[ ]*\{/, (match, p1, p2) => {
                argString = p2.trim();
                return match;
              });
            }
            argString = argString.replace(/[ ]*\=[ ]*[\{\[][^\=]*[\}\]]/gi, '');
            argString = argString.replace(/[ ]*\=[ ]*[^,]+/gi, '');
            argArr = argString.split(',').map((str) => { return str.trim(); });
            if (argArr.some((str) => { return / /gi.test(str); })) {
              throw new Error("invaild argument name");
            }
            if (asyncBoo) {
              try {
                decodeFunction = new AsyncFunction(...argArr, functionString.trim().replace(/^(async function [^\(]*\([^\)]*\)[ ]*\{|async \([^\)]*\)[ ]*\=\>[ ]*\{)/, '').trim().replace(/\}$/, ''));
              } catch {
                decodeFunction = new AsyncFunction(...argArr, functionString.trim().replace(/^(async function [^\(]*\([^\)]*\)[ ]*\{|async \([^\)]*\)[ ]*\=\>[ ]*\{)/, '').trim());
              }
            } else {
              try {
                decodeFunction = new Function(...argArr, functionString.trim().replace(/^(function [^\(]*\([^\)]*\)[ ]*\{|\([^\)]*\)[ ]*\=\>[ ]*\{)/, '').trim().replace(/\}$/, ''));
              } catch {
                decodeFunction = new Function(...argArr, functionString.trim().replace(/^(function [^\(]*\([^\)]*\)[ ]*\{|\([^\)]*\)[ ]*\=\>[ ]*\{)/, '').trim());
              }
            }
            return decodeFunction as UnknownFunction;
          } else {
            return input;
          }

        } else {
          throw new Error("invaild input");
        }
      } catch (e) {
        console.log(e);
        throw e;
      }
    }
    try {
      if (typeof input === "function") {
        return hexaFunction(input) as string;
      } else if (typeof input === "object") {
        if (input === null) {
          throw new Error("invalid input");
        } else {
          const toJson = (obj: Dictionary): Dictionary => {
            try {
              for (let i in obj) {
                if (typeof obj[ i ] === "function") {
                  obj[ i ] = hexaFunction(obj[ i ]);
                } else if (typeof obj[ i ] === "object" && obj[ i ] !== null) {
                  obj[ i ] = toJson(obj[ i ]);
                }
              }
              return obj;
            } catch (e) {
              return obj;
            }
          }
          if (!middleMode) {
            return JSON.stringify(toJson(input)) as string;
          } else {
            return toJson(input);
          }
        }
      } else if (typeof input === "string") {
        if ((new RegExp('^' + tokenStart)).test(input)) {
          return hexaFunction(input) as UnknownFunction;
        } else {
          const equal = (jsonString: string | Dictionary): Dictionary => {
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
              const tempFunc = new Function("const obj = " + filtered + "; return obj;") as () => Dictionary;
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
                          item = equal(item);
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
                          json[ i ] = equal(json[ i ]);
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
          const toObj = (obj: Dictionary): Dictionary => {
            try {
              for (let i in obj) {
                if (typeof obj[ i ] === "string" && (new RegExp('^' + tokenStart)).test(obj[ i ])) {
                  obj[ i ] = hexaFunction(obj[ i ]);
                } else if (typeof obj[ i ] === "object" && obj[ i ] !== null) {
                  obj[ i ] = toObj(obj[ i ]);
                }
              }
              return obj;
            } catch (e) {
              return obj;
            }
          }
          return toObj(equal(input));
        }
      } else {
        throw new Error("invalid input");
      }
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static uniqueValue = (
    type: "number" | "string" | "date" | "hex" | "short" = "number"
  ): any => {
    if (type === "number") {
      return Unique.number();
    } else if (type === "string") {
      return Unique.string();
    } else if (type === "date") {
      return Unique.date();
    } else if (type === "hex") {
      return Unique.hex();
    } else if (type === "short") {
      return Unique.short();
    } else {
      return Unique.string();
    }
  }

  public static hangulToEnglish = (
    original: string,
    exeMode: boolean = true,
  ): string => {
    const jamoMap: { [ key: string ]: string } = {
      // 초성 (Initials: U+1100 ~ U+1112)
      "k4352": "g", "k4353": "kk", "k4354": "n", "k4355": "d", "k4356": "tt",
      "k4357": "r", "k4358": "m", "k4359": "b", "k4360": "pp", "k4361": "s",
      "k4362": "ss", "k4363": "",   // 초성 ㅇ (silent)
      "k4364": "j", "k4365": "jj", "k4366": "ch", "k4367": "k", "k4368": "t",
      "k4369": "p", "k4370": "h",
      // 중성 (Vowels: U+1161 ~ U+1175)
      "k4449": "a", "k4450": "ae", "k4451": "ya", "k4452": "yae", "k4453": "eo",
      "k4454": "e", "k4455": "yeo", "k4456": "ye", "k4457": "o", "k4458": "wa",
      "k4459": "wae", "k4460": "oe", "k4461": "yo", "k4462": "oo", "k4463": "wo",
      "k4464": "we", "k4465": "wi", "k4466": "yu", "k4467": "eu", "k4468": "ui",
      "k4469": "i",
      // 종성 (Finals: U+11A8 ~ U+11C2)
      "k4520": "k", "k4521": "kk", "k4522": "gs", "k4523": "n", "k4524": "nj",
      "k4525": "nh", "k4526": "d", "k4527": "l", "k4528": "lg", "k4529": "lm",
      "k4530": "lb", "k4531": "ls", "k4532": "lt", "k4533": "lp", "k4534": "lh",
      "k4535": "m", "k4536": "b", "k4537": "bs", "k4538": "s", "k4539": "ss",
      "k4540": "ng", // 종성 ㅇ
      "k4541": "j", "k4542": "ch", "k4543": "k", "k4544": "t", "k4545": "p",
      "k4546": "h"
    };
    let lastDotIndex: number;
    let baseName: string;
    let exe: string;
    let normalizedBase: string;
    let romanizedBase: string;
    let lastCharWasMapped: boolean;
    let thisKey: string;

    if (exeMode) {
      lastDotIndex = original.lastIndexOf('.');
      baseName = lastDotIndex === -1 ? original.replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F a-zA-Z0-9_]/gi, "") : original.substring(0, lastDotIndex).replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F a-zA-Z0-9_]/gi, "");
      exe = lastDotIndex === -1 ? '' : String(original.split(".").at(-1)).toLowerCase();
    } else {
      baseName = original.replace(/[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F a-zA-Z0-9_]/gi, "");
      exe = "";
    }

    baseName = baseName.replace(/\s/gi, "");
    normalizedBase = baseName.normalize("NFD");
    romanizedBase = "";
    lastCharWasMapped = false;

    for (const char of normalizedBase) {
      thisKey = "k" + String(char.charCodeAt(0));
      if (jamoMap[ thisKey ]) {
        romanizedBase += jamoMap[ thisKey ];
        lastCharWasMapped = true;
      } else if (char.match(/[a-zA-Z0-9]/)) {
        romanizedBase += char;
        lastCharWasMapped = false;
      } else if (char.match(/\s+/)) {
        romanizedBase += '_';
        lastCharWasMapped = false;
      } else if (char === '-' || char === '_') {
        romanizedBase += char;
        lastCharWasMapped = false;
      }
    }

    romanizedBase = romanizedBase.toLowerCase().trim(); // 모두 소문자로
    romanizedBase = romanizedBase.replace(/[^a-z0-9\._-]/g, '_'); // 혹시 남은 안전하지 않은 문자 밑줄 처리
    romanizedBase = romanizedBase.replace(/__+/g, '_'); // 중복 밑줄 하나로
    romanizedBase = romanizedBase.replace(/^_+|_+$/g, ''); // 맨 앞/뒤 밑줄 제거

    if (romanizedBase === '' && original !== exe) {
      romanizedBase = "file" + Unique.hex();
    }

    return (exeMode || exe !== "") ? romanizedBase + "." + exe.trim().replace(/^\./, "") : romanizedBase;
  }

  public static moveFileFolder = async (sourcePath: string, destinationPath: string) => {
    let finalDestinationPath: string;
    let destinationIsDir: boolean;

    finalDestinationPath = destinationPath;
    destinationIsDir = false;

    try {
      const stats = await fsPromise.stat(destinationPath);
      destinationIsDir = stats.isDirectory();
      if (destinationIsDir) {
        const sourceBaseName = path.basename(sourcePath);
        finalDestinationPath = path.join(destinationPath, sourceBaseName);
      }
    } catch (error: any) {
      destinationIsDir = false;
    }

    try {
      await fsPromise.cp(path.normalize(sourcePath), path.normalize(finalDestinationPath), { recursive: true, force: true });
      try {
        await fsPromise.rm(path.normalize(sourcePath), { recursive: true, force: true });
      } catch { }
      return finalDestinationPath;
    } catch (moveError) {
      throw moveError;
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

  public static shuffleArray = (targetArray: Array<any>): Array<any> => {
    let currentIndex: number;
    let randomIndex: number;

    currentIndex = targetArray.length;

    // While there remain elements to shuffle
    while (currentIndex !== 0) {
      // Pick a remaining element
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [ targetArray[ currentIndex ], targetArray[ randomIndex ] ] = [ targetArray[ randomIndex ], targetArray[ currentIndex ] ];
    }

    return targetArray;
  }

  public static dateToHangul = (date: Date, shortYear: boolean = false): string => {
    const emptyDateValue: number = (new Date(1900, 0, 1)).valueOf();
    const futureDateValue: number = (new Date(3000, 0, 1)).valueOf();
    if (date.valueOf() <= emptyDateValue) {
      return "해당 없음";
    } else if (date.valueOf() >= futureDateValue) {
      return "예정";
    } else {
      if (shortYear) {
        return `${ String(date.getFullYear()).slice(2) }년 ${ String(date.getMonth() + 1) }월 ${ String(date.getDate()) }일`;
      } else {
        return `${ String(date.getFullYear()) }년 ${ String(date.getMonth() + 1) }월 ${ String(date.getDate()) }일`;
      }
    }
  }

  public static setRelativeDate = (date: Date, delta: number, mode: string = "date"): Date => {
    if (!(date instanceof Date)) {
      throw new Error("invalid input 0");
    }
    if (typeof delta !== "number") {
      throw new Error("invalid input 1");
    }
    if (typeof mode !== "string") {
      mode = "date";
    }

    let copiedDate: Date;
    copiedDate = new Date(JSON.stringify(date).slice(1, -1));

    if (mode === "date") {
      copiedDate.setDate(copiedDate.getDate() + delta);
    } else if (mode === "hour") {
      copiedDate.setHours(copiedDate.getHours() + delta);
    } else if (mode === "minute") {
      copiedDate.setMinutes(copiedDate.getMinutes() + delta);
    } else if (mode === "second") {
      copiedDate.setSeconds(copiedDate.getSeconds() + delta);
    } else if (mode === "month") {
      copiedDate.setMonth(copiedDate.getMonth() + delta);
    } else if (mode === "year") {
      copiedDate.setFullYear(copiedDate.getFullYear() + delta);
    } else {
      throw new Error("invalid mode");
    }

    return copiedDate;
  }

  public static getDateDelta = (fromDate: Date, toDate: Date, mode: string = "date"): number => {
    if (!(fromDate instanceof Date)) {
      throw new Error("invalid input 0");
    }
    if (!(toDate instanceof Date)) {
      throw new Error("invalid input 0");
    }
    if (typeof mode !== "string") {
      mode = "date";
    }

    let delta: number;
    let fromValue: number, toValue: number;

    fromValue = fromDate.valueOf();
    toValue = toDate.valueOf();

    if (mode === "date") {
      delta = Math.round(((((fromValue - toValue) / 1000) / 60) / 60) / 24);
    } else if (mode === "hour") {
      delta = Math.round((((fromValue - toValue) / 1000) / 60) / 60);
    } else if (mode === "minute") {
      delta = Math.round(((fromValue - toValue) / 1000) / 60);
    } else if (mode === "second") {
      delta = Math.round((fromValue - toValue) / 1000);
    } else if (mode === "month") {
      delta = Math.round((((((fromValue - toValue) / 1000) / 60) / 60) / 24) / 30);
    } else if (mode === "year") {
      delta = Math.round((((((fromValue - toValue) / 1000) / 60) / 60) / 24) / 365);
    } else {
      throw new Error("invalid mode");
    }

    return Math.abs(delta);
  }

  public static zeroAddition = (num: number): string => {
    return ((num < 10) ? `0${ String(num) }` : String(num));
  }

  public static equalJson = (jsonString: string | List | Dictionary): Dictionary | List => {
    return Mother.equal(jsonString);
  }

  public static equalObject = (jsonObject: List | Dictionary | unknown): Dictionary | List => {
    if (typeof jsonObject === "object" && jsonObject !== null) {
      return Mother.equal(JSON.stringify(jsonObject));
    } else {
      throw new Error("invalid input");
    }
  }

  public static objectDeepCopy = (obj: Dictionary | List): Dictionary | List => {
    return Mother.equal(JSON.stringify(obj));
  }

  public static fileSystem = async (sw: FileSystemType, arr: Array<string | Buffer>): Promise<any> => {
    try {
      if (arr.length === 0) {
        throw new Error("invalid zero arguments");
      }
      if (typeof arr[0] !== "string") {
        throw new Error("invalid arguments : " + JSON.stringify(arr));
      }
      if (sw === "readString") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        return (await fsPromise.readFile(path.normalize(arr[ 0 ]), "utf8"));
      } else if (sw === "readJson") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        return Mother.equal(await fsPromise.readFile(path.normalize(arr[ 0 ]), "utf8"));
      } else if (sw === "readBuffer") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        return await fsPromise.readFile(path.normalize(arr[ 0 ]));
      } else if (sw === "readFolder") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        const fileList: string[] = (await fsPromise.readdir(path.normalize(arr[ 0 ])));
        return fileList.filter((str: string) => (str !== ".DS_Store" && str !== "._.DS_Store"));
      } else if (sw === "writeString") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        await fsPromise.writeFile(path.normalize(arr[ 0 ]), arr[ 1 ], "utf8");
        return "success";
      } else if (sw === "writeBuffer") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        await fsPromise.writeFile(path.normalize(arr[ 0 ]), arr[ 1 ]);
        return "success";
      } else if (sw === "writeBinary") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        await fsPromise.writeFile(path.normalize(arr[ 0 ]), arr[ 1 ], "binary");
        return "success";
      } else if (sw === "mkdir") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        await fsPromise.mkdir(path.normalize(arr[ 0 ]), { recursive: true });
        return "success";
      } else if (sw === "exist") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        try {
          await fsPromise.access(path.normalize(arr[ 0 ]), fsPromise.constants.F_OK);
          return true;
        } catch {
          return false;
        }
      } else if (sw === "isDir") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        const s = await fsPromise.stat(path.normalize(arr[ 0 ]));
        return s.isDirectory();
      } else if (sw === "remove") {
        if (arr.length !== 1) throw new Error("arguments error : " + sw);
        try {
          await fsPromise.rm(path.normalize(arr[ 0 ]), {
            force: true,
            recursive: true,
            maxRetries: 3
          });
        } catch {}
        return "";
      } else if (sw === "copyFile") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        if (typeof arr[ 1 ] !== "string") throw new Error("arguments error 2 : " + sw);
        const sourcePath: string = path.normalize(arr[ 0 ]);
        const destinationPath: string = path.normalize(arr[ 1 ]);
        const destDir: string = path.dirname(destinationPath);
        await fsPromise.mkdir(destDir, { recursive: true });
        await fsPromise.copyFile(sourcePath, destinationPath);
        return destinationPath;
      } else if (sw === "copyFolder") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        if (typeof arr[ 1 ] !== "string") throw new Error("arguments error 2 : " + sw);
        const sourcePath: string = path.normalize(arr[ 0 ]);
        const destinationPath: string = path.normalize(arr[ 1 ]);
        await fsPromise.cp(sourcePath, destinationPath, {
          recursive: true,
          force: true
        });
        return destinationPath;
      } else if (sw === "move") {
        if (arr.length !== 2) throw new Error("arguments error : " + sw);
        if (typeof arr[ 1 ] !== "string") throw new Error("arguments error 2 : " + sw);
        const sourcePath: string = path.normalize(arr[ 0 ]);
        const destinationPath: string = path.normalize(arr[ 1 ]);
        return await Mother.moveFileFolder(sourcePath, destinationPath);
      } else {
        throw new Error("invalid mode");
      }
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static binaryRequest = async (from: string, to: string, headers: Dictionary = {}): Promise<any> => {
    try {
      const download = (from: string, to: string, headers: Dictionary = {}) => {
        let target: string, tempArr: List;
        let targetHost: string, targetPath: string;
        let option: Dictionary;
        let client: any;
        let protocol: string;
        let req: any;

        if (/^https:\/\//.test(from)) {
          protocol = "https";
          target = from.slice(8);
        } else if (/^http:\/\//.test(from)) {
          protocol = "http";
          target = from.slice(7);
        } else {
          protocol = "https";
          target = from;
        }

        tempArr = target.split('/');
        targetHost = tempArr.shift();
        targetPath = '/' + tempArr.join('/');

        option = {
          ":path": targetPath,
          method: "GET",
          ...headers,
        };

        client = http2.connect(protocol + "://" + targetHost);

        return new Promise((resolve, reject) => {
          option[ Mother.requestSecretKey ] = Mother.requestSecretValue;
          req = client.request(option);
          req.on("end", () => {
            client.close();
            resolve({ "message": "done" })
          });
          req.pipe(fs.createWriteStream(to));
          req.end();
        });
      }
      return (await download(from, to, headers));
    } catch (e) {
      console.log(e);
    }
  }

  public static requestSystem = async (
    url: string,
    data: RequestData = {},
    config: Dictionary = {},
    http2Mode: boolean = false
  ): Promise<any> => {
    if (http2Mode) {
      try {
        const result = await Mother.http2InNode(url, data, config);
        if (result === null || result === undefined) {
          throw new Error("request fail");
        }
        return result;
      } catch {
        return (await Mother.axiosRequest(url, data, config));
      }
    } else {
      try {
        return await Mother.axiosRequest(url, data, config);
      } catch {
        const finalConfig: Dictionary = { ...config };
        const agent = new https.Agent({ family: 4 });
        finalConfig[ "httpsAgent" ] = agent;
        if (finalConfig[ "headers" ] === undefined) {
          finalConfig[ "headers" ] = {};
          finalConfig[ "headers" ][ "Content-Type" ] = "application/json";
        }
        return await Mother.axiosRequest(url, data, finalConfig);
      }
    }
  }

  public static requestForm = async (
    url: string,
    data: RequestData = {},
    config: Dictionary = {},
  ): Promise<any> => {
    const finalConfig: Dictionary = { ...config };
    finalConfig.formData = true;
    return await Mother.axiosRequest(url, data, finalConfig);
  }

  public static objectSet = (targetArray: Array<Dictionary>, sortTarget: string): Array<Dictionary> => {
    if (targetArray.some((o: Dictionary) => o[ sortTarget ] === undefined)) {
      throw new Error("invalid input");
    }
    if (!targetArray.every((o: Dictionary) => typeof o[ sortTarget ] === "string")) {
      throw new Error("invalid input 2");
    }
    let standardArray: string[];
    let resultArray: Array<Dictionary>;
    standardArray = [];
    resultArray = [];
    for (let obj of targetArray) {
      if (!standardArray.includes(obj[ sortTarget ])) {
        resultArray.push(Mother.equal(JSON.stringify(obj)));
      }
      standardArray.push(obj[ sortTarget ] as string);
    }
    return resultArray;
  }

  public static ajaxJson = async (data: RequestData = {}, url: string, config: Dictionary = {}): Promise<Dictionary | List> => {
    const finalConfig: Dictionary = { ...config };
    if (finalConfig[ "headers" ] === undefined) {
      finalConfig[ "headers" ] = {};
    }
    if (typeof finalConfig[ "headers" ][ "Content-Type" ] !== "string") {
      finalConfig[ "headers" ][ "Content-Type" ] = "application/json";
    }
    finalConfig[ "headers" ][ Mother.requestSecretKey ] = Mother.requestSecretValue;
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
        parseJson: (jsonText: string) => Mother.equal(jsonText),
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

  public static requestJson = async (url: string, data: RequestData = {}, config: Dictionary = {}): Promise<Dictionary> => {
    const finalConfig: Dictionary = { ...config };
    if (finalConfig[ "headers" ] === undefined) {
      finalConfig[ "headers" ] = {};
    }
    if (typeof finalConfig[ "headers" ][ "Content-Type" ] !== "string") {
      finalConfig[ "headers" ][ "Content-Type" ] = "application/json";
    }
    finalConfig[ "headers" ][ Mother.requestSecretKey ] = Mother.requestSecretValue;
    try {
      const res: any = await Mother.axiosRequest(url, data, finalConfig);
      if (typeof res === "string" || Array.isArray(res)) {
        const result: Dictionary = { data: res };
        return result;
      } else if (typeof res === "object" && res !== null) {
        const result: Dictionary = res as Dictionary;
        return result;
      } else {
        throw new AxiosError("invalid response");
      }
    } catch {
      const agent = new https.Agent({ family: 4 });
      finalConfig[ "httpsAgent" ] = agent;
      const res: any = await Mother.axiosRequest(url, data, finalConfig);
      if (typeof res === "string" || Array.isArray(res)) {
        const result: Dictionary = { data: res };
        return result;
      } else if (typeof res === "object" && res !== null) {
        const result: Dictionary = res as Dictionary;
        return result;
      } else {
        throw new AxiosError("invalid response");
      }
    }
  }

  public static autoComma = (str: number | string, manVersion: boolean = false): string => {
    let minus: string;
    let count: number;
    let countArr: any[];
    let execResult: RegExpExecArray | null;
    let temp: any, tempArr: Array<any>;
    if (typeof str === "number") {
      str = String(Math.floor(str));
    }
    if (/e/gi.test(str)) {
      throw new Error("is too heavy");
    }
    execResult = /\-/g.exec(str);
    if (execResult !== null) {
      minus = execResult[0];
    } else {
      minus = "";
    }
    str = str.replace(/[^0-9]/g, '');
    if (str === '') {
      throw new Error("invaild number");
    }
    if (manVersion) {
      str = String(Math.floor(Number(str) / 10000));
    }
    count = Math.ceil(str.length / 3);
    countArr = [];
    for (let i = 0; i < count; i++) {
      countArr.push([ 3 * i, 3 * (i + 1) ]);
    }
    if (countArr.length === 0) {
      throw new Error("invaild number");
    }
    tempArr = [];
    for (let arr of countArr) {
      temp = '';
      for (let i = arr[0]; i < arr[1]; i++) {
        if (str.length - 1 - i < 0) {
          temp += '';
        } else {
          temp = str[str.length - 1 - i] + temp;
        }
      }
      if (temp !== '') {
        tempArr.unshift(temp);
      }
    }
  
    if (manVersion) {
      return (minus + tempArr.join(',')) + "만";
    } else {
      return (minus + tempArr.join(','));
    }
  }

  public static generalLog = async (text: string): Promise<any> => {
    try {
      const logFile: string = path.join(Mother.logFolder, "general.log");
      await fsPromise.appendFile(logFile, text, "utf8");
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static messageLog = async (text: string): Promise<any> => {
    try {
      const logFile: string = path.join(Mother.logFolder, "message.log");
      await fsPromise.appendFile(logFile, text, "utf8");
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static alertLog = async (text: string): Promise<any> => {
    try {
      const logFile: string = path.join(Mother.logFolder, "alert.log");
      await fsPromise.appendFile(logFile, text, "utf8");
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static errorLog = async (text: string): Promise<any> => {
    try {
      const logFile: string = path.join(Mother.logFolder, "error.log");
      await fsPromise.appendFile(logFile, text, "utf8");
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static variableArray = (length: number, callback: (a?: any) => any): List => {
    if (typeof length !== "number") {
      throw new Error("invaild input")
    }
    let targetArray: List = [];
    for (let i = 0; i < length; i++) {
      if (typeof callback === "function") {
        targetArray.push(callback(i));
      } else {
        targetArray.push(i);
      }
    }
    return targetArray;
  }

  public static zipFile = async (
    targetFolder: string,
    toFile: string = "",
    epubMode: boolean = false,
    deleteTimeout: number = -1,
    deleteTarget: string = "",
  ): Promise<Buffer> => {
    try {
      if (/\.epub/gi.test(toFile)) {
        epubMode = true;
      }
      const zip = new JSZip();
      const absoluteTargetFolder: string = path.resolve(targetFolder);
      const stats = await fsPromise.stat(absoluteTargetFolder);
      if (!stats.isDirectory()) {
        throw new Error("target must be folder");
      }
      const extension: string = epubMode ? ".epub" : ".zip";
      const parentDir = path.dirname(absoluteTargetFolder);

      let absoluteTargetFile: string;
      if (toFile !== "") {
        if ((new RegExp(path.sep, "gi")).test(toFile)) {
          absoluteTargetFile = path.resolve(toFile);
        } else {
          absoluteTargetFile = path.resolve(path.join(parentDir, toFile));
        }
        if (path.extname(absoluteTargetFile).toLowerCase() !== extension) {
          absoluteTargetFile = absoluteTargetFile + extension;
        }
      } else {
        const tempName = `tempZip_${ Unique.hex() }${ extension }`;
        absoluteTargetFile = path.join(parentDir, tempName);
      }
      const outputDir: string = path.dirname(absoluteTargetFile);
      await fsPromise.mkdir(outputDir, { recursive: true });

      if (epubMode) {
        zip.file("mimetype", "application/epub+zip", {
          compression: "STORE"
        });
      }

      const queue: { abs: string; rel: string }[] = [ { abs: absoluteTargetFolder, rel: "" } ];
      while (queue.length > 0) {
        const { abs, rel } = queue.shift()!;
        const entries = await fsPromise.readdir(abs, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(abs, entry.name);
          const relPath = path.join(rel, entry.name).replace(/\\/g, '/');
          if (epubMode && relPath.toLowerCase() === "mimetype") {
            continue;
          }
          if (entry.isDirectory()) {
            queue.push({ abs: fullPath, rel: relPath });
          } else if (entry.isFile()) {
            const buffer = await fsPromise.readFile(fullPath);
            const ext = path.extname(relPath).toLowerCase();
            const isBinary = /\.(png|jpe?g|webp|avif|woff2?|ttf|otf|eot|ico|mp[34]|zip|gz)$/.test(ext);
            zip.file(relPath, buffer, {
              compression: "DEFLATE",
              compressionOptions: { level: isBinary ? 3 : 6 }
            });
          }
        }
      }

      const resultBuffer: Buffer = await zip.generateAsync({ type: "nodebuffer" });
      await fsPromise.writeFile(absoluteTargetFile, resultBuffer)

      if (typeof deleteTimeout === "number" && deleteTimeout > 1) {
        setTimeout(async () => {
          try {
            if (deleteTarget !== "") {
              await fsPromise.rm(deleteTarget, { recursive: true, force: true });
            } else {
              await fsPromise.rm(absoluteTargetFile, { recursive: true, force: true });
            }
          } catch {}
        }, deleteTimeout);
      }

      return resultBuffer;
    } catch (e) {
      console.log(e)
      throw e;
    }
  }

  public static unzipFile = async (zipFilePath: string): Promise<string> => {
    try {
      const absoluteZipPath = path.resolve(zipFilePath);
      try {
        await fsPromise.access(absoluteZipPath, fsPromise.constants.R_OK);
      } catch (e) {
        throw new Error(`Cannot access zip file: ${ absoluteZipPath }`);
      }

      const zipDir = path.dirname(absoluteZipPath);
      const zipExt = path.extname(absoluteZipPath);
      const baseName = path.basename(absoluteZipPath, zipExt);
      const outputFolderPath = path.join(zipDir, baseName);

      await fsPromise.mkdir(outputFolderPath, { recursive: true });
      const zipFileData: Buffer = await fsPromise.readFile(absoluteZipPath);

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFileData);

      for (const relativePath in loadedZip.files) {
        if (
          !/^__MACOSX/.test(relativePath) &&
          !/\/__MACOSX\//g.test(relativePath) &&
          !/\/\._/.test(relativePath) &&
          !/\.DS_Store$/.test(relativePath)
        ) {
          const zipEntry = loadedZip.files[ relativePath ];
          const fullOutputPath = path.join(outputFolderPath, relativePath);
          const normalizedOutputPath = path.normalize(fullOutputPath);
          if (zipEntry.dir) {
            await fsPromise.mkdir(normalizedOutputPath, { recursive: true });
          } else {
            const fileDir = path.dirname(normalizedOutputPath);
            await fsPromise.mkdir(fileDir, { recursive: true });
            const contentBuffer = await zipEntry.async('nodebuffer');
            await fsPromise.writeFile(normalizedOutputPath, contentBuffer);
          }
        }
      }

      return outputFolderPath;
    } catch (error) {
      console.error(`Error unzipping file ${ zipFilePath }:`, error);
      throw error;
    }
  }

  public static treeParsing = async (rootPath: string): Promise<TreeArray> => {
    if (/^\./.test(rootPath)) {
      rootPath = Mother.appPath + rootPath.slice(1);
    }
    rootPath = path.normalize(rootPath);
    try {
      await fsPromise.access(rootPath);
    } catch (e) {
      console.error(`경로를 찾을 수 없습니다: ${ rootPath }`);
      throw e;
    }
    const buildTreeRecursive = async (currentPath: string): Promise<TreeFile[]> => {
      const entries: Dirent<string>[] = await fsPromise.readdir(currentPath, { withFileTypes: true });
      const files: TreeFile[] = [];
      for (const entry of entries) {
        if (entry.name === '.DS_Store') continue;
        const fullPath = path.join(currentPath, entry.name);
        const node: TreeFile = {
          fileName: entry.name,
          absolute: fullPath,
          directory: entry.isDirectory(),
          hidden: entry.name.startsWith('.'),
          length: fullPath.split(path.sep).length,
        };
        if (node.directory) {
          node.files = await buildTreeRecursive(fullPath);
        }
        files.push(node);
      }
      return files;
    };

    const rootName = path.basename(rootPath);
    const tree = new TreeArray(rootPath);
    const rootNode: TreeFile = {
      fileName: rootName,
      absolute: rootPath,
      directory: true,
      hidden: rootName.startsWith('.'),
      length: rootPath.split(path.sep).length,
      files: await buildTreeRecursive(rootPath),
    };
    tree.push(rootNode);

    tree.flatDeath = [];
    const treeFileForEach = (k: TreeFile) => {
      if (k.files !== undefined) {
        for (let d of k.files) {
          treeFileForEach(d);
        }
      } else {
        tree.flatDeath.push(k);
      }
    }
    for (let t of tree) {
      treeFileForEach(t);
    }
    tree.flatDeath = tree.flatDeath.map((t) => {
      if (t.files !== undefined) {
        delete t.files;
      }
      return t;
    });

    return tree;
  }

  public static sha256Hmac = async (key: string, message: string, type: any = "base64") => {
    try {
      const crypto = await import("crypto");
      return crypto.createHmac("sha256", key).update(message).digest(type);
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  public static sha256Hash = async (text: string): Promise<string> => {
    try {
      const crypto = await import("crypto");
      const hash = crypto.createHash("sha256");
      hash.update(text, "utf8");
      return hash.digest("hex");
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public static specialFilter = (target: string, liteMode: boolean = false): string => {
    if (!liteMode) {
      return target.replace(/[\*\!\?\~\^\:\/\%\&\+\<\>\;\=\#\$\[\]\\\|\(\)\`\'\"\{\}]/gi, '').trim();
    } else {
      return target.replace(/[\*\^\:\&\<\>\;\=\#\$\[\]\\\|\(\)\`\'\"\{\}]/gi, '').trim();
    }
  }

  public static autoHypenPhone = (m: string): string => {
    let str: string = m.trim();
    let tmp: string;

    str = str.replace(/[^0-9]/g, '');
    tmp = '';

    if (str.length < 4) {
      return str;
    } else if (str.length < 7) {
      tmp += str.slice(0, 3);
      tmp += '-';
      tmp += str.slice(3);
      return tmp;
    } else if (str.length < 11) {
      tmp += str.slice(0, 3);
      tmp += '-';
      tmp += str.slice(3, 6);
      tmp += '-';
      tmp += str.slice(6);
      return tmp;
    } else {
      tmp += str.slice(0, 3);
      tmp += '-';
      tmp += str.slice(3, 7);
      tmp += '-';
      tmp += str.slice(7);
      return tmp;
    }
  }

  public static capitalizeString = (str: string): string => {
    if (typeof str !== "string") {
      throw new Error("invalid input");
    }
    if (str.length === 0 || str.length === 1) {
      if (str.length === 0) {
        return "";
      }
      return str.toUpperCase();
    } else {
      return str.slice(0, 1).toUpperCase() + str.slice(1);
    }
  }

  public static linkToString = (link: string): string => {
    const nameToToken = (name: string): string => { return `_____${name}_____` } 
    const tokens: Dictionary = {
      equal: nameToToken("equal"),
      amp: nameToToken("amp"),
      question: nameToToken("question"),
      hypen: nameToToken("hypen"),
      slash: nameToToken("slash"),
      colon: nameToToken("colon"),
      back: nameToToken("back"),
      sharp: nameToToken("sharp"),
      plus: nameToToken("plus"),
      percent: nameToToken("percent"),
      dot: nameToToken("dot"),
      wave: nameToToken("wave"),
      hat: nameToToken("hat"),
      angleBracketOpen: nameToToken("angleBracketOpen"),
      angleBracketClose: nameToToken("angleBracketClose"),
      questionMark: nameToToken("questionMark"),
      pipe: nameToToken("pipe"),
      doubleQuote: nameToToken("doubleQuote"),
      semicolon: nameToToken("semicolon"),
    }
    let linkArr: any[];
    let protocol: string;
    let host: string;
    let pathName: string;
    let search: string;
    let getObj: Dictionary;
    let filteredLink: string;
  
    if (!/^http/.test(link)) {
  
      pathName = link;
      pathName = pathName.split("/").map((str) => { return globalThis.encodeURIComponent(str) }).join("/");
      filteredLink = pathName;
  
    } else {
  
      linkArr = link.split("/");
      if (linkArr.length < 3) {
        throw new Error("invalid link");
      }
      protocol = linkArr[0].replace(/[\:]/gi, '');
      host = linkArr[2];
      pathName = "/" + linkArr.slice(3).join("/");
    
      if (/[\?]/gi.test(pathName)) {
        search = pathName.split("?")[1];
        pathName = pathName.split("?")[0];
      } else {
        search = "";
      }
    
      if (search !== "") {
        getObj = search.split("&").map((str) => { return { key: str.split("=")[0], value: str.split("=")[1] } });
      } else {
        getObj = [];
      }
    
      pathName = pathName.split("/").map((str) => { return globalThis.encodeURIComponent(str) }).join("/");
    
      if (getObj.map((obj: Dictionary) => { return `${obj.key}=${obj.value}` }).join("&") === '') {
        filteredLink = protocol + "://" + host + pathName;
      } else {
        filteredLink = protocol + "://" + host + pathName + "?" + getObj.map((obj: Dictionary) => { return `${obj.key}=${obj.value}` }).join("&");
      }

    }
  
    filteredLink = filteredLink.replace(/[\=]/gi, tokens.equal);
    filteredLink = filteredLink.replace(/[\&]/gi, tokens.amp);
    filteredLink = filteredLink.replace(/[\?]/gi, tokens.question);
    filteredLink = filteredLink.replace(/[\-]/gi, tokens.hypen);
    filteredLink = filteredLink.replace(/[\/]/gi, tokens.slash);
    filteredLink = filteredLink.replace(/[\:]/gi, tokens.colon);
    filteredLink = filteredLink.replace(/[\\]/gi, tokens.back);
    filteredLink = filteredLink.replace(/[\#]/gi, tokens.sharp);
    filteredLink = filteredLink.replace(/[\+]/gi, tokens.plus);
    filteredLink = filteredLink.replace(/[\%]/gi, tokens.percent);
    filteredLink = filteredLink.replace(/[\.]/gi, tokens.dot);
    filteredLink = filteredLink.replace(/[\~]/gi, tokens.wave);
    filteredLink = filteredLink.replace(/[\^]/gi, tokens.hat);
    filteredLink = filteredLink.replace(/[<]/gi, tokens.angleBracketOpen);
    filteredLink = filteredLink.replace(/[>]/gi, tokens.angleBracketClose);
    filteredLink = filteredLink.replace(/[\?]/gi, tokens.questionMark);
    filteredLink = filteredLink.replace(/[\|]/gi, tokens.pipe);
    filteredLink = filteredLink.replace(/["]/gi, tokens.doubleQuote);
    filteredLink = filteredLink.replace(/[;]/gi, tokens.semicolon);

    return filteredLink;
  }

  public static stringToLink = (string: string): string => {
    const nameToToken = (name: string): string => { return `_____${name}_____` } 
    const tokens = {
      equal: nameToToken("equal"),
      amp: nameToToken("amp"),
      question: nameToToken("question"),
      hypen: nameToToken("hypen"),
      slash: nameToToken("slash"),
      colon: nameToToken("colon"),
      back: nameToToken("back"),
      sharp: nameToToken("sharp"),
      plus: nameToToken("plus"),
      percent: nameToToken("percent"),
      dot: nameToToken("dot"),
      wave: nameToToken("wave"),
      hat: nameToToken("hat"),
      angleBracketOpen: nameToToken("angleBracketOpen"),
      angleBracketClose: nameToToken("angleBracketClose"),
      questionMark: nameToToken("questionMark"),
      pipe: nameToToken("pipe"),
      doubleQuote: nameToToken("doubleQuote"),
      semicolon: nameToToken("semicolon"),
    }
    let filteredLink: string;
  
    filteredLink = string;
  
    filteredLink = filteredLink.replace(new RegExp(tokens.equal, "gi"), "=");
    filteredLink = filteredLink.replace(new RegExp(tokens.amp, "gi"), "&");
    filteredLink = filteredLink.replace(new RegExp(tokens.question, "gi"), "?");
    filteredLink = filteredLink.replace(new RegExp(tokens.hypen, "gi"), "-");
    filteredLink = filteredLink.replace(new RegExp(tokens.slash, "gi"), "/");
    filteredLink = filteredLink.replace(new RegExp(tokens.colon, "gi"), ":");
    filteredLink = filteredLink.replace(new RegExp(tokens.back, "gi"), "\\");
    filteredLink = filteredLink.replace(new RegExp(tokens.sharp, "gi"), "#");
    filteredLink = filteredLink.replace(new RegExp(tokens.plus, "gi"), "+");
    filteredLink = filteredLink.replace(new RegExp(tokens.percent, "gi"), "%");
    filteredLink = filteredLink.replace(new RegExp(tokens.dot, "gi"), ".");
    filteredLink = filteredLink.replace(new RegExp(tokens.wave, "gi"), "~");
    filteredLink = filteredLink.replace(new RegExp(tokens.hat, "gi"), "^");
    filteredLink = filteredLink.replace(new RegExp(tokens.angleBracketOpen, "gi"), "<");
    filteredLink = filteredLink.replace(new RegExp(tokens.angleBracketClose, "gi"), ">");
    filteredLink = filteredLink.replace(new RegExp(tokens.questionMark, "gi"), "?");
    filteredLink = filteredLink.replace(new RegExp(tokens.pipe, "gi"), "|");
    filteredLink = filteredLink.replace(new RegExp(tokens.doubleQuote, "gi"), '"');
    filteredLink = filteredLink.replace(new RegExp(tokens.semicolon, "gi"), ";");
  
    return filteredLink;
  }

  public static xyConverting = (original: List): List => {
    if (!Array.isArray(original)) {
      throw new Error("input must be array");
    }
    if (original.length > 0) {
      if (!original.every((arr) => { return Array.isArray(arr); })) {
        throw new Error("input must be matrix");
      }
    }
    let converted: any[], tempArr: any[];
    converted = [];
    if (original.length > 0) {
      for (let i = 0; i < original[0].length; i++) {
        tempArr = [];
        for (let arr of original) {
          tempArr.push(arr[i]);
        }
        converted.push(tempArr);
      }
    }
    return converted;
  }

  public static promiseTogether = (promiseArr: Array<any>): Promise<any> => {
    if (!promiseArr.every((obj) => { return obj instanceof Promise })) {
      throw new Error("invaild input");
    }
    return new Promise((resolve, reject) => {
      const workLength: number = promiseArr.length;
      let promiseTong: any[], interval: any, timeout: any;
  
      promiseTong = [];
  
      for (let i = 0; i < workLength; i++) {
        promiseArr[i].then(() => {
          promiseTong.push(true);
        }).catch((err) => {
          reject(err);
        })
      }
  
      interval = setInterval(() => {
        if (promiseTong.length >= workLength) {
          timeout = setTimeout(() => {
            resolve(true);
            clearTimeout(timeout);
          }, 0);
          clearInterval(interval);
        }
      }, 100);
    });
  }

  public static fileToMimetype = (fileName: string): string => {
    const extensionMimeTypeMap: { [ key: string ]: string } = {
      aac: "audio/aac",
      abw: "application/x-abiword",
      arc: "application/octet-stream",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      flac: "audio/flac",
      azw: "application/vnd.amazon.ebook",
      bin: "application/octet-stream",
      bz: "application/x-bzip",
      bz2: "application/x-bzip2",
      csh: "application/x-csh",
      css: "text/css",
      csv: "text/csv",
      doc: "application/msword",
      epub: "application/epub+zip",
      gif: "image/gif",
      html: "text/html",
      htm: "text/html",
      ts: "text/typescript",
      ico: "image/x-icon",
      ics: "text/calendar",
      jar: "application/java-archive",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      mjs: "application/js", js: "application/js", json: "application/json", mid: "audio/midi", midi: "audio/midi",
      mpeg: "video/mpeg", mpkg: "application/vnd.apple.installer+xml", odp: "application/vnd.oasis.opendocument.presentation",
      ods: "application/vnd.oasis.opendocument.spreadsheet", odt: "application/vnd.oasis.opendocument.text", oga: "audio/ogg",
      ogv: "video/ogg", ogx: "application/ogg", pdf: "application/pdf", ppt: "application/vnd.ms-powerpoint",
      rar: "application/x-rar-compressed", rtf: "application/rtf", sh: "application/x-sh", svg: "image/svg+xml",
      swf: "application/x-shockwave-flash", tar: "application/x-tar", tif: "image/tiff", tiff: "image/tiff",
      ttf: "application/x-font-ttf", vsd: "application/vnd.visio", wav: "audio/x-wav", weba: "audio/webm",
      webm: "video/webm", webp: "image/webp", woff: "application/x-font-woff",
      xhtml: "application/xhtml+xml",
      xls: "application/vnd.ms-excel",
      xml: "application/xml",
      xul: "application/vnd.mozilla.xul+xml",
      zip: "application/zip",
      "3gp": "video/3gpp",
      "3g2": "video/3gpp2",
      "7z": "application/x-7z-compressed",
      "opf": "application/oebps-package+xml",
      "txt": "text/plain",
      "png": "image/png",
      "apng": "image/apng",
      "jfif": "image/jpeg",
      "pjpeg": "image/jpeg",
      "psd": "image/vnd.adobe.photoshop",
      "pjp": "image/jpeg",
      "cur": "image/x-icon",
      "bmp": "image/bmp",
      "avif": "image/avif",
      "woff2": "font/woff2",
      "otf": "font/otf",
      "eot": "application/vnd.ms-fontobject",
      "gz": "application/gzip",
      "mp3": "audio/mpeg",
      "ogg": "audio/ogg",
      "mp4": "video/mp4",
      "md": "text/markdown",
      "heic": "image/heic",
      "heif": "image/heif",
      "opus": "audio/opus",
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "hwp": "application/haansofthwp",
      "hwpx": "application/vnd.hancom.hwpx",
      "indd": "application/x-indesign",
      "ncx": "application/x-dtbncx+xml",
    };

    if (!fileName || typeof fileName !== 'string') {
      return '';
    }
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
      return '';
    }
    const extension: string = fileName.substring(lastDotIndex + 1).toLowerCase();
    return extensionMimeTypeMap[extension] || 'application/octet-stream';
  }

  public static colorParsing = (str: string | [ number, number, number ]): string | [ number, number, number ] => {
    if (typeof str === "string") {
      str = str.trim().toLowerCase().replace(/^\#/g, "").trim();
      if (/^\#/.test(str) && str.length === 7) {
        str = str.slice(1);
      }
      if (str.length !== 6 && str.replace(/[^0-9a-f]/gi, '') === '') {
        throw new Error("invaild input");
      }
      let colorArr: [ number, number, number ];
      colorArr = [ str.slice(0, 2), str.slice(2, 4), str.slice(4) ].map((s: string): number => {
        let num: number;
        num = 0;
        if (/[a-z]/gi.test(s[1])) {
          num += s[1].charCodeAt(0) - 97 + 10;
        } else {
          num += Number(s[1]);
        }
        if (/[a-z]/gi.test(s[0])) {
          num += (s[0].charCodeAt(0) - 97 + 10) * 16;
        } else {
          num += (Number(s[0])) * 16;
        }
        return Number(num);
      }) as [ number, number, number ];
      return colorArr;
    } else if (Array.isArray(str)) {
      if (str.length !== 3) {
        throw new Error("invaild input");
      }
      if (typeof str[0] !== "number" || typeof str[1] !== "number" || typeof str[2] !== "number") {
        throw new Error("invaild input");
      }
      if (Number.isNaN(str[0]) || Number.isNaN(str[1]) || Number.isNaN(str[2])) {
        throw new Error("invaild input");
      }
      const convertNum = (num: number) => {
        const convertStr = (n: number) => {
          if (n < 10) {
            return String(n);
          } else {
            return String.fromCharCode(n + 87);
          }
        }
        let first: number, second: number;
        second = num % 16;
        first = (num - second) / 16;
        return convertStr(first) + convertStr(second);
      }
      return '#' + str.map(convertNum).join('');
    } else {
      throw new Error("invaild input");
    }
  }

  public static returnRandoms = async (num: any = 10, length: any = false) => {
    try {
      const crypto = await import("crypto");
      const random = (num: any, length: any) => {
        const password = "eorgghseGehfwi3r2";
        if (typeof num === "boolean") {
          length = num;
          num = 10;
        }
        if (typeof num !== "number") {
          num = 10;
        }
        if (typeof length !== "boolean") {
          length = false;
        }
        if (num === 0) {
          num = 10;
        }
        return new Promise((resolve, reject) => {
          crypto.scrypt(password, "salt", 24, (err, key) => {
            if (err) throw err;
            crypto.randomFill(new Uint32Array(num), (err, iv) => {
              if (err) {
                reject(err);
              } else {
                if (!length) {
                  resolve(iv);
                } else {
                  let resultArr: List, minLength: number;
                  resultArr = Array.from(iv).map((n) => { return String(n); });
                  resultArr.sort((a, b) => { return a.length - b.length; });
                  minLength = resultArr[0].length;
                  resultArr = resultArr.map((n) => { return Number(n.slice(0, minLength).replace(/^0/, '1')); });
                  resolve(resultArr);
                }
              }
            });
          });
        });
      }
      return (await random(num, length));
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  public static objectToMatrix = (obj: Dictionary): Matrix => {
    let tong: Matrix;
    let tempArr: List;
    tong = [];
    for (let key in obj) {
      tempArr = new Array(2);
      tempArr[0] = key;
      tempArr[1] = obj[key];
      tong.push(tempArr);
    }
    return tong;
  }

  public static cryptoString = async (password: string, string: string): Promise<string> => {
    try {
      const crypto = await import("crypto");
      const func_cryptoString = function (password: string, string: string): Promise<string> {
        const iv = Buffer.alloc(16, 0);
        return new Promise((resolve, reject) => {
          crypto.pbkdf2(password, "salt", 100000, 32, "sha256", (err, key) => {
            if (err) { reject(err); }
            const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
            let encrypted: string = cipher.update(string, "utf8", "hex");
            encrypted += cipher.final("hex");
            resolve(encrypted);
          });
        });
      }
      return (await func_cryptoString(password, string));
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public static decryptoHash = async (password: string, hash: string): Promise<string> => {
    try {
      const crypto = await import("crypto");
      const func_decryptoHash = function (password: string, hash: string): Promise<string> {
        const iv = Buffer.alloc(16, 0);
        return new Promise((resolve, reject) => {
          crypto.pbkdf2(password, "salt", 100000, 32, "sha256", (err, key) => {
            if (err) { reject(err); }
            const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            let decrypted = decipher.update(hash, "hex", "utf8");
            decrypted += decipher.final("utf8");
            resolve(decrypted);
          });
        });
      }
      return (await func_decryptoHash(password, hash));
    } catch (e) {
      console.log(e);
      throw new Error((e as Error).message);
    }
  }

  public static ordinalNumber = (
    ordinalStringOrNumber: string | number,
    mode: "english" | "korean" = "english",
  ): number | string => {
    const unitCardinals: { [key: string]: number } = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
    const tensCardinals: { [key: string]: number } = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
    const ordinalsMap: { [key: string]: number } = {
      first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9,
      tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19,
      twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90,
      hundredth: 100,
      thousandth: 1000
    };
    const unitOrdinalKeys = new Set<string>([ "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth" ]);
    const unitCardinalPattern = Object.keys(unitCardinals).join('|');
    const tensCardinalPattern = Object.keys(tensCardinals).join('|');
    const unitOrdinalKeysPattern = Object.keys(ordinalsMap).filter(k => unitOrdinalKeys.has(k)).join('|');
    const combinableOrdinalKeys = Object.keys(ordinalsMap).filter(k => k !== "hundredth" && k !== "thousandth");

    if (typeof ordinalStringOrNumber === "string") {
      const cleanedInput: string = ordinalStringOrNumber.toLowerCase().trim().replace(/_/g, ' ').replace(/\-/g, ' ').replace(/\s+and\s+/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanedInput === "") {
        return -1;
      }
      if (/[a-z]/gi.test(cleanedInput)) {
        mode = "english";
      } else {
        mode = "korean";
      }
      if (mode === "english") {
        if (cleanedInput === "thousandth") {
          return 1000;
        }
        const hundredthPattern = new RegExp(`^(?:(${unitCardinalPattern})\\s+)?hundredth$`);
        const hundredthMatch = cleanedInput.match(hundredthPattern);
        if (hundredthMatch) {
          if (hundredthMatch[1]) {
            return unitCardinals[hundredthMatch[1]] * 100;
          } else {
            return 100;
          }
        }
        const mainPattern = new RegExp(
          `^` +
          `(?:(?<h_val>${unitCardinalPattern})\\s+hundred\\s*)?` +
          `(?:` +
            `(?:(?<t_val>${tensCardinalPattern})\\s*(?<o_val_unit>${unitOrdinalKeysPattern}))` +
            `|` +
            `(?<o_val_other>${combinableOrdinalKeys.join('|')})` +
          `)` +
          `$`
        );
  
        const match = cleanedInput.match(mainPattern);
        if (!match || !match.groups) {
          return -1;
        }
  
        const groups = match.groups;
        let total = 0;
        let finalOrdinalValue = 0;
        let finalOrdinalKey: string | undefined = undefined;
  
        finalOrdinalKey = groups.o_val_unit || groups.o_val_other;
        if (!finalOrdinalKey || !(finalOrdinalKey in ordinalsMap)) {
          return -1;
        }
        finalOrdinalValue = ordinalsMap[finalOrdinalKey];
  
        if (groups.t_val && !groups.o_val_unit) {
          return -1;
        }
  
        if (groups.h_val) {
          if (!(groups.h_val in unitCardinals)) {
            return -1;
          }
          total += unitCardinals[groups.h_val] * 100;
        }
        if (groups.t_val) {
          if (!(groups.t_val in tensCardinals)) {
            return -1;
          }
          total += tensCardinals[groups.t_val];
        }
        total += finalOrdinalValue;
  
        if (total < 1) {
          return -1;
        }
        if (total > 1000) {
          return -1;
        }
  
        if (groups.h_val && total < 100) {
          return -1;
        }
        if (groups.t_val && total < 20) {
          return -1;
        }
        if (!groups.h_val && !groups.t_val && total >= 100) {
          if (finalOrdinalKey !== "hundredth" && finalOrdinalKey !== "thousandth") {
            return -1;
          }
        }
        return total;  
      } else {
        const koreanToNumber = (ordinalStr: string): number => {
          const sinoPlaces: { [key: string]: number } = { '천': 1000, '백': 100 };
          const sinoDigits: { [key: string]: number } = { '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9 };
          const nativeTens: { [key: string]: number } = { '열': 10, '스물': 20, '서른': 30, '마흔': 40, '쉰': 50, '예순': 60, '일흔': 70, '여든': 80, '아흔': 90 };
          const nativeUnits: { [key: string]: number } = { '하나': 1, '둘': 2, '셋': 3, '넷': 4, '다섯': 5, '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9 };
          const modifierValues: { [key: string]: number } = { '첫': 1, '한': 1, '두': 2, '세': 3, '네': 4, '스무': 20 };
          const unitLookup: { [key: string]: number } = { ...nativeUnits, ...modifierValues };
          const tensLookup: { [key: string]: number } = { ...nativeTens, ...modifierValues };

          const cleanedInput = ordinalStr.trim().replace(/번째/gi, "").trim();
          const base = cleanedInput.trim().replace(/\s+/g, ' ');
          if (!base) {
            return -1;
          }

          const parseNative = (nativeStr: string): number => {
            if (!nativeStr) return 0;
            if (tensLookup[nativeStr]) return tensLookup[nativeStr];
            if (unitLookup[nativeStr]) return unitLookup[nativeStr];
            let total = 0;
            let remainingStr = nativeStr;
            let foundTens = false;
        
            for (const tenKey in nativeTens) {
              if (remainingStr.startsWith(tenKey)) {
                total += nativeTens[tenKey];
                remainingStr = remainingStr.substring(tenKey.length).trim();
                foundTens = true;
                break;
              }
            }
        
            if (remainingStr) {
              if (unitLookup[remainingStr]) {
                const unitValue = unitLookup[remainingStr];
                if (foundTens && (nativeTens[Object.keys(nativeTens).find(tk => nativeStr.startsWith(tk))!] + unitValue) >= 100) {
                     return -1;
                }
                total += unitValue;
              } else {
                return -1;
              }
            }
            return (total > 0 && total < 100) ? total : -1;
          };
        
          if (base === '천') {
            return 1000;
          }
        
          let total = 0;
          let currentBase = base;
        
          const baekIndex = currentBase.indexOf('백');
          if (baekIndex !== -1) {
            const beforeBaek = currentBase.substring(0, baekIndex).trim();
            const afterBaek = currentBase.substring(baekIndex + 1).trim();
            let hundredsMultiplier = 1;
            if (beforeBaek) {
              if (sinoDigits[beforeBaek]) {
                hundredsMultiplier = sinoDigits[beforeBaek];
              } else {
                return -1;
              }
            }
            total += hundredsMultiplier * 100;
            if (afterBaek) {
              const remainderValue = parseNative(afterBaek);
              if (remainderValue === -1 || remainderValue === 0) {
                return -1;
              }
              total += remainderValue;
            }
          } else {
            const nativeValue = parseNative(currentBase);
            if (nativeValue === -1) {
              return -1;
            }
            total = nativeValue;
          }
          if (total < 1 || total > 1000) {
            return -1;
          }
          return total;
        }
        return koreanToNumber(cleanedInput);
      }
    } else {
      if (ordinalStringOrNumber < 1 || ordinalStringOrNumber > 1000 || !Number.isInteger(ordinalStringOrNumber)) {
        console.log("limit error");
        return "";
      }
      if (mode === "english") {
        const num = ordinalStringOrNumber as number;
        const numToUnitCardinal: { [key: number]: string } = {};
        const numToOrdinal: { [key: number]: string } = {};
        const numToTensCardinal: { [key: number]: string } = {};
  
        for (const key in unitCardinals) {
          numToUnitCardinal[unitCardinals[key]] = key; 
        }
        for (const key in ordinalsMap) {
          numToOrdinal[ordinalsMap[key]] = key; 
        }
        for (const key in tensCardinals) {
          numToTensCardinal[tensCardinals[key]] = key; 
        }
  
        const convertLessThan100ToOrdinal = (n: number): string => {
          if (n <= 0 || n >= 100) return "";
          if (numToOrdinal[n]) {
            return numToOrdinal[n];
          } else {
            const tensDigitValue = Math.floor(n / 10) * 10;
            const unitDigitValue = n % 10;
            if (numToTensCardinal[tensDigitValue] && numToOrdinal[unitDigitValue]) {
              return `${numToTensCardinal[tensDigitValue]}-${numToOrdinal[unitDigitValue]}`;
            } else {
              return "";
            }
          }
        };
  
        if (num === 1000) {
          return numToOrdinal[1000];
        }
  
        const hundredsDigit = Math.floor(num / 100);
        const remainder = num % 100;
  
        if (remainder === 0 && hundredsDigit > 0) {
          if (numToUnitCardinal[hundredsDigit]) {
            return numToUnitCardinal[hundredsDigit] + "_hundredth";
          } else {
            return "";
          }
        }
  
        if (hundredsDigit === 0) {
          return convertLessThan100ToOrdinal(remainder);
        }
  
        if (hundredsDigit > 0 && remainder > 0) {
          if (numToUnitCardinal[hundredsDigit]) {
            const hundredsPart = numToUnitCardinal[hundredsDigit] + "_hundred";
            const remainderPart = convertLessThan100ToOrdinal(remainder);
            if (remainderPart) {
              return `${hundredsPart}_and_${remainderPart}`;
            } else {
              return "";
            }
          } else {
            return "";
          }
        }
        return "";
      } else {
        const numberToKorean = (n: number): string => {
          const nativeUnits: { [key: number]: string } = { 1: '하나', 2: '둘', 3: '셋', 4: '넷', 5: '다섯', 6: '여섯', 7: '일곱', 8: '여덟', 9: '아홉' };
          const nativeUnitsMod: { [key: number]: string } = { 1: '한', 2: '두', 3: '세', 4: '네' };
          const nativeTens: { [key: number]: string } = { 10: '열', 20: '스물', 30: '서른', 40: '마흔', 50: '쉰', 60: '예순', 70: '일흔', 80: '여든', 90: '아흔' };
          const nativeTensMod: { [key: number]: string } = { 20: '스무' }; // '스무 번째'
          const sinoDigits: { [key: number]: string } = { 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구' };
          const sinoPlaces: { [key: number]: string } = { 100: '백', 1000: '천' };
          if (n === 1) return '첫';
          if (n === 2) return '두';
          if (n === 3) return '세';
          if (n === 4) return '네';
          if (n === 20) return '스무';
          if (n === 1000) return sinoPlaces[1000]; 
          const parts: string[] = [];
          const h = Math.floor(n / 100); 
          const remainder = n % 100; 
          if (h > 0) {
            parts.push((h > 1 ? sinoDigits[h] : '') + sinoPlaces[100]);
          }
          if (remainder > 0) {
            if (h > 0) parts.push(" ");
            const rt = Math.floor(remainder / 10);
            const ru = remainder % 10;
            const remainderParts: string[] = [];
            if (rt > 0) {
              const tenVal = rt * 10;
              remainderParts.push(nativeTens[tenVal]);
            }
            if (ru > 0) {
              remainderParts.push(nativeUnitsMod[ru] || nativeUnits[ru]);
            }
            parts.push(remainderParts.join(""));
          }
          return parts.join("");
        }
        return numberToKorean(ordinalStringOrNumber) + " 번째";
      }
    }
  }

  public static prototypeMethod = (targetObject: Dictionary): Dictionary => {
    if (targetObject === null || typeof targetObject !== "object") {
      throw new Error("invalid input");
    }
    let keyListRaw: List;
    let keyList: List;
    let valueList: List;
    let methodList: List;

    type StringKeysOnly<T> = Extract<keyof T, string>;
    type TargetObjectStringKeys = StringKeysOnly<typeof targetObject>;

    keyListRaw = Object.getOwnPropertyNames(targetObject);

    keyList = [];
    methodList = [];
    valueList = [];

    for (let key of keyListRaw) {
      if (typeof key === "string" && typeof key !== "symbol") {
        keyList.push(key);
        valueList.push(targetObject[ key as TargetObjectStringKeys ]);
        if (typeof targetObject[ key as TargetObjectStringKeys ] === "function") {
          methodList.push(targetObject[ key as TargetObjectStringKeys ]);
        }
      }
    }

    return { key: keyList, value: valueList, method: methodList };
  }

  public static camelToSnake = (camelString: string): string => {
    const chars: string[] = camelString.split("");
    const length: number = chars.length;
    let snakeString: string;

    snakeString = "";
    for (let i = 0; i < length; i++) {
      const c = chars[ i ];
      if (/[A-Z]/g.test(c)) {
        snakeString += "-" + c.toLowerCase();
      } else {
        snakeString += c;
      }
    }

    return snakeString;
  }

}

export { Unique, Mother };
