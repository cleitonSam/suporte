/**
 * Simple Markdown to HTML converter
 * Supports: headers, bold, italic, code blocks, inline code, lists, links, paragraphs
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Escape HTML special characters first (but not in code blocks)
  const codeBlocks: string[] = [];
  const inlineCodeBlocks: string[] = [];

  // Extract code blocks first (```code```)
  html = html.replace(/```([^`]*)```/g, (match, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return placeholder;
  });

  // Extract inline code (`code`)
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodeBlocks.length}__`;
    inlineCodeBlocks.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  // Headers (# to ######)
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists (- or * item)
  html = html.replace(/^[\*\-] (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/<\/li>\n<li>/g, '</li>\n<li>');

  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');

  // Paragraphs (double newline)
  const lines = html.split('\n');
  let result = '';
  let inList = false;
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^<(h[1-6]|hr|ul|ol|li|pre|code|blockquote)/)) {
      if (inParagraph) {
        result += '</p>\n';
        inParagraph = false;
      }
      result += line + '\n';
    } else if (line.trim() === '') {
      if (inParagraph) {
        result += '</p>\n';
        inParagraph = false;
      }
    } else if (line.match(/^__CODE_BLOCK_/)) {
      if (inParagraph) {
        result += '</p>\n';
        inParagraph = false;
      }
      result += line + '\n';
    } else {
      if (!inParagraph && line.trim() !== '') {
        result += '<p>';
        inParagraph = true;
      }
      result += line;
      if (i === lines.length - 1 && inParagraph) {
        result += '</p>\n';
        inParagraph = false;
      }
    }
  }

  if (inParagraph) {
    result += '</p>\n';
  }

  html = result;

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, block);
  });

  // Restore inline code
  inlineCodeBlocks.forEach((block, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, block);
  });

  // Add styling classes
  html = html.replace(/<h1>/g, '<h1 class="text-3xl font-bold mt-6 mb-3">');
  html = html.replace(/<h2>/g, '<h2 class="text-2xl font-bold mt-5 mb-2">');
  html = html.replace(/<h3>/g, '<h3 class="text-xl font-semibold mt-4 mb-2">');
  html = html.replace(/<p>/g, '<p class="mb-4 leading-relaxed">');
  html = html.replace(/<ul>/g, '<ul class="list-disc list-inside mb-4 space-y-1">');
  html = html.replace(/<ol>/g, '<ol class="list-decimal list-inside mb-4 space-y-1">');
  html = html.replace(/<li>/g, '<li class="ml-2">');
  html = html.replace(/<code>/g, '<code class="bg-slate-100 px-2 py-1 rounded text-sm font-mono">');
  html = html.replace(/<pre>/g, '<pre class="bg-slate-900 text-slate-50 p-4 rounded-lg mb-4 overflow-x-auto">');
  html = html.replace(/<a /g, '<a class="text-fluxo-600 hover:text-fluxo-700 hover:underline" ');
  html = html.replace(/<hr>/g, '<hr class="my-6 border-slate-200">');
  html = html.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-fluxo-300 pl-4 py-2 bg-fluxo-50 my-4">');

  return html;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
