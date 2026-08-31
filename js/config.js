/* 部署运行时配置：本地开发保持同源，生产站点把 API 指向 ACK 服务。 */
(function () {
  const productionHosts = new Set(["rodeosocial.yodo1.cn"]);
  const configuredBase = window.ZOO_API_BASE || "";
  const defaultBase = productionHosts.has(window.location.hostname)
    ? "https://api.rodeosocial.yodo1.cn"
    : "";

  window.ZOO_API_BASE = (configuredBase || defaultBase).replace(/\/$/, "");
  window.zooApiFetch = function (requestPath, options) {
    const target = requestPath.startsWith("/api/")
      ? window.ZOO_API_BASE + requestPath
      : requestPath;
    return window.fetch(target, options);
  };
})();