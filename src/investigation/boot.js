
window.addEventListener('error', function () {
  if (document.getElementById('boot-warn')) return;
  var d = document.createElement('div');
  d.id = 'boot-warn';
  d.textContent = '浏览器版本过低，请用最新版 Chrome 或 Edge 打开本页。';
  document.body.appendChild(d);
});
