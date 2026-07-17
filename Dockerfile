# 钢铁突击 / STEEL ASSAULT 容器镜像
# 纯静态网页游戏，使用 nginx:alpine 托管 code/ 目录

FROM nginx:alpine

LABEL maintainer="robertsong2000"
LABEL description="STEEL ASSAULT - contra-style web run-and-gun game"

# 拷贝游戏静态资源到 nginx 默认站点目录
COPY code/ /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# nginx:alpine 默认前台运行
CMD ["nginx", "-g", "daemon off;"]
