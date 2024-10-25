const fetch = require("node-fetch");
require("dotenv").config();

const notionToken = process.env.NOTION_TOKEN;
const databaseId = process.env.DATABASE_ID;

// 노션 데이터베이스에서 조건에 맞는 데이터 가져오기
async function getDatabase() {
  const lagValues = ["1", "2"]; // rich text 값
  const allResults = [];

  for (const lag of lagValues) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: {
          property: "lag",
          rich_text: {
            equals: lag
          }
        },
        sorts: [
          {
            property: "DATE",
            direction: "descending"
          }
        ],
        page_size: 10
      })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    allResults.push(...data.results);
  }

  // 필요한 속성만 추출하여 반환
  return allResults.map((item) => ({
    id: item.id,
    DATE: item.properties.DATE.date?.start || "",  // DATE가 비어있을 경우 빈 문자열로 설정
    lag: item.properties.lag.rich_text?.[0]?.plain_text || "",
    Name: item.properties.Name.?.[0]?.plain_text || "",
    Title: item.properties.Title.rich_text?.[0]?.plain_text || "",
    icon: item.properties.icon.rich_text?.[0]?.plain_text || ""  // icon이 비어있을 경우 빈 문자열로 설정
  }));
}

// 함수 실행
getDatabase()
  .then((data) => console.log(data))
  .catch((error) => console.error(error));
