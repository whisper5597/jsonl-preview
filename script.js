const dropZone = document.getElementById('drop-zone');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const lineIndicator = document.getElementById('line-indicator');
const jsonTree = document.getElementById('json-tree');
const markdownPreview = document.getElementById('markdown-preview');
const toCodeBlockBtn = document.getElementById('to-code-block-btn');

let lines = [];
let currentIndex = -1;
let currentRawContent = ''; // 保存当前渲染的原始内容

// 创建一个可复用的覆盖层
const dropOverlay = document.createElement('div');
dropOverlay.classList.add('drop-overlay');
dropOverlay.textContent = '拖拽文件到此处';

function showDropOverlay() {
  if (!document.body.contains(dropOverlay)) {
    document.body.appendChild(dropOverlay);
  }
}

function hideDropOverlay() {
  if (document.body.contains(dropOverlay)) {
    document.body.removeChild(dropOverlay);
  }
}

window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  showDropOverlay();
});

window.addEventListener('dragover', (e) => {
  e.preventDefault(); // 必须阻止默认行为才能触发 drop
});

window.addEventListener('dragleave', (e) => {
  // 当鼠标离开窗口时，隐藏覆盖层
  if (e.relatedTarget === null || !e.relatedTarget.closest('body')) {
    hideDropOverlay();
  }
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  hideDropOverlay();

  const file = e.dataTransfer.files[0];
  if (file) {
    const initialTip = document.getElementById('initial-tip');
    const mainContent = document.querySelector('.main-content');
    if (initialTip && mainContent) {
      const tipHeight = initialTip.offsetHeight;
      initialTip.style.display = 'none';
      mainContent.style.minHeight = `calc(100vh - 40px + ${tipHeight}px)`;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      lines = event.target.result.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        currentIndex = 0;
        renderLine();
        updateControls();
      } else {
        alert('文件为空或不是有效的JSONL文件。');
      }
    };
    reader.readAsText(file);
  }
});

prevBtn.addEventListener('click', () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderLine();
    updateControls();
  }
});

nextBtn.addEventListener('click', () => {
  if (currentIndex < lines.length - 1) {
    currentIndex++;
    renderLine();
    updateControls();
  }
});

toCodeBlockBtn.addEventListener('click', () => {
  const selection = window.getSelection();
  let contentToWrap = currentRawContent;

  // 检查是否有选中的文本，并且选区是否在markdown-preview区域内
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    if (markdownPreview.contains(range.commonAncestorContainer)) {
      const selectedText = selection.toString();
      if (selectedText.trim().length > 0) {
        contentToWrap = selectedText;
      }
    }
  }

  if (contentToWrap) {
    const codeBlock = '```\n' + contentToWrap + '\n```';
    renderMarkdown(codeBlock);
  }
});

function updateControls() {
  prevBtn.disabled = currentIndex <= 0;
  nextBtn.disabled = currentIndex >= lines.length - 1;
  lineIndicator.textContent = `第 ${currentIndex + 1} 行 / 共 ${lines.length} 行`;
}

function renderLine() {
  jsonTree.innerHTML = '';
  markdownPreview.innerHTML = '';
  try {
    const json = JSON.parse(lines[currentIndex]);
    const tree = createTree(json);
    jsonTree.appendChild(tree);
  } catch (e) {
    jsonTree.innerHTML = `<p style="color: red">解析JSON时出错: ${e.message}</p>`;
  }
}

function createTree(data) {
  const container = document.createElement('div');
  for (const key in data) {
    const node = document.createElement('div');
    node.classList.add('tree-node');

    const keySpan = document.createElement('span');
    keySpan.classList.add('tree-key');
    keySpan.textContent = key + ':';

    node.appendChild(keySpan);

    if (typeof data[key] === 'object' && data[key] !== null) {
      const previewSpan = document.createElement('span');
      previewSpan.classList.add('tree-value', 'preview');
      let previewContent = JSON.stringify(data[key]);
      previewSpan.textContent = previewContent.substring(0, 50) + (previewContent.length > 50 ? '...' : '');
      node.appendChild(previewSpan);

      const childTree = createTree(data[key]);
      childTree.style.display = 'none';
      node.appendChild(childTree);
      keySpan.addEventListener('click', () => {
        node.classList.toggle('collapsed');
        const isCollapsed = childTree.style.display === 'none';
        childTree.style.display = isCollapsed ? 'block' : 'none';
        previewSpan.style.display = isCollapsed ? 'none' : 'inline';
      });
    } else {
      const valueSpan = document.createElement('span');
      valueSpan.classList.add('tree-value');
      valueSpan.textContent = String(data[key]).substring(0, 100) + (String(data[key]).length > 100 ? '...' : '');
      node.appendChild(valueSpan);

      valueSpan.addEventListener('click', () => {
        currentRawContent = String(data[key]); // 保存原始内容
        renderMarkdown(currentRawContent);
      });
    }
    container.appendChild(node);
  }
  return container;
}

function renderMarkdown(content) {
  // 1. 对markdown的转义字符进行基本处理
  let processedContent = content.replace(/\\n/g, '\n');

  // 2. 使用 marked.js 解析 markdown
  markdownPreview.innerHTML = marked.parse(processedContent);

  // 3. 高亮所有代码块，并增加复制按钮和错误处理
  try {
    markdownPreview.querySelectorAll('pre').forEach((preElement) => {
      const codeBlock = preElement.querySelector('code');
      if (!codeBlock) return;

      // 创建一个容器来包裹代码块和按钮
      const container = document.createElement('div');
      container.style.position = 'relative';

      // 创建复制按钮
      const copyButton = document.createElement('button');
      copyButton.textContent = '复制';
      copyButton.classList.add('copy-btn');

      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.innerText).then(() => {
          copyButton.textContent = '已复制!';
          setTimeout(() => {
            copyButton.textContent = '复制';
          }, 2000);
        }).catch(err => {
          console.error('无法复制文本: ', err);
          copyButton.textContent = '失败';
        });
      });

      // 将按钮和代码块添加到容器中
      container.appendChild(copyButton);
      preElement.parentNode.insertBefore(container, preElement);
      container.appendChild(preElement);

      // 高亮代码
      hljs.highlightElement(codeBlock);
    });
  } catch (e) {
    console.error("高亮代码或添加复制按钮时出错:", e);
  }
}

// 初始化marked以正确处理换行
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
  }
});