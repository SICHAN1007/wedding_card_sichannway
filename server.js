const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000; // Glitch 환경에서 PORT 사용

app.use(cors({
    origin: "https://www.tokkitokki.kr", // specify your frontend domain
  methods: ["GET", "POST", "DELETE", "PATCH"], // add PATCH here
  allowedHeaders: ["Content-Type", "Authorization"]
})); // CORS 설정
app.use(express.static('public')); // 정적 파일 제공을 위한 설정
app.use(express.json()); // JSON 본문 파싱을 위한 미들웨어

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

  return allResults.map((item) => ({
    id: item.id,
    DATE: item.properties.DATE.date?.start || "",
    lag: item.properties.lag.rich_text?.[0]?.plain_text || "",
    Name: item.properties.Name.rich_text?.[0]?.plain_text || "",
    Title: item.properties.Title.title?.[0]?.plain_text || "",
    icon: item.properties.icon.rich_text?.[0]?.plain_text || ""
  }));
}

// 노션 데이터베이스에 데이터 추가하기
async function addToDatabase(name, title, lag, icon, pw, date) {
  const response = await fetch(`https://api.notion.com/v1/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          rich_text: [{ text: { content: name } }],
        },
        Title: {
          title: [{ text: { content: title } }],
        },
        lag: {
          rich_text: [{ text: { content: lag } }],
        },
        icon: {
          rich_text: [{ text: { content: icon } }],
        },
        PW: {
          rich_text: [{ text: { content: pw } }],
        },
        DATE: {
          date: { start: date } // 현재 날짜로 설정
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  return await response.json();
}

// 특정 페이지의 PW 가져오기
async function getPagePw(id) {

  
  const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
    }
  });

  if (!response.ok) {
    throw new Error(`Error fetching page data: ${response.status}`);
  }

  const pageData = await response.json();
  return pageData.properties.PW.rich_text[0]?.plain_text || "";
}

// 노션 데이터베이스에서 데이터 삭제(아카이브)하기
async function deleteFromDatabase(id, pw) {
  const storedPw = await getPagePw(id);

  // pw 값이 일치하는 경우에만 삭제
  if (storedPw === pw) {
    const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        archived: true
      })
    });

    if (!response.ok) {
      throw new Error(`Error archiving data: ${response.status}`);
    }

    return await response.json(); // 성공 시 삭제된 데이터의 정보를 반환
  } else {
    throw new Error("Provided password does not match.");
  }
}

// 데이터베이스에서 데이터 수정하기
async function updateDatabase(id,  name, title, icon, date) {
  const response = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        Name: {
          rich_text: [{ text: { content: name } }],
        },
        Title: {
          title: [{ text: { content: title } }],
        },
        icon: {
          rich_text: [{ text: { content: icon } }],
        },
        DATE: {
          date: { start: date } // 현재 날짜로 설정
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Error updating data: ${response.status}`);
  }

  return await response.json();
}

// 데이터 수정 API 엔드포인트 추가
app.patch("/api/data", async (req, res) => {
  const { id, name, title, icon, pw ,date} = req.body;
  const storedPw = await getPagePw(id);
  
  if (storedPw === pw) {
  // 업데이트할 속성 설정

    try {
      const updatedData = await updateDatabase(id, name, title, icon, date);
      const data = await getDatabase();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
    else {
    throw new Error("Provided password does not match.");
  }
});



// API 엔드포인트 추가
app.get("/api/data", async (req, res) => {
  try {
    const data = await getDatabase();
    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// 새로운 데이터 추가 API 엔드포인트
app.post("/api/data", async (req, res) => {
  const { name, title, lag, icon, pw, date } = req.body;

  try {
    const newData = await addToDatabase( name, title, lag, icon, pw, date );
    const data = await getDatabase();
    res.status(201).json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


// 데이터 삭제 API 엔드포인트 추가 
app.delete("/api/data/", async (req, res) => {
  const { id , pw ,name, title, icon ,date ,Num} = req.body;

      try {
      const updatedData = await updateDatabase(id, name, title, icon, date);
      const data = await getDatabase();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  
});

// 서버 시작
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
