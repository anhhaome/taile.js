const path = require('path');
const fs = require('fs');

const INJECTED_CODE = fs.readFileSync(path.join(__dirname, "injected.html"), "utf8");

const inject = contents => {
  const injectCandidates = [ new RegExp("</body>", "i"), new RegExp("</svg>"), new RegExp("</head>", "i")];

  let injectTag = null;
  for (let injectCandidate of injectCandidates){
    let match = injectCandidate.exec(contents);
    if (match) {
      injectTag = match[0];
      break;
    }
  }

  if (!injectTag){
    console.warn("[Inject] Failed to inject refresh script!".yellow,
      "Couldn't find any of the tags ", injectCandidates);
    return contents;
  }
  
  return contents.replace(new RegExp(injectTag, "i"), INJECTED_CODE + injectTag);
}
module.exports = inject;