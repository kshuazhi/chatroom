# 使用轻量级的 Node.js 运行环境
FROM node:18-alpine

# 在容器内创建工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果有)
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 复制当前目录下的所有文件到工作目录
COPY . .

# 暴露容器内部的服务端口 (你的 server.js 里用的是 3000)
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
