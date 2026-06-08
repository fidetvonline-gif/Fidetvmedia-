const fs = require('fs');

const filesToFix = [
  'src/pages/Community.tsx',
  'src/pages/Partner.tsx',
  'src/pages/Admin.tsx',
  'src/pages/CommunityDetail.tsx',
  'src/components/VoiceRoom.tsx'
];

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if we need to add the import
    if (content.includes('localStorage.') && !content.includes('safeLocalStorage')) {
      const importStatement = "import { safeLocalStorage } from '@/lib/storage';\n";
      // insert after the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + importStatement + content.slice(nextLineIndex + 1);
      } else {
        content = importStatement + content;
      }
    }
    
    // Check if we need to add safeLocalStorage to existing import from @/lib/storage
    if (content.includes('localStorage.') && content.includes('@/lib/storage') && !content.includes('safeLocalStorage')) {
      content = content.replace(/import\s*{([^}]+)}\s*from\s*['"]@\/lib\/storage['"]/, (match, group1) => {
        return `import { ${group1.trim()}, safeLocalStorage } from '@/lib/storage'`;
      });
    }

    content = content.replace(/localStorage\./g, 'safeLocalStorage.');

    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
});
