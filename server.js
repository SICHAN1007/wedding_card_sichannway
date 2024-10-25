// node-fetch 모듈을 가져오기
const fetch = require("node-fetch");
require("dotenv").config(); // 환경 변수를 불러오기 위한 dotenv

// 환경 변수 설정 (.env 파일에서 불러옴)
const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;

// 노션 데이터베이스 가져오기 함수
async function getDatabase() {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const data = await response.json();
  return data.results;
}

// 서버 시작
getDatabase()
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
