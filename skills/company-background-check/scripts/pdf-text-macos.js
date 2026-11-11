// Prints a PDF's text page by page, recognising scanned pages with macOS Vision. Needs nothing installed.
// Usage: osascript -l JavaScript pdf-text-macos.js /absolute/path/file.pdf [first page] [last page]
ObjC.import('PDFKit');
ObjC.import('Vision');
ObjC.import('AppKit');

const RENDER_SCALE = 2.5; // scanned filings are low resolution, and small figures misread below about 2x

function recognise(page) {
  const box = page.boundsForBox($.kPDFDisplayBoxMediaBox);
  const image = page.thumbnailOfSizeForBox($.NSMakeSize(box.size.width * RENDER_SCALE, box.size.height * RENDER_SCALE), $.kPDFDisplayBoxMediaBox);
  const cgImage = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation).CGImage;
  const request = $.VNRecognizeTextRequest.alloc.init;
  request.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
  $.VNImageRequestHandler.alloc.initWithCGImageOptions(cgImage, $.NSDictionary.dictionary).performRequestsError($([request]), null);
  const lines = [];
  for (let i = 0; i < request.results.count; i++) lines.push(request.results.objectAtIndex(i).topCandidates(1).objectAtIndex(0).string.js);
  return lines.join('\n');
}

function run(argv) {
  const [path, first = '1', last] = argv;
  if (!path) return 'Usage: osascript -l JavaScript pdf-text-macos.js /absolute/path/file.pdf [first page] [last page]';
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(path));
  if (!doc || doc.isNil()) return `Cannot open ${path}`;
  const out = [];
  for (let n = Number(first); n <= Math.min(Number(last || doc.pageCount), doc.pageCount); n++) {
    const page = doc.pageAtIndex(n - 1);
    const text = page.string.js;
    out.push(`--- page ${n}\n${text && text.trim() ? text : recognise(page)}`);
  }
  return out.join('\n');
}
