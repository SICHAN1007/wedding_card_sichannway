// 필요한 라이브러리 설치
// npm install node-fetch dotenv

const fetch = require("node-fetch");
require("dotenv").config();

// 환경 변수 설정 (.env 파일에 추가)
// NOTION_TOKEN=your_notion_token
// DATABASE_ID=your_database_id

const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;

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

getDatabase()
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
