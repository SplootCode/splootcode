import { HTML_DOCUMENT } from '../language/types/html_document';
import { JAVASCRIPT_FILE } from '../language/types/javascript_file';
import { SerializedProject, Project, FileLoader } from '../language/projects/project';
import { SplootNode } from '../language/node';
import { parseHtml } from './import_html';
import { parseJs } from './import_js';
import { generateScope } from '../language/scope/scope';
import { SerializedSplootPackage, SplootPackage } from '../language/projects/package';
import { propagateChangeConfirmed } from 'mobx/lib/internal';
import { FileSystemFileLoader } from './filesystem_file_loader';

let projects : {[key:string]: SerializedProject} = {}
let ballExample : SerializedProject = {
  name: 'bouncyexample',
  title: "Bouncy ball canvas example",
  splootversion: '0.0.1',
  packages: [
    {
      name: 'main',
      buildType: 'STATIC'
    }
  ],
};
projects['bouncyexample'] = ballExample;
let packages : {[key:string]: SerializedSplootPackage} = {
  'main': {
    name: 'main',
    files: [
      {name: 'index.html', type: HTML_DOCUMENT},
      {name: 'app.js', type: JAVASCRIPT_FILE}
    ],
    entryPoints: ['index.html'],
    buildType: 'STATIC'
  }
}

// This is an API that we will later replace with either server calls or
// filesystem access.
export async function listProjects() {
  return await fetch(new Request('http://localhost:3002/projects', {

  })).then(response => {
    return response.json();
  });
}

export async function savePackage(directoryHandle: FileSystemDirectoryHandle, project: Project, pack: SplootPackage) {
  let packDir = await directoryHandle.getDirectoryHandle(pack.name, {create: true});
  const packFile = await packDir.getFileHandle('package.spl', { create: true });
  const writable = await packFile.createWritable();
  await writable.write(pack.serialize());
  await writable.close();
  // Save each file
  let promises = pack.fileOrder.map(async filename => {
    const fileHandle = await packDir.getFileHandle(filename + '.spl', { create: true });
    console.log(fileHandle);
    const writable = await fileHandle.createWritable();
    await writable.write(pack.files[filename].serialize());
    await writable.close();
  });
  await Promise.all(promises);
}

export async function saveProject(directoryHandle: FileSystemDirectoryHandle, project: Project) {
  // Write project file
  const fileHandle = await directoryHandle.getFileHandle('project.spl', { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(project.serialize());
  await writable.close();
  // Save each package
  project.packages.forEach(pack => {
    savePackage(directoryHandle, project, pack);
  })
}

export async function loadProject(directoryHandle: FileSystemDirectoryHandle) : Promise<Project> {
  let fileLoader = new FileSystemFileLoader(directoryHandle);
  let projStr = await (await (await directoryHandle.getFileHandle('project.spl')).getFile()).text();
  let proj = JSON.parse(projStr) as SerializedProject;
  let packages = proj.packages.map(async packRef => {
    return fileLoader.loadPackage(proj.name, packRef.name);
  })
  return new Project(proj, await Promise.all(packages), fileLoader);
}

// This is an API that we will later replace with either server calls or
// filesystem access.
export async function loadExampleProject(projectId: string) : Promise<Project> {
  if (projectId in projects) {
    let proj = projects[projectId];
    let fileLoader = new MockFileLoader();
    let packagePromises = proj.packages.map(packRef => {
      return fileLoader.loadPackage(projectId, packRef.name);
    })
    let packages = await Promise.all(packagePromises);
    return new Project(proj, packages, fileLoader);
  }
}

const BOUNCY_INDEX_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Bouncy ball</title>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script src="/app.js"></script>
</body>
</html>
   `;

const BOUNCY_APP_JS = `
let context = null;
let ballX = 50;
let ballY = 70;
let ballVelocityX = -5;
let ballVelocityY = 0;

function updatePosition() {
  ballY = ballY + ballVelocityY;
  ballX = ballX + ballVelocityX;
  if (ballY + 10 >= window.innerHeight) {
    ballVelocityY = -1 * ballVelocityY;
  }
  if (ballY + 20 < window.innerHeight) {
    ballVelocityY = ballVelocityY + 1;
  }
  if(ballX + 20 > window.innerWidth || ballX - 20 < 0){
    ballVelocityX = -1 * ballVelocityX;
  }
}

function draw(timestamp) {
  updatePosition();
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  window.requestAnimationFrame(draw);
  context.beginPath();
  context.arc(ballX, ballY, 20, 0, 2 * Math.PI);
  context.fillStyle = 'rgb(0, 0, 200)';
  context.fill();
}

function load() {
  let canvas = document.getElementById('canvas');
  context = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.requestAnimationFrame(draw);
}
window.onload = load;
`;

class MockFileLoader implements FileLoader {

  async loadPackage(projectId: string, packageId: string) : Promise<SplootPackage> {
    let promise : Promise<SplootPackage> = new Promise((resolve, reject) => {
      let pack = new SplootPackage(projectId, packages[packageId], this);
      resolve(pack);
      return;
    });
    return promise;
  }

  async loadFile(projectId: string, packageId: string, filename: string) : Promise<SplootNode> {
    let promise : Promise<SplootNode> = new Promise((resolve, reject) => {
      if (projectId === 'bouncyexample') {
        if (packageId === 'main') {
          let rootNode = null;
          switch(filename) {
            case 'index.html':
              rootNode = parseHtml(BOUNCY_INDEX_HTML);
              break;
            case 'app.js':
              rootNode = parseJs(BOUNCY_APP_JS);
              break;
            default:
              reject('Unknown filename');
          }
          generateScope(rootNode).then(() => {resolve(rootNode)});
          return;
        }
      }
      reject('Unknown project ID or package ID');
    });
    return await promise;
  }
}