export interface Dictionary {
  [ key: string ]: any;
}

export interface MessageDictionary {
  message: string;
}

export interface IdDictionary {
  id: string;
}

export interface StringDictionary {
  [ key: string ]: string;
}

export type List = Array<any>;

export type RequestData = Dictionary | List | string;

export type CryptoOption = {
  algorithm: string;
  makeKey: boolean;
  iv: string | Buffer | null;
  digest: string;
}

export type FileSizeStatus = {
  path: string;
  size: number;
}

export interface StartEndDictionary {
  start: Date;
  end: Date;
  duration: number;
}

export type Matrix = Array<any[]>;

export type FolderMap = { name: string; path: string; contents: string; };

export const AsyncFunction: FunctionConstructor = Object.getPrototypeOf(async function () {}).constructor;

export class Unique {

  public static hex = (): string => {
    const x: number = 16;
    const length: number = 11;
    const uniqueNumber: number = (new Date()).valueOf();
    const hexChars: List = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' ];
    const randomKeyWords: List = [ 'A', 'B', 'C', 'D', 'E', 'F' ];
    let uniqueNumber_copied: number;
    let maxExponent: number;
    let cArr: any[];
    let temp: number;
    let hexString: string;
    uniqueNumber_copied = uniqueNumber;
    maxExponent = 0;
    while (Math.pow(x, maxExponent) <= uniqueNumber) {
      maxExponent++;
    }
    cArr = [];
    for (let i = 0; i < maxExponent; i++) {
      temp = ((uniqueNumber_copied / Math.pow(x, i)) % x);
      cArr.push(temp);
      uniqueNumber_copied = uniqueNumber_copied - (temp * Math.pow(x, i));
    }
    hexString = cArr.map((index) => { return hexChars[index] }).join('');
    for (let i = 0; i < length; i++) {
      hexString += hexChars[Math.floor(hexChars.length * Math.random())];
    }
    return randomKeyWords[Math.floor(randomKeyWords.length * Math.random())] + randomKeyWords[Math.floor(randomKeyWords.length * Math.random())] + hexChars[Math.floor(hexChars.length * Math.random())] + randomKeyWords[Math.floor(randomKeyWords.length * Math.random())] + String(uniqueNumber) + 'A' + hexString;
  }

  public static date = (): string => {
    const zeroAddition = (num: number): string => { return (num < 10) ? `0${String(num)}` : String(num); }
    const date: Date = new Date();
    return `${String(date.getFullYear())}${zeroAddition(date.getMonth() + 1)}${zeroAddition(date.getDate())}${zeroAddition(date.getHours())}${zeroAddition(date.getMinutes())}${zeroAddition(date.getSeconds())}`;
  }

  public static string = (): string => {
    return String((new Date()).valueOf()) + String(Math.round(Math.random() * 10000));
  }

  public static number = (): number => {
    return Number(String((new Date()).valueOf()) + String(Math.round(Math.random() * 10000)));
  }

  public static short = (): string => {
    const lengthDelta: number = 8;
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const alphabetLength = alphabet.length;
    const buffer = new Uint8Array(lengthDelta);
    globalThis.crypto.getRandomValues(buffer);
    let id: string = '';
    for (let i = 0; i < lengthDelta; i++) {
      const randomIndex = buffer[i] % alphabetLength; 
      id += alphabet[randomIndex]; 
    }
    return id;
  }

}

export type FileSystemType = "read" | "readBuffer" | "readString" | "readFirstString" | "readFirstBuffer" | "readBinary" | "readJson" | "readDir" | "readFolder" | "readFolderContents" | "readFolderByCondition" | "readHead" | "readStream" | "write" | "writeString" | "writeBinary" | "writeJson" | "writeModule" | "size" | "mkdir" | "exist" | "isDir" | "remove" | "open" | "copyFile" | "copyFolder" | "copyDir" | "move";
