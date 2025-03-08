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
        // 尝试解码URL，以防它已经被编码
        return decodeURIComponent(url);
      } catch (e) {
        // 如果解码失败，返回原始URL
        return url;
      }
    };

    // 创建二维码
    new QRCode(qrcodeContainer, {
      text: processUrl(url),
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H // 使用最高纠错级别
    });

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