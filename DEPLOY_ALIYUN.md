# 阿里云部署说明

## 架构

- `rodeosocial.yodo1.cn`：阿里云 CDN，加速北京 OSS 私有 Bucket 中的静态文件。
- `api.rodeosocial.yodo1.cn`：ACK `prod` 命名空间中的 `rodeo-social-api`，继续提供现有 Node API。
- ACK 使用单副本和 20Gi ESSD PVC 保存 `settings.json`、`taxonomy.json`、`checkins.json` 与上传图片。
- 前端在生产域名下通过 `js/config.js` 将 `/api/*` 请求指向 API 子域名；本地运行仍保持同源访问。

## CI/CD

- `.github/workflows/deploy-frontend.yml`：修改 `index.html`、`css/`、`js/` 或 `assets/` 并提交到 `main` 后，上传 OSS 并刷新 CDN。
- `.github/workflows/deploy-backend.yml`：修改服务端、镜像或 Helm 配置并提交到 `main` 后，构建不可变 SHA 镜像并滚动部署 ACK。
- GitHub Actions 通过 Alibaba Cloud OIDC AssumeRole 获取短期凭证，仓库不保存长期阿里云 AccessKey。

## 管理员口令

生产口令只保存在 ACK Secret `prod/rodeo-social-api-env` 的 `SITE_ADMIN_PW` 字段，不提交到 Git。由具备集群权限的人员按组织密钥管理流程读取或轮换：

```bash
kubectl -n prod get secret rodeo-social-api-env \
  -o jsonpath='{.data.SITE_ADMIN_PW}' | base64 -d
```

轮换后重启工作负载：

```bash
kubectl -n prod rollout restart deployment/rodeo-social-api
```

## 回滚

后端镜像按 Git SHA 打标签，可用 Helm 回滚：

```bash
helm -n prod history rodeo-social
helm -n prod rollback rodeo-social <REVISION>
```

前端发布通过 Git 提交回退后重新推送 `main`，工作流会重新上传并刷新 CDN。