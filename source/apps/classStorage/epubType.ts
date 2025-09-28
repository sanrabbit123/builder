import { List, Dictionary } from "../classStorage/dictionary.js";

interface EpubMediaTypeInfo {
  mediaTypeName: string;
  fileExe: string[];
};

interface ManifestTarget {
  id: string;
  href: string;
  mediaType: string;
}

interface BookSourceInput {
  title: string;
  author: string;
  publisher: string;
  publishDate: Date;
  subject: string[];
  description: string;
  chapterNumber: number;
  isbn?: string;
}

interface EpubInspectError {
  fileName: string;
  line: string;
  error: string;
}

interface EpubInspectResult {
  status: "success" | "error",
  errors: EpubInspectError[]
}

enum EpubWorkStatus {
  Waiting,
  Doing,
  Complete,
  Drop,
}

interface EpubWorkTimelineUnit {
  title: string;
  start: Date;
  end: Date;
}

interface EpubWork {
  date: Date;
  key: string;
  information: {
    title: string;
    page: number;
    who: string;
  };
  progress: {
    status: EpubWorkStatus;
    complete: Date;
  };
  price: {
    consumer: number;
    supply: number;
  };
  timeline: EpubWorkTimelineUnit[];
}

interface CloudEpub {
  date: Date;
  key: string;
  path: string;
  owner: {
    email: string;
    phone: string;
    name: string;
  };
  device: {
    ip: string;
    session: string;
  };
  history: Array<{ date: Date; path: string; ip: string; session: string; }>;
}

export {
  EpubMediaTypeInfo,
  ManifestTarget,
  BookSourceInput,
  EpubInspectError,
  EpubInspectResult,
  EpubWorkStatus,
  EpubWorkTimelineUnit,
  EpubWork,
  CloudEpub,
};