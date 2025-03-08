// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('网页二维码扩展已安装');
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 由于我们使用popup，这里不需要特别的处理
  console.log('扩展图标被点击');
}); 