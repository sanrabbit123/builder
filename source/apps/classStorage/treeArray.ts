interface TreeFile {
  directory: boolean;
  fileName: string;
  absolute: string;
  length: number;
  hidden: boolean;
  files?: TreeFile[];
}

class TreeArray extends Array {

  public flatDeath: TreeFile[];
  public minLength: number;
  public maxLength: number;
  public totalLength: number;
  public fromDir: string;
  public toDir: string;
  public target: string;

  constructor (target: string) {
    super();
    this.flatDeath = [];
    this.minLength = 0;
    this.maxLength = 0;
    this.totalLength = 0;
    this.fromDir = "";
    this.toDir = "";
    this.target = target;
  }

  get data() {
    return this[0];
  }

  get tree() {
    return this[0];
  }

  get value() {
    return this[0];
  }

  public returnFlat = async (): Promise<TreeFile[]> => {
    try {
      return this.flatDeath;
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public setLength = async (): Promise<boolean> => {
    try {
      let allFlats: TreeFile[];
      allFlats = this.flatDeath;
      allFlats.sort((a, b) => {
        return a.length - b.length;
      });
      this.minLength = allFlats[0].length;
      this.maxLength = allFlats[allFlats.length - 1].length;
      this.totalLength = this.maxLength - this.minLength + 1;
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  public returnIndexFlat = async (index: string | number): Promise<TreeFile[]> => {
    try {
      if (this.minLength === undefined) {
        await this.setLength();
      }
      if (index !== "min" && index !== "max") {
        if (typeof index !== "number") {
          throw new Error("input must be number");
        }
      } else {
        index = (index === "min") ? this.minLength : this.maxLength;
      }
      let arr: TreeFile[] = [];
      for (let i of this.flatDeath) {
        if (i.length === index) {
          arr.push(i);
        }
      }
      return arr;
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  public setFromDir = (dir: string) => {
    this.fromDir = dir;
  }

  public setToDir = (dir: string) => {
    this.toDir = dir;
  }

}

export { TreeArray, TreeFile };