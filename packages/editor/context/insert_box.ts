

export class InsertBoxData {
  x: number;
  y: number;
  contents: string;

  constructor(coordindates: number []) {
    this.x = coordindates[0];
    this.y = coordindates[1];
    this.contents = '';
  }
}