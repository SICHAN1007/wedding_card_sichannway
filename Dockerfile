# Node.js 18 LTS 이미지 사용
FROM node:18

# 앱 디렉토리 생성 및 이동
WORKDIR /app

# 의존성 설치를 위해 package.json, package-lock.json 복사
COPY package*.json ./
RUN npm install

# 나머지 소스 복사
COPY . .

# 컨테이너가 수신할 포트 지정
EXPOSE 3000

# 앱 실행
CMD ["node", "server.js"] 