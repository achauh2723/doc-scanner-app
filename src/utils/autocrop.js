export async function autoCropWithOpenCV(imageElement) {
  return new Promise((resolve, reject) => {
    if (!window.cv) {
      reject("OpenCV not loaded yet");
      return;
    }

    const cv = window.cv;

    try {
      // 1) Read image
      let src = cv.imread(imageElement);

      // 2) Preprocess: gray + blur
      let gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

      // 3) Edge detection
      let edges = new cv.Mat();
      cv.Canny(gray, edges, 20, 80);

      // 4) Make edges thicker (helps a lot)
      let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.dilate(edges, edges, kernel);
      cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

      // 5) Find contours
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      let bestContour = null;
      let maxArea = 0;

      for (let i = 0; i < contours.size(); i++) {
        let cnt = contours.get(i);
        let area = cv.contourArea(cnt);

        if (area < 2000) continue; // ignore small noise

        let peri = cv.arcLength(cnt, true);
        let approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

        // only accept 4 point contour
        if (approx.rows === 4 && area > maxArea) {
          if (bestContour) bestContour.delete();
          bestContour = approx;
          maxArea = area;
        } else {
          approx.delete();
        }
      }

      // Fail-safe: if no good contour found
      if (!bestContour) {
  // fallback: take largest contour bounding rectangle
  let biggestCnt = null;
  let biggestArea = 0;

  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    if (area > biggestArea) {
      biggestArea = area;
      biggestCnt = cnt;
    }
  }

  if (!biggestCnt) {
    src.delete();
    gray.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
    kernel.delete();
    reject("No contour found");
    return;
  }

  let rect = cv.boundingRect(biggestCnt);

  let cropped = src.roi(rect);

  const canvas = document.createElement("canvas");
  cv.imshow(canvas, cropped);
  const outputUrl = canvas.toDataURL("image/jpeg", 0.95);

  src.delete();
  gray.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  kernel.delete();
  cropped.delete();

  resolve(outputUrl);
  return;
      }

      // Fail-safe: contour too small compared to image
      const imgArea = src.rows * src.cols;
      if (maxArea < imgArea * 0.05) {
        src.delete();
        gray.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        kernel.delete();
        bestContour.delete();
        reject("Contour too small, fallback");
        return;
      }

      // 6) Extract points
      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({
          x: bestContour.intPtr(i, 0)[0],
          y: bestContour.intPtr(i, 0)[1],
        });
      }

      // 7) Order points properly
      const sum = pts.map((p) => p.x + p.y);
      const diff = pts.map((p) => p.x - p.y);

      const tl = pts[sum.indexOf(Math.min(...sum))];
      const br = pts[sum.indexOf(Math.max(...sum))];
      const tr = pts[diff.indexOf(Math.max(...diff))];
      const bl = pts[diff.indexOf(Math.min(...diff))];

      const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
      const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const maxWidth = Math.max(widthA, widthB);

      const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
      const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
      const maxHeight = Math.max(heightA, heightB);

      // 8) Perspective transform
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y,
        tr.x, tr.y,
        br.x, br.y,
        bl.x, bl.y,
      ]);

      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        maxWidth, 0,
        maxWidth, maxHeight,
        0, maxHeight,
      ]);

      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      let warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(maxWidth, maxHeight));

      // 9) Convert result to URL
      const canvas = document.createElement("canvas");
      cv.imshow(canvas, warped);
      const outputUrl = canvas.toDataURL("image/jpeg", 0.95);

      // Cleanup
      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      kernel.delete();
      bestContour.delete();
      srcTri.delete();
      dstTri.delete();
      M.delete();
      warped.delete();

      resolve(outputUrl);
    } catch (err) {
      reject(err.toString());
    }
  });
}