// 当弹出窗口加载完成时执行
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 获取当前活动标签页信息
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 获取网页信息
    const url = tab.url;
    const title = tab.title;

    // 更新网站名称
    document.getElementById('site-name').textContent = title;

    // 处理favicon
    const faviconOverlay = document.querySelector('.favicon-overlay');
    const faviconImg = document.getElementById('favicon');
    
    // 尝试获取favicon的不同来源
    const getFaviconUrl = (url) => {
      try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
      } catch (e) {
        return null;
      }
    };

    const loadFavicon = async (faviconUrl) => {
      return new Promise((resolve) => {
        if (!faviconUrl) {
          resolve(false);
          return;
        }

        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = faviconUrl;
      });
    };

    // 按优先级尝试不同的favicon来源
    const tryFavicons = async () => {
      // 1. 首先尝试Chrome API提供的favicon
      if (tab.favIconUrl && await loadFavicon(tab.favIconUrl)) {
        return tab.favIconUrl;
      }

      // 2. 尝试网站根目录的favicon.ico
      const rootFavicon = getFaviconUrl(url);
      if (rootFavicon && await loadFavicon(rootFavicon)) {
        return rootFavicon;
      }

      // 3. 如果都失败了，返回null
      return null;
    };

    // 设置favicon
    const setFavicon = async () => {
      const faviconUrl = await tryFavicons();
      
      if (!faviconUrl) {
        // 如果没有可用的图标，直接隐藏图标容器
        faviconOverlay.style.display = 'none';
        return;
      }

      // 重置显示状态
      faviconOverlay.style.display = 'flex';
      faviconOverlay.style.opacity = '0';
      faviconImg.style.opacity = '0';
      
      // 设置图标
      faviconImg.src = faviconUrl;
      
      // 图标加载成功时显示
      faviconImg.onload = () => {
        faviconImg.style.opacity = '1';
        faviconOverlay.style.opacity = '1';
        faviconImg.classList.add('loaded');
      };
      
      // 图标加载失败时隐藏
      faviconImg.onerror = () => {
        faviconOverlay.style.display = 'none';
      };
    };

    // 异步加载favicon
    await setFavicon();

    // 创建二维码容器
    const qrcodeContainer = document.getElementById('qrcode');
    // 清除可能存在的旧二维码
    qrcodeContainer.innerHTML = '';

    // 处理长URL
    const processUrl = (url) => {
      try {
        // 1. 尝试完全解码URL
        let decodedUrl = decodeURIComponent(url);
        
        // 2. 解析URL对象
        const urlObj = new URL(decodedUrl);
        
        // 3. 获取并处理查询参数
        const searchParams = new URLSearchParams(urlObj.search);
        for (let [key, value] of searchParams.entries()) {
          // 解码参数值中的转义字符
          const decodedValue = value
            .replace(/%20/g, ' ')           // 空格
            .replace(/%0A/g, '\n')         // 换行
            .replace(/%2C/g, ',')          // 逗号
            .replace(/%3A/g, ':')          // 冒号
            .replace(/%2F/g, '/')          // 斜杠
            .replace(/%5C/g, '\\')         // 反斜杠
            .replace(/%25/g, '%')          // 百分号
            .replace(/%24/g, '$')          // 美元符号
            .replace(/%2E/g, '.')          // 点
            .replace(/%27/g, "'")          // 单引号
            .replace(/%22/g, '"')          // 双引号
            .replace(/%28/g, '(')          // 左括号
            .replace(/%29/g, ')')          // 右括号
            .replace(/%3F/g, '?')          // 问号
            .replace(/%3D/g, '=')          // 等号
            .replace(/%26/g, '&')          // &符号
            .replace(/%40/g, '@');         // @符号
          
          searchParams.set(key, decodedValue);
        }
        
        // 4. 重建URL
        urlObj.search = searchParams.toString();
        return urlObj.toString();
        
      } catch (e) {
        console.warn('URL processing failed:', e);
        // 如果处理失败，返回原始URL
        return url;
      }
    };

    // 创建二维码
    const processedUrl = processUrl(url);
    console.log('Original URL length:', url.length);
    console.log('Processed URL length:', processedUrl.length);
    
    // 根据URL长度动态调整二维码参数
    let qrSize = 200;
    let errorLevel = QRCode.CorrectLevel.H;
    
    if (processedUrl.length > 1024) {
      qrSize = 400; // 增加尺寸
      errorLevel = QRCode.CorrectLevel.M; // 降低纠错级别
    }
    
    // 尝试生成二维码，如果失败则降低要求重试
    try {
      new QRCode(qrcodeContainer, {
        text: processedUrl,
        width: qrSize,
        height: qrSize,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: errorLevel
      });
    } catch (e) {
      console.warn('First QR code generation attempt failed, trying with lower error correction:', e);
      // 清除容器
      qrcodeContainer.innerHTML = '';
      // 使用最低纠错级别重试
      new QRCode(qrcodeContainer, {
        text: processedUrl,
        width: 400,
        height: 400,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.L
      });
    }

    // 确保二维码生成成功
    const qrImage = qrcodeContainer.querySelector('img');
    if (!qrImage) {
      throw new Error('QR code generation failed');
    }

    // 调整二维码图片大小
    qrImage.style.width = '100%';
    qrImage.style.height = '100%';

    // 添加鼠标悬停效果
    const qrWrapper = document.querySelector('.qr-wrapper');
    qrWrapper.addEventListener('mouseover', () => {
      qrWrapper.style.transform = 'scale(1.02)';
    });
    qrWrapper.addEventListener('mouseout', () => {
      qrWrapper.style.transform = 'scale(1)';
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    document.getElementById('qrcode').innerHTML = `
      <div class="error-message">
        生成二维码时出错，请尝试刷新页面或联系开发者<br>
        <small style="color: #666; margin-top: 8px; display: block;">
          错误信息：${error.message}
        </small>
      </div>
    `;
  }
}); 