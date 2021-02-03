import { HTML_DOCUMENT } from '../language/types/html_document';
import { JAVASCRIPT_FILE } from '../language/types/javascript_file';
import { SerializedProject, Project, FileLoader } from '../language/projects/project';
import { SplootNode } from '../language/node';
import { parseHtml } from './import_html';
import { parseJs } from './import_js';
import { generateScope } from '../language/scope/scope';

let projects : {[key:string]: SerializedProject} = {}
let ballExample = {
  name: 'bouncyexample',
  title: "Bouncy ball canvas example",
  path: 'examples/bouncy.spl',
  packages: [
    {
      name: 'main',
      files: [
        {name: 'index.html', type: HTML_DOCUMENT},
        {name: 'app.js', type: JAVASCRIPT_FILE}
      ],
      entryPoints: ['index.html'],
      buildType: 'STATIC'
    }
  ],
};
projects['bouncyexample'] = ballExample;

// This is an API that we will later replace with either server calls or
// filesystem access.
export async function listProjects() {
  return [
    ['Bouncy ball canvas example', 'bouncyexample'],
  ];
}

// This is an API that we will later replace with either server calls or
// filesystem access.
export async function loadProject(projectId: string) : Promise<Project> {
  if (projectId in projects) {
    let proj = projects[projectId];
    return new Project(proj, new MockFileLoader());
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
  <script>
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
  </script>
</body>
</html>
   `;

class MockFileLoader implements FileLoader {
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
              rootNode = parseJs('console.log("foo")');
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