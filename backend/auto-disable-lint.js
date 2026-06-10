const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  execSync('npx eslint "{src,apps,libs,test}/**/*.ts" -f json', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  if (error.stdout) {
    const results = JSON.parse(error.stdout);
    results.forEach(result => {
      if (result.errorCount === 0 && result.warningCount === 0) return;
      
      const filePath = result.filePath;
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
      
      const messages = result.messages.sort((a, b) => b.line - a.line);
      
      let currentLine = -1;
      let rulesToDisable = new Set();
      
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const nextMsg = messages[i + 1];
        rulesToDisable.add(msg.ruleId);
        
        if (nextMsg && nextMsg.line === msg.line) {
          continue;
        }
        
        const lineIndex = msg.line - 1;
        const disableComment = `// eslint-disable-next-line ${Array.from(rulesToDisable).join(', ')}`;
        
        const match = lines[lineIndex].match(/^\s*/);
        const indent = match ? match[0] : '';
        
        lines.splice(lineIndex, 0, indent + disableComment);
        
        rulesToDisable.clear();
      }
      
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      console.log(`Added eslint-disable comments to ${filePath}`);
    });
  }
}
