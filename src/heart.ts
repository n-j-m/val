interface CartesianCoord {
  x: number;
  y: number;
}

interface BarycentricCoord {
  a: number;
  b: number;
  c: number;
}

interface Triangle<TCoord> {
  a: TCoord;
  b: TCoord;
  c: TCoord;
}

type BarycentricTriangle = Triangle<BarycentricCoord>;
type CartesianTriangle = Triangle<CartesianCoord>;

interface BezierTriangle {
  a: BarycentricCoord;
  b: BarycentricCoord;
  c: BarycentricCoord;
  d: BarycentricCoord;
  e: BarycentricCoord;
  f: BarycentricCoord;
  g: BarycentricCoord;
  h: BarycentricCoord;
  i: BarycentricCoord;
}

type Path = Array<BezierCurve>;

interface TesselatedPath {
  points: Array<BarycentricCoord>;
  color: string;
}

interface BezierCurve {
  a: BarycentricCoord;
  b: BarycentricCoord;
  c: BarycentricCoord;
  d: BarycentricCoord;
}

const topCorner: BarycentricCoord = { a: 1, b: 0, c: 0 };
const rightCorner: BarycentricCoord = { a: 0, b: 1, c: 0 };
const heartFold: BarycentricCoord = { a: 1 / 2, b: 1 / 4, c: 1 / 4 };
const heartTopTouchTriangle: BarycentricCoord = { a: 1 / 2, b: 1 / 2, c: 0 };
const leftCorner: BarycentricCoord = { a: 0, b: 0, c: 1 };
const bottomMidPoint: BarycentricCoord = { a: 0, b: 1 / 2, c: 1 / 2 };
const heartRightUpper: BezierCurve = {
  a: heartFold,
  b: interpolateBarycentric(
    heartFold,
    interpolateBarycentric(topCorner, rightCorner, 0.3),
    0.5
  ),
  c: interpolateBarycentric(heartTopTouchTriangle, topCorner, 0.15),
  d: heartTopTouchTriangle
};
const heartRightLower: BezierCurve = {
  a: heartTopTouchTriangle,
  b: interpolateBarycentric(heartTopTouchTriangle, rightCorner, 0.35),
  c: interpolateBarycentric(
    interpolateBarycentric(topCorner, leftCorner, 0.6),
    rightCorner,
    0.45
  ),
  d: bottomMidPoint
};

const heartCurves = [heartRightUpper, heartRightLower];

function vAdd(...vectors: Array<CartesianCoord>): CartesianCoord {
  const result = { x: 0, y: 0 };

  for (let i = 0, l = vectors.length; i < l; i++) {
    result.x += vectors[i].x;
    result.y += vectors[i].y;
  }

  return result;
}

function vSub(a: CartesianCoord, b: CartesianCoord): CartesianCoord {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vsMul(v: CartesianCoord, s: number): CartesianCoord {
  return { x: v.x * s, y: v.y * s };
}

function coordBarycentricToCartesian(
  triangle: CartesianTriangle,
  coord: BarycentricCoord
): CartesianCoord {
  return vAdd(
    vsMul(triangle.a, coord.a),
    vsMul(triangle.b, coord.b),
    vsMul(triangle.c, coord.c)
  );
}

function mirrorBarycentric(coord: BarycentricCoord): BarycentricCoord {
  return { a: coord.a, b: coord.c, c: coord.b };
}

function mirrorTesselatedPath(path: TesselatedPath): TesselatedPath {
  return {
    points: path.points.map(mirrorBarycentric),
    color: path.color
  };
}

function tesselateSierpinskiHeart(depth: number): Array<TesselatedPath> {
  const subHeartWarpTriangles = buildSubHeartWarpTriangles();

  let lastIterationHalf: Array<TesselatedPath> = [];
  let lastIterationFull: Array<TesselatedPath> = [];

  for (let currentDepth = 1; currentDepth <= depth; ++currentDepth) {
    const halfHeart = {
      points: tesselatePath(
        heartCurves,
        Math.max(1, Math.ceil(currentDepth * 2))
      ),
      color: currentDepth % 2 ? 'red' : 'black'
    };

    lastIterationHalf = [
      ...mapTesselatedPathsToBezierTriangle(
        makeRightHalfTesselatedPaths(lastIterationHalf),
        subHeartWarpTriangles.topHalfTriangle
      ),
      ...mapTesselatedPathsToBezierTriangle(
        lastIterationFull,
        subHeartWarpTriangles.lowerFullTriangle
      ),
      halfHeart
    ];

    lastIterationFull = [
      ...lastIterationHalf,
      ...lastIterationHalf.map(mirrorTesselatedPath)
    ];
  }

  return lastIterationFull;
}

function mapTesselatedPathsToBezierTriangle(
  tesselatedPaths: ReadonlyArray<TesselatedPath>,
  bezierTriangle: BezierTriangle
): Array<TesselatedPath> {
  return tesselatedPaths.map(tesselatedPath => ({
    points: tesselatedPath.points.map(coord =>
      evaluateBezierTriangle(bezierTriangle, coord)
    ),
    color: tesselatedPath.color
  }));
}

function evaluateBezierTriangle(
  bezierTriangle: BezierTriangle,
  coord: BarycentricCoord
): BarycentricCoord {
  const subTriangles = makeSubTriangles(bezierTriangle);

  return evaluateBarycentricTriangle(
    {
      a: evaluateBarycentricTriangle(
        {
          a: evaluateBarycentricTriangle(subTriangles[0], coord),
          b: evaluateBarycentricTriangle(subTriangles[1], coord),
          c: evaluateBarycentricTriangle(subTriangles[5], coord)
        },
        coord
      ),
      b: evaluateBarycentricTriangle(
        {
          a: evaluateBarycentricTriangle(subTriangles[1], coord),
          b: evaluateBarycentricTriangle(subTriangles[2], coord),
          c: evaluateBarycentricTriangle(subTriangles[3], coord)
        },
        coord
      ),
      c: evaluateBarycentricTriangle(
        {
          a: evaluateBarycentricTriangle(subTriangles[5], coord),
          b: evaluateBarycentricTriangle(subTriangles[3], coord),
          c: evaluateBarycentricTriangle(subTriangles[4], coord)
        },
        coord
      )
    },
    coord
  );
}

function makeRightHalfTesselatedPaths(
  paths: ReadonlyArray<TesselatedPath>
): ReadonlyArray<TesselatedPath> {
  return paths.map(path => ({
    points: path.points.map(makeRightHalf),
    color: path.color
  }));
}

function makeRightHalf(coord: BarycentricCoord): BarycentricCoord {
  return { a: coord.a, b: coord.b - coord.c, c: coord.c * 2 };
}

function makeSubTriangles(
  bezierTriangle: BezierTriangle
): Array<BarycentricTriangle> {
  const center = bAvg(
    bezierTriangle.b,
    bezierTriangle.c,
    bezierTriangle.e,
    bezierTriangle.f,
    bezierTriangle.h,
    bezierTriangle.i
  );

  return [
    { a: bezierTriangle.a, b: bezierTriangle.b, c: bezierTriangle.i },
    { a: bezierTriangle.b, b: bezierTriangle.c, c: center },
    { a: bezierTriangle.c, b: bezierTriangle.d, c: bezierTriangle.e },
    { a: center, b: bezierTriangle.e, c: bezierTriangle.f },
    { a: bezierTriangle.h, b: bezierTriangle.f, c: bezierTriangle.g },
    { a: bezierTriangle.i, b: center, c: bezierTriangle.h }
  ];
}

function bAvg(...coords: Array<BarycentricCoord>): BarycentricCoord {
  const result = { a: 0, b: 0, c: 0 };

  for (let i = 0, l = coords.length; i < l; i++) {
    result.a += coords[i].a;
    result.b += coords[i].b;
    result.c += coords[i].c;
  }

  result.a /= coords.length;
  result.b /= coords.length;
  result.c /= coords.length;

  return result;
}

function evaluateBarycentricTriangle(
  triangle: BarycentricTriangle,
  coord: BarycentricCoord
): BarycentricCoord {
  return {
    a: triangle.a.a * coord.a + triangle.b.a * coord.b + triangle.c.a * coord.c,
    b: triangle.a.b * coord.a + triangle.b.b * coord.b + triangle.c.b * coord.c,
    c: triangle.a.c * coord.a + triangle.b.c * coord.b + triangle.c.c * coord.c
  };
}

function evaluateBezierCurve(
  bezierCurve: BezierCurve,
  interpolationFactor: number
) {
  const a = interpolateBarycentric(
    bezierCurve.a,
    bezierCurve.b,
    interpolationFactor
  );
  const b = interpolateBarycentric(
    bezierCurve.b,
    bezierCurve.c,
    interpolationFactor
  );
  const c = interpolateBarycentric(
    bezierCurve.c,
    bezierCurve.d,
    interpolationFactor
  );

  const d = interpolateBarycentric(a, b, interpolationFactor);
  const e = interpolateBarycentric(b, c, interpolationFactor);

  return interpolateBarycentric(d, e, interpolationFactor);
}

function tesselatePath(
  path: Path,
  numSegments: number
): Array<BarycentricCoord> {
  const coords = [];

  for (const curve of path) {
    for (let i = 0; i <= numSegments; ++i) {
      coords.push(evaluateBezierCurve(curve, i / numSegments));
    }
  }

  return coords;
}

function buildSubHeartWarpTriangles() {
  const heartRightUpperForHalf = heartRightUpper;
  const fullA = { a: 1, b: 0, c: 0 };
  const topHalfTriangle = {
    a: fullA,
    b: interpolateBarycentric(fullA, heartRightUpperForHalf.d, 2 / 3),
    c: interpolateBarycentric(fullA, heartRightUpperForHalf.d, 1 / 3),
    d: heartRightUpperForHalf.d,
    e: heartRightUpperForHalf.c,
    f: heartRightUpperForHalf.b,
    g: heartRightUpperForHalf.a,
    h: interpolateBarycentric(fullA, heartRightUpperForHalf.a, 2 / 3),
    i: interpolateBarycentric(fullA, heartRightUpperForHalf.a, 1 / 3)
  };

  const heartRightLowerForHalf = heartRightLower;
  const fullB = { a: 0, b: 1, c: 0 };
  const lowerFullTriangle = {
    a: heartRightLowerForHalf.a,
    b: interpolateBarycentric(fullB, heartRightLowerForHalf.a, 2 / 3),
    c: interpolateBarycentric(fullB, heartRightLowerForHalf.a, 1 / 3),
    d: fullB,
    e: interpolateBarycentric(fullB, heartRightLowerForHalf.d, 1 / 3),
    f: interpolateBarycentric(fullB, heartRightLowerForHalf.d, 2 / 3),
    g: heartRightLowerForHalf.d,
    h: heartRightLowerForHalf.c,
    i: heartRightLowerForHalf.b
  };

  return { topHalfTriangle, lowerFullTriangle };
}

function interpolateBarycentric(
  coordA: BarycentricCoord,
  coordB: BarycentricCoord,
  factor: number
): BarycentricCoord {
  return {
    a: coordA.a * (1 - factor) + coordB.a * factor,
    b: coordA.b * (1 - factor) + coordB.b * factor,
    c: coordA.c * (1 - factor) + coordB.c * factor
  };
}

(function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;

  const pixelDensity = window.devicePixelRatio;
  const lineWidth = 2 * pixelDensity;
  const canvasSize = {
    x: canvas.clientWidth * pixelDensity,
    y: canvas.clientHeight * pixelDensity
  };

  canvas.setAttribute('width', `${canvasSize.x}px`);
  canvas.setAttribute('height', `${canvasSize.y}px`);

  const triangleHeightFactor = Math.sqrt(0.75);
  const triangleSize = {
    x:
      Math.min(canvasSize.x, canvasSize.y / triangleHeightFactor) -
      2 * lineWidth,
    y:
      Math.min(canvasSize.y, canvasSize.x * triangleHeightFactor) -
      2 * lineWidth
  };
  const margin = vsMul(vSub(canvasSize, triangleSize), 1 / 2);
  const baseTriangleCartesian = {
    a: vAdd(margin, { x: triangleSize.x / 2, y: 0 }),
    b: vAdd(margin, { x: triangleSize.x, y: triangleSize.y }),
    c: vAdd(margin, { x: 0, y: triangleSize.y })
  };

  const tesselated = tesselateSierpinskiHeart(7);

  ctx.lineWidth = lineWidth;

  function* draw(): IterableIterator<void> {
    for (const path of tesselated) {
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      const coord = coordBarycentricToCartesian(
        baseTriangleCartesian,
        path.points[0]
      );
      ctx.moveTo(coord.x, coord.y);
      for (const barycentricCoord of path.points.slice(1)) {
        const coord = coordBarycentricToCartesian(
          baseTriangleCartesian,
          barycentricCoord
        );
        ctx.lineTo(coord.x, coord.y);
      }
      ctx.stroke();
      yield;
    }
  }

  const drawer = draw();

  function loop() {
    const next = drawer.next();
    if (!next.done) {
      requestAnimationFrame(loop);
    }
  }

  loop();
})();
