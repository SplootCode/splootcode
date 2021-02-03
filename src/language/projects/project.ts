import { SplootNode } from "../node";
import { SerializedSplootPackage, SplootPackage } from "./package";

export interface SerializedProject {
  name: string;
  title: string;
  path: string;
  packages: SerializedSplootPackage[];
}

export interface FileLoader {
  loadFile: (projectId: string, packageId: string, filename: string) => Promise<SplootNode>;
}

export class Project {
  name: string;
  title: string;
  path: string;
  packages: SplootPackage[];
  fileLoader: FileLoader;

  constructor(proj: SerializedProject, fileLoader: FileLoader) {
    this.name = proj.name;
    this.title = proj.title;
    this.path = proj.path;
    this.fileLoader = fileLoader;
    this.packages = proj.packages.map(pack => new SplootPackage(this.name, pack, fileLoader))
  }
}